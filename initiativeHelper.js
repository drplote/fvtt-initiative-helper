import { registerSettings } from "./modules/settings.js";

export let i18n = key => {
    return game.i18n.localize(key);
};
export let setting = key => {
    return game.settings.get("initiative-helper", key);
};

export class InitiativeHelper extends Application {
    tokenname = '';
    tokenstat = '';
    tokentemp = '';
    tokentooltip = '';
    color = "";
    valuePct = null;
    tempPct = null;

    static get defaultOptions() {
        let pos = game.user.getFlag("initiative-helper", "initiativehelperPos");
        return mergeObject(super.defaultOptions, {
            id: "initiative-helper",
            template: "modules/initiative-helper/templates/initiative-helper.html",
            classes: ["initiative-helper"],
            popOut: true,
            resizable: false,
            top: pos?.top || 60,
            left: pos?.left || (($('#board').width / 2) - 150),
            width: 300,
        });
    }

    async _render(force, options) {
        let that = this;
        return super._render(force, options).then((html) => {
            $('h4', this.element)
                .addClass('flexrow')
                .append($('<div>').addClass('character-name').html(this.tokenname))
                .append($('<div>').addClass('token-stats flexrow').attr('title', this.tokentooltip).html((this.tokentemp ? `<div class="stat temp">${this.tokentemp}</div>` : '') + (this.tokenstat ? `<div class="stat" style="background-color:${this.color}">${this.tokenstat}</div>` : '')));
            delete ui.windows[that.appId];
        });
    }

    async close(options) {
        if (options?.properClose) {
            super.close(options);
            game.InitiativeHelper = null;
        }
    }

    getData() {
        return {
            tokenname: this.tokenname
        };
    }

    async changeInit(newInit) {
        if (canvas.tokens.controlled.length == 0){
            ui.notifications.warn(i18n("INITIATIVEHELPER.warning-no-selected-token"));
            return;
        }

        this.validateInitiative(newInit);
        await Promise.all(canvas.tokens.controlled.map(t => this.updateInitiative(t, newInit)));
        this.refreshSelected();
    }

    getCombat(sceneId){
        let combat = game.combats.find(c => c.scene?.id === sceneId && c.isActive && c.started);
        return combat;
    }

    getCombatant(token){
        let combat = this.getCombat(token.scene.id);
        return combat?.getCombatantByToken(token.id);
    }

    getLatestCombatInit(sceneId){
        let combat = this.getCombat(sceneId);
        // TODO: not all initiative systems using ascending init. Take that into account
        let maxInit = Math.max(...combat.turns.map(combatant => combatant.initiative));
        return maxInit;
    }

    validateInitiative(initiative){
        let sceneId = canvas.tokens.controlled.find(t => t.inCombat)?.scene?.id;
        let combat = this.getCombat(sceneId);

        if (!combat){
            ui.notifications.error(i18n("INITIATIVEHELPER.error-invalid-combat"));
        } 
        else if (combat.turn){
            let currentCombatInit = combat.turns[combat.turn]?.initiative;

            // TODO: not all initiative systems using ascending init. Take that into account
            if (initiative < currentCombatInit){
                ui.notifications.warn(i18n("INITIATIVEHELPER.warning-too-early-init"));
            }
            else if (initiative === currentCombatInit){
                ui.notifications.warn(i18n("INITIATIVEHELPER.warning-current-round-init"));
            }
        }
    }

    
    async updateInitiative(token, newInit){
        let combatant = this.getCombatant(token);
        if (!combatant){
            ui.notifications.error(i18n("INITIATIVEHELPER.error-token-not-in-combat"));
            return;
        }
        else if (!game.user.isGM && !token.owner){
            ui.notifications.error(i18n("INITIATIVEHELPER.error-token-permission"));
        }
        else{
            let combat = combatant.combat;
            if (combat.combatant?.id === combatant.id){
                // Trying to change the initiative of the current combatant requires special handling.    
                // TODO: more special handling is needed
                let lastTurnIndex = combat.turns.length -1;
                if (combat.turn < lastTurnIndex){
                    // If there are turns to come after the combatant, we need to move to next turn before changing initiative.
                    combat.nextTurn();
                }
            }
            await combatant.update({initiative: newInit});
        }
    }

    async delayTokenInit(token, longDelayInit){
        let oldInit = longDelayInit ?? this.getTokenInit(token);
        if (oldInit !== null){
            let newInit = oldInit + 1;  // TODO: not all initiative systems using ascending init. Take that into account
            await this.updateInitiative(token, newInit);
        }
    }

    getTokenInit(token){
        let combatant = this.getCombatant(token);
        if(!combatant){
            return null; 
        }

        return combatant?.initiative;
    }

    refreshSelected() {
        this.valuePct = null;
        this.tokenstat = "";
        this.tokentooltip = "";
        if (canvas.tokens.controlled.length == 0)
            this.tokenname = "";
        else if (canvas.tokens.controlled.length == 1) {
            this.tokenname = "";
            let controlledToken = canvas.tokens.controlled[0];
            if (game.user.isGM || controlledToken.owner)
            {
                if (controlledToken.actor) {
                    let currentInit = this.getTokenInit(controlledToken);
                    if (currentInit === null){
                        currentInit = "Unset";
                    }
                    this.tokenname = controlledToken.name;
                    this.tokenstat = currentInit;
                    this.tokentooltip = `Initiative: ${currentInit}`;
                }
            }
        }
        else {
            this.tokenname = `${i18n("INITIATIVEHELPER.Multiple")} <span class="count">${canvas.tokens.controlled.length}</span>`;
        }

        this.changeToken();
    }

