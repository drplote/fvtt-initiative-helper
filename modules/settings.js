import { i18n } from "../initiativehelper.js";

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

    game.settings.register(modulename, "clear-after-enter", {
        name: i18n("INITIATIVEHELPER.clear-after-enter.name"),
        hint: i18n("INITIATIVEHELPER.clear-after-enter.hint"),
        scope: "client",
        default: true,
        type: Boolean,
        config: true
    });

}