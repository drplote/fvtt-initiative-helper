import { i18n } from "../InitiativeHelper.js";

export const registerSettings = function () {
    let modulename = "initiative-helper";

    const debouncedReload = foundry.utils.debounce(function () { window.location.reload(); }, 100);

    let showoptions = {
        'on': game.i18n.localize("INITIATIVEHELPER.alwaysshow"),
        'off': game.i18n.localize("INITIATIVEHELPER.dontshow"),
        'toggle': game.i18n.localize("INITIATIVEHELPER.allowtoggle"),
    };

    let loadoptions = {
        'everyone': game.i18n.localize("INITIATIVEHELPER.everyone"),
        'gm': game.i18n.localize("INITIATIVEHELPER.gm"),
        'players': game.i18n.localize("INITIATIVEHELPER.players"),
    };

    game.settings.register(modulename, "load-option", {
        name: game.i18n.localize("INITIATIVEHELPER.load-option.name"),
        scope: "world",
        config: true,
        default: "everyone",
        type: String,
        choices: loadoptions,
        onChange: debouncedReload
    });

    game.settings.register(modulename, "show-option", {
        name: game.i18n.localize("INITIATIVEHELPER.show-option.name"),
        hint: game.i18n.localize("INITIATIVEHELPER.show-option.hint"),
        scope: "client",
        config: true,
        default: "toggle",
        type: String,
        choices: showoptions,
        onChange: debouncedReload
    });

    game.settings.register(modulename, "resourcename", {
        name: i18n("INITIATIVEHELPER.resourcename.name"),
        hint: i18n("INITIATIVEHELPER.resourcename.hint"),
        scope: "world",
        default: game.system.data.primaryTokenAttribute || 'attributes.hp',
        type: String,
        config: true
    });

    game.settings.register(modulename, "add-defeated", {
        name: i18n("INITIATIVEHELPER.add-defeated.name"),
        hint: i18n("INITIATIVEHELPER.add-defeated.hint"),
        scope: "world",
        default: true,
        type: Boolean,
        config: true
    });

    game.settings.register(modulename, "clear-savingthrows", {
        name: i18n("INITIATIVEHELPER.clear-savingthrows.name"),
        hint: i18n("INITIATIVEHELPER.clear-savingthrows.hint"),
        scope: "world",
        default: true,
        type: Boolean,
        config: true
    });

    game.settings.register(modulename, "clear-after-enter", {
        name: i18n("INITIATIVEHELPER.clear-after-enter.name"),
        hint: i18n("INITIATIVEHELPER.clear-after-enter.hint"),
        scope: "client",
        default: true,
        type: Boolean,
        config: true
    });

    game.settings.register(modulename, "double-click", {
        name: i18n("INITIATIVEHELPER.double-click.name"),
        hint: i18n("INITIATIVEHELPER.double-click.hint"),
        scope: "client",
        default: false,
        type: Boolean,
        config: true
    });


    game.settings.register(modulename, "show-dialog", {
        name: i18n("INITIATIVEHELPER.show-dialog.name"),
        hint: i18n("INITIATIVEHELPER.show-dialog.hint"),
        scope: "client",
        default: true,
        type: Boolean,
        config: false
    });
}