    changeToken() {
        $('.character-name', this.element).html(this.tokenname);
        $('.token-stats', this.element).attr('title', this.tokentooltip).html((this.tokenstat ? `<div class="stat" style="background-color:${this.color}">${this.tokenstat}</div>` : ''));

        if (!game.user.isGM){
            $('#initiativehelper-btn-override-group').hide();
            $('#initiativehelper-btn-set-group').hide();
        }    
        $('#initiativehelper-btn-additional-init').hide(); // Currently not implemented
    }

    get getValue() {
        let value = $('#initiativehelper-init', this.element).val();
        let result = { value: value };
        result.value = parseInt(result.value);
        if (isNaN(result.value))
            result.value = null;
        return result;
    }

    clearInput() {
        if (setting("clear-after-enter"))
            $('#initiativehelper-init', this.element).val('');
    }

    async delayInit(isLongDelay){
        if (canvas.tokens.controlled.length == 0){
            ui.notifications.warn(i18n("INITIATIVEHELPER.warning-no-selected-token"));
            return;
        }
        else {
            let longDelayInit = isLongDelay ? this.getLatestCombatInit(canvas.tokens.controlled[0].scene.id) : null;
            await Promise.all(canvas.tokens.controlled
                .filter(t => t.inCombat)
                .map(t => this.delayTokenInit(t, longDelayInit))
            );
        }
    }

    async setGroupInit(shouldOverride){
        if (canvas.tokens.controlled.length == 0){
            ui.notifications.warn(i18n("INITIATIVEHELPER.warning-no-selected-token"));
            return;
        }
        else{
            let newInit = this.getValue?.value;
            
            let uniqueBaseActorIds = canvas.tokens.controlled
                .filter(t => t.inCombat)
                .map(t => t.actor.id)
                .filter( (value, index, self) =>{
                    return self.indexOf(value) === index;
                });    

            if (uniqueBaseActorIds.length > 0){
                this.validateInitiative(newInit);
            }

            await Promise.all(
                canvas.tokens.ownedTokens
                    .filter(t => t.inCombat)
                    .filter(t => uniqueBaseActorIds.some(id => t.actor.id === id))
                    .filter(t => (shouldOverride || canvas.tokens.controlled.some(t2 => t2.id == t.id) || this.getTokenInit(t) === null))
                    .map(t => this.updateInitiative(t, newInit))
            );
        }
    }

    activateListeners(html) {
        super.activateListeners(html);

        let that = this;
        
        html.find('#initiativehelper-btn-set-group').click(async ev => {
            ev.preventDefault();
            await that.setGroupInit(false);
            that.refreshSelected();
            this.clearInput();
        });

        html.find('#initiativehelper-btn-override-group').click(async ev => {
            ev.preventDefault();
            await that.setGroupInit(true);
            that.refreshSelected();
            this.clearInput();
        });

        html.find('#initiativehelper-btn-short-delay').click(async ev => {
            ev.preventDefault();
            await that.delayInit(false);
            that.refreshSelected();
            this.clearInput();
        });

        html.find('#initiativehelper-btn-long-delay').click(async ev => {
            ev.preventDefault();
            await that.delayInit(true);
            that.refreshSelected();
            this.clearInput();
        });

        html.find('#initiativehelper-init').focus(ev => {
            ev.preventDefault();
            let elem = ev.target;
            if (elem.setSelectionRange) {
                elem.focus();
                elem.setSelectionRange(0, $(elem).val().length);
            } else if (elem.createTextRange) {
                var range = elem.createTextRange();
                range.collapse(true);
                range.moveEnd('character', $(elem).val().length);
                range.moveStart('character', 0);
                range.select();
            }
        }).keypress(ev => {
            if (ev.which == 13) {
                let value = this.getValue;
                if (value.value != '' && value.value != 0) {
                    ev.preventDefault();
                    this.changeInit(value.value); 
                    this.clearInput();
                }
            }
        });
    }
}

Hooks.on('init', () => {
    registerSettings();
});

Hooks.on('ready', () => {
    if ((setting("show-option") == 'on' || (setting("show-option") == 'toggle' && setting("show-dialog"))) && (setting("load-option") == 'everyone' || (setting("load-option") == 'gm' == game.user.isGM)))
        game.InitiativeHelper = new InitiativeHelper().render(true);

    let oldDragMouseUp = Draggable.prototype._onDragMouseUp;
    Draggable.prototype._onDragMouseUp = function (event) {
        Hooks.call(`dragEnd${this.app.constructor.name}`, this.app);
        return oldDragMouseUp.call(this, event);
    }
});

Hooks.on('controlToken', () => {
    game.InitiativeHelper?.refreshSelected();
});

Hooks.on('updateCombat', (combat, data) => {
    game.InitiativeHelper?.refreshSelected();

});

Hooks.on('dragEndInitiativeHelper', (app) => {
    game.user.setFlag("initiative-helper", "initiativehelperPos", { left: app.position.left, top: app.position.top });
})

Hooks.on("getSceneControlButtons", (controls) => {
    if (setting("show-option") == 'toggle' && (setting("load-option") == 'everyone' || (setting("load-option") == 'gm' == game.user.isGM))) {
        let tokenControls = controls.find(control => control.name === "token")
        tokenControls.tools.push({
            name: "inithelper-toggledialog",
            title: "INITIATIVEHELPER.toggledialog",
            icon: "fas fa-dice-d20",
            toggle: true,
            active: setting('show-dialog'),
            onClick: toggled => {
                game.settings.set('initiative-helper', 'show-dialog', toggled);
                if (toggled) {
                    if (!game.InitiativeHelper)
                        game.InitiativeHelper = new InitiativeHelper().render(true);
                } else {
                    if (game.InitiativeHelper)
                        game.InitiativeHelper.close({ properClose: true });
                }
            }
        });
    }
});
