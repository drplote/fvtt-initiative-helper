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
        let pos = game.user.getFlag("initiative-helper", "initiativeHelperPos");
        return mergeObject(super.defaultOptions, {
            id: "initiative-helper",
            template: "modules/initiative-helper/templates/initiativeHelper.html",
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
        return (resource instanceof Object ? resource[property] : defvalue);
    }

    /*async changeHP(value, active) {
        //CONFIG.debug.hooks = true;
        for (let t of canvas.tokens.controlled) {
            const a = t.actor; //game.actors.get(t.actor.id);

            if (!a)
                continue;

            let resourcename = (setting("resourcename") || game.system.data.primaryTokenAttribute || 'attributes.hp');
            let resource = getProperty(a.data, "data." + resourcename); //InitiativeHelper.getResource(a);

            if (value.value == 'zero')
                value.value = this.getResValue(resource, "value", resource) + this.getResValue(resource, "temp");
            if (value.value == 'full')
                value.value = (resource instanceof Object ? resource.value - resource.max : resource);

            if (active != undefined && setting("add-defeated")) {
                let status = CONFIG.statusEffects.find(e => e.id === CONFIG.Combat.defeatedStatusId);
                let effect = a && status ? status : CONFIG.controlIcons.defeated;
                const exists = (effect.icon == undefined ? (t.data.overlayEffect == effect) : (a.effects.find(e => e.getFlag("core", "statusId") === effect.id) != undefined));
                if (exists != active)
                    await t.toggleEffect(effect, { overlay: true, active: (active == 'toggle' ? !exists : active) });
            }

            if (active === false && setting("clear-savingthrows")) {
                a.update({ "data.attributes.death.failure": 0, "data.attributes.death.success": 0 });
            }

            log('applying damage', a, value);
            if (value.value != 0) {
                //if (game.system.id == "dnd5e" && setting("resourcename") == 'attributes.hp') {
                //    await a.applyDamage(value);
                //} else {
                    await this.applyDamage(a, value);
                //}
            }
        };

        this.refreshSelected();
    }

    async applyDamage(actor, amount, multiplier = 1) {
        let { value, target } = amount;
        let updates = {};
        let resourcename = (setting("resourcename") || game.system.data.primaryTokenAttribute || 'attributes.hp');
        let resource = getProperty(actor.data, "data." + resourcename); //InitiativeHelper.getResource(actor);
        if (resource instanceof Object) {
            value = Math.floor(parseInt(value) * multiplier);

            // Deduct damage from temp HP first
            let dt = 0;
            let tmpMax = 0;
            if (resource.hasOwnProperty("temp")) {
                const tmp = parseInt(resource.temp) || 0;
                dt = (value > 0 || target == 'temp') && target != 'regular' ? Math.min(tmp, value) : 0;
                // Remaining goes to health

                tmpMax = parseInt(resource.tempmax) || 0;

                updates["data." + resourcename + ".temp"] = tmp - dt;
            }

            // Update the Actor
            if (target != 'temp' && dt >= 0) {
                const dh = Math.clamped(resource.value - (value - dt), (game.system.id == 'D35E' || game.system.id == 'pf1' ? -2000 : 0), resource.max + tmpMax);
                updates["data." + resourcename + ".value"] = dh;
            }
        } else {
            let val = Math.floor(parseInt(resource));
            updates["data." + resourcename] = (val - value);
        }

        return await actor.update(updates);
    }*/

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

    refreshSelected() {
        this.valuePct = null;
        this.tokenstat = "";
        this.tokentemp = "";
        this.tokentooltip = "";
        if (canvas.tokens.controlled.length == 0)
            this.tokenname = "";
        else if (canvas.tokens.controlled.length == 1) {
            let a = canvas.tokens.controlled[0].actor;
            if (!a)
                this.tokenname = "";
            else {
                let resourcename = setting("resourcename");
                let resource = getProperty(a.data, "data." + resourcename);//InitiativeHelper.getResource(canvas.tokens.controlled[0].actor);

                let value = this.getResValue(resource, "value", resource);
                let max = this.getResValue(resource, "max");
                let temp = this.getResValue(resource, "temp");
                let tempmax = this.getResValue(resource, "tempmax");

                // Differentiate between effective maximum and displayed maximum
                const effectiveMax = Math.max(0, max + tempmax);
                let displayMax = max + (tempmax > 0 ? tempmax : 0);

                // Allocate percentages of the total
                const tempPct = Math.clamped(temp, 0, displayMax) / displayMax;
                const valuePct = Math.clamped(value, 0, effectiveMax) / displayMax;

                this.valuePct = valuePct;
                this.tempPct = tempPct;
                const color = [(1 - (this.valuePct / 2)), this.valuePct, 0];
                this.color = `rgba(${parseInt(color[0] * 255)},${parseInt(color[1] * 255)},${parseInt(color[2] * 255)}, 0.7)`;

                this.tokenname = canvas.tokens.controlled[0].data.name;
                this.tokenstat = value;
                this.tokentemp = temp;
                this.tokentooltip = `HP: ${value}, Temp: ${temp}, Max: ${max}`;
            }
        }
        else {
            this.tokenname = `${i18n("InitiativeHelper.Multiple")} <span class="count">${canvas.tokens.controlled.length}</span>`;
        }

        this.changeToken();
    }

    changeToken() {
        $('.character-name', this.element).html(this.tokenname);
        $('.token-stats', this.element).attr('title', this.tokentooltip).html((this.tokentemp ? `<div class="stat temp">${this.tokentemp}</div>` : '') + (this.tokenstat ? `<div class="stat" style="background-color:${this.color}">${this.tokenstat}</div>` : ''));

        let actor = (canvas.tokens.controlled.length == 1 ? canvas.tokens.controlled[0].actor : null);

        $('.resource', this.element).toggle(canvas.tokens.controlled.length == 1 && this.valuePct != undefined);
        if (this.valuePct != undefined) {
            $('.resource .bar', this.element).css({ width: (this.valuePct * 100) + '%', backgroundColor: this.color });
            $('.resource .temp-bar', this.element).toggle(this.tempPct > 0).css({ width: (this.tempPct * 100) + '%' });
        }
    }

    get getValue() {
        let value = $('#InitiativeHelper-hp', this.element).val();
        let result = { value: value };
        if (value.indexOf("r") > -1 || value.indexOf("R") > -1) {
            result.target = "regular";
            result.value = result.value.replace('r', '').replace('R', '');
        }
        if (value.indexOf("t") > -1 || value.indexOf("T") > -1) {
            result.target = "temp";
            result.value = result.value.replace('t', '').replace('T', '');
        }

        result.value = parseInt(result.value);
        if (isNaN(result.value))
            result.value = 1;
        return result;
    }

    clearInput() {
        if (setting("clear-after-enter"))
            $('#InitiativeHelper-hp', this.element).val('');
    }

    activateListeners(html) {
        super.activateListeners(html);

        let that = this;
        html.find('#InitiativeHelper-btn-dead').click(ev => {
            ev.preventDefault();
            if (ev.shiftKey == true)
                this.changeHP({ value: 0 }, 'toggle');
            else {
                log('set character to dead');
                this.changeHP({ value: 'zero' }, true);
                this.clearInput();
            }
        }).contextmenu(ev => {
            ev.preventDefault();
            log('set character to hurt');
            this.changeHP({ value: 'zero' });
            this.clearInput();
        });
        html.find('#InitiativeHelper-btn-hurt').click(ev => {
            ev.preventDefault();
            log('set character to hurt');
            let value = this.getValue;
            if (value.value != '') {
                value.value = Math.abs(value.value);
                this.changeHP(value);
            }
            this.clearInput();
        });
        html.find('#InitiativeHelper-btn-heal').click(ev => {
            ev.preventDefault();
            log('set character to heal');
            let value = this.getValue;
            if (value.value != '') {
                value.value = -Math.abs(value.value);
                this.changeHP(value, false);
            }
            this.clearInput();
        });
        html.find('#InitiativeHelper-btn-fullheal').click(ev => {
            ev.preventDefault();
            log('set character to fullheal');
            this.changeHP({ value: 'full' }, false);
            this.clearInput();
        }).contextmenu(ev => {
            ev.preventDefault();
            log('set character to heal');
            this.changeHP({ value: 'full' });
            this.clearInput();
        });

        if (setting('double-click')) {
            html.find('#InitiativeHelper-btn-hurt').dblclick(ev => {
                ev.preventDefault();
                log('set character to hurt');
                this.changeHP({ value: 'zero' });
                this.clearInput();
            });

            html.find('#InitiativeHelper-btn-heal').dblclick(ev => {
                ev.preventDefault();
                log('set character to heal');
                this.changeHP({ value: 'full' });
                this.clearInput();
            });
        }
        html.find('#InitiativeHelper-hp').focus(ev => {
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

                    let rawvalue = $('#InitiativeHelper-hp', this.element).val();

                    value.value = (rawvalue.startsWith('+') ? -Math.abs(value.value) : Math.abs(value.value));

                    this.changeHP(value); //Heal with a + but everything else is a hurt
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

/*Hooks.on('controlToken', () => {
    game.InitiativeHelper?.refreshSelected();
});*/

/*Hooks.on('updateActor', (actor, data) => {
    if (canvas.tokens.controlled.length == 1
        && canvas.tokens.controlled[0]?.actor.id == actor.id
        && (getProperty(data, "data.attributes.death") != undefined || getProperty(data, "data." + setting("resourcename")))) {
        game.InitiativeHelper?.refreshSelected();
    }
});*/

Hooks.on('dragEndInitiativeHelper', (app) => {
    game.user.setFlag("initiative-helper", "initiativeHelperPos", { left: app.position.left, top: app.position.top });
})

Hooks.on("getSceneControlButtons", (controls) => {
    if (setting("show-option") == 'toggle' && (setting("load-option") == 'everyone' || (setting("load-option") == 'gm' == game.user.isGM))) {
        let tokenControls = controls.find(control => control.name === "token")
        tokenControls.tools.push({
            name: "toggledialog",
            title: "INITIATIVEHELPER.toggledialog",
            icon: "fas fa-briefcase-medical",
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
