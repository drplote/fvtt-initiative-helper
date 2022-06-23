import { registerSettings } from "./modules/settings.js";

export let debug = (...args) => {
    if (debugEnabled > 1) console.log("DEBUG: initiativehelper | ", ...args);
};
export let log = (...args) => console.log("initiativehelper | ", ...args);
export let warn = (...args) => {
    if (debugEnabled > 0) console.warn("initiativehelper | ", ...args);
};
export let error = (...args) => console.error("initiativehelper | ", ...args);
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

    getResourceValue(resource) {
        return (resource instanceof Object ? resource.value : resource);
    }

    getResourceMax(resource) {
        return (resource instanceof Object ? resource.max : null);
    }

    getResValue(resource, property = "value", defvalue = null) {
        return (resource instanceof Object ? resource[property] : defvalue) ?? 0;
    }

    async changeInit(value) {
        for (let t of canvas.tokens.controlled) {
            const a = t.actor;

            if (!a)
                continue;

            await this.updateInitiative(t, value);
        };

        this.refreshSelected();
    }

    async applyDamage(token, amount, multiplier = 1) {
        /*let actor = token.actor;
        let { value, target } = amount;
        let updates = {};
        let resourcename = (setting("resourcename") || game.system.data.primaryTokenAttribute || 'attributes.hp');
        let resource = getProperty(actor.data, "data." + resourcename); //InitiativeHelper.getResource(actor);
        if (resource instanceof Object) {
            value = Math.floor(parseInt(value) * multiplier);

            // Deduct damage from temp HP first
            if (resource.hasOwnProperty("tempmax") && target == "max") {
                const dm = (resource.tempmax ?? 0) - value;
                updates["data." + resourcename + ".tempmax"] = dm;
            } else {
                let dt = 0;
                let tmpMax = 0;
                if (resource.hasOwnProperty("temp")) {
                    const tmp = parseInt(resource.temp) || 0;
                    dt = (value > 0 || target == 'temp') && target != 'regular' && target != 'max' ? Math.min(tmp, value) : 0;
                    // Remaining goes to health

                    tmpMax = parseInt(resource.tempmax) || 0;

                    updates["data." + resourcename + ".temp"] = tmp - dt;
                }

                // Update the Actor
                if (target != 'temp' && target != 'max' && dt >= 0) {
                    let change = (value - dt);
                    const dh = Math.clamped(resource.value - change, (game.system.id == 'D35E' || game.system.id == 'pf1' ? -2000 : 0), resource.max + tmpMax);
                    updates["data." + resourcename + ".value"] = dh;

                    token.hud.createScrollingText((-change).signedString(), {
                        anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
                        fontSize: 32,
                        fill: (change > 0 ? 16711680 : 65280),
                        stroke: 0x000000,
                        strokeThickness: 4,
                        jitter: 0.25
                    });
                }
            }
        } else {
            let val = Math.floor(parseInt(resource));
            updates["data." + resourcename] = (val - value);
        }

        return await actor.update(updates);
        */
    }

    sendMessage(dh, dt) {
        const speaker = ChatMessage.getSpeaker({ user: game.user.id });

        let messageData = {
            user: game.user.id,
            speaker: speaker,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
            content: `${actor.name} has changed HP by: ${dt + dh}` + (dt != 0 ? `<small><br/>Temporary: ${dt}<br/>HP: ${dh}</small>` : '')
        };

        ChatMessage.create(messageData);
    }

    getCombat(token){
        if (!token.inCombat){
            return null;
        }

        let available_combats = game.combats.filter(combat => combat.scene.id == token.scene.id);
        if (available_combats.length == 0) {
            return null;
        }

        return available_combats[0];
    }

    getCombatant(token){
        let combat = this.getCombat(token);
        if (combat){
            let matchingCombatants = combat.combatants.filter(combatant => combatant.token.id === token.id);
            if (matchingCombatants.length != 0){
                return matchingCombatants[0];
            }
        }
        return null;
    }

    async updateInitiative(token, newInit){
        let combatant = this.getCombatant(token);
        if (combatant){
            await combatant.update({initiative: newInit});
        }
    }

    getCurrentInit(token){
        let combatant = this.getCombatant(token);
        if(!combatant){
            return null; 
        }

        return combatant.initiative;
    }

    refreshSelected() {
        this.valuePct = null;
        this.tokenstat = "";
        this.tokentooltip = "";
        if (canvas.tokens.controlled.length == 0)
            this.tokenname = "";
        else if (canvas.tokens.controlled.length == 1) {
            let controlledToken = canvas.tokens.controlled[0];
            if (!controlledToken.actor)
                this.tokenname = "";
            else {
                let currentInit = this.getCurrentInit(controlledToken);
                this.tokenname = controlledToken.data.name;
                this.tokenstat = currentInit;
                this.tokentooltip = `Initiative: ${currentInit}`;
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

        let actor = (canvas.tokens.controlled.length == 1 ? canvas.tokens.controlled[0].actor : null);
        
        $('.resource', this.element).toggle(canvas.tokens.controlled.length == 1 && this.valuePct != undefined);
        if (this.valuePct != undefined) {
            $('.resource .bar', this.element).css({ width: (this.valuePct * 100) + '%', backgroundColor: this.color });
            $('.resource .temp-bar', this.element).toggle(this.tempPct > 0).css({ width: (this.tempPct * 100) + '%' });
        }
    }

    get getValue() {
        let value = $('#initiativehelper-init', this.element).val();
        let result = { value: value };
        result.value = parseInt(result.value);
        if (isNaN(result.value))
            result.value = 99;
        return result;
    }

    clearInput() {
        if (setting("clear-after-enter"))
            $('#initiativehelper-init', this.element).val('');
    }

    getChangeValue(perc) {
        let change = "";
        if (canvas.tokens.controlled.length == 1) {
            const actor = canvas.tokens.controlled[0].actor;

            let resourcename = (setting("resourcename") || game.system.data.primaryTokenAttribute || 'attributes.hp');
            let resource = getProperty(actor.data, "data." + resourcename);

            if (resource.hasOwnProperty("max")) {
                let max = this.getResValue(resource, "max");
                let tempmax = this.getResValue(resource, "tempmax");
                const effectiveMax = Math.max(0, max + tempmax);
                let val = Math.floor(parseInt(effectiveMax * perc));
                change = val - Math.floor(parseInt(resource.value));
            }
        }

        return change;
    }



    async setGroupInit(){
        if (canvas.tokens.controlled.length == 0){
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

            await Promise.all(
                canvas.tokens.ownedTokens
                    .filter(t => t.inCombat && uniqueBaseActorIds.some(id => t.actor.id === id))
                    .map(t => this.updateInitiative(t, newInit))
            );

        }
    }

    activateListeners(html) {
        super.activateListeners(html);

        let that = this;
        
        /*html.find('#initiativehelper-btn-hurt').click(ev => {
            ev.preventDefault();
            log('set character to hurt');
            let value = this.getValue;
            if (value.value != '') {
                value.value = Math.abs(value.value);
                this.changeHP(value);
            }
            this.clearInput();
        });
        html.find('#initiativehelper-btn-heal').click(ev => {
            ev.preventDefault();
            log('set character to heal');
            let value = this.getValue;
            if (value.value != '') {
                value.value = -Math.abs(value.value);
                this.changeHP(value, false);
            }
            this.clearInput();
        });*/

        html.find('#initiativehelper-btn-group').click(async ev => {
            ev.preventDefault();
            await that.setGroupInit();
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

        
        html.find('.resource').mousemove(ev => {
            if (!setting("allow-bar-click"))
                return;
            let perc = ev.offsetX / $(ev.currentTarget).width();
            let change = this.getChangeValue(perc);

            $('.bar-change', html).html(change);
        }).click(ev => {
            if (!setting("allow-bar-click"))
                return;
            let perc = ev.offsetX / $(ev.currentTarget).width();
            let change = this.getChangeValue(perc);

            this.changeInit({ value: -change, target: 'regular' });
            $('.bar-change', html).html('');
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

Hooks.on('updateActor', (actor, data) => {
    if (canvas.tokens.controlled.length == 1
        && canvas.tokens.controlled[0]?.actor.id == actor.id
        && (getProperty(data, "data.attributes.death") != undefined || getProperty(data, "data." + setting("resourcename")))) {
        game.InitiativeHelper?.refreshSelected();
    }
});

Hooks.on('dragEndInitiativeHelper', (app) => {
    game.user.setFlag("initiative-helper", "initiativehelperPos", { left: app.position.left, top: app.position.top });
})

Hooks.on("getSceneControlButtons", (controls) => {
    if (setting("show-option") == 'toggle' && (setting("load-option") == 'everyone' || (setting("load-option") == 'gm' == game.user.isGM))) {
        let tokenControls = controls.find(control => control.name === "token")
        tokenControls.tools.push({
            name: "toggledialog",
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
