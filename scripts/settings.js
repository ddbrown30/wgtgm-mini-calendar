import { localize, openwgtngmMiniCalendarSheet } from "./helper.js";
export const MODULE_NAME = "wgtgm-mini-calendar";
import { CalendarConfig } from "./calendar-config.js";

export default async function minicalendarSettings() {
    game.settings.register(MODULE_NAME, "runonlyonce", {
        name: "Welcome message",
        hint: "Disable to see the Welcome Message",
        scope: "world",
        config: true,
        requiresReload: true,
        type: Boolean,
        default: false,
    });


    game.settings.register(MODULE_NAME, "calSheetDimensions", {
        name: localize("settings.calSheetDimensions"),
        hint: localize("settings.calSheetDimensionsHint"),
        scope: "client",
        config: false,  
        type: Object,
        default: { width: 400, height: 450, top: 100, left: 100 } 
    });

    game.settings.register(MODULE_NAME, "calSheetOpened", {
        name: localize("settings.calSheetOpened"),
        hint: localize("settings.calSheetOpenedHint"),
        scope: "client",
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register(MODULE_NAME, "startMinimized", {
        name: "Open Calendar Minimized",
        hint: "If checked, the calendar will always open in its minimized state.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register(MODULE_NAME, "minimized", {
        scope: "client",
        config: false,
        type: Boolean,
        default: false 
    });
    
    game.settings.register(MODULE_NAME, "calendarConfiguration", {
        scope: "world",
        config: false,
        type: Object,
        default: {} 
    });

    game.settings.register(MODULE_NAME, "calendarSource", {
        scope: "world",
        config: false,
        type: String,
        default: "world" 
    });

    game.settings.registerMenu(MODULE_NAME, "calendarConfigMenu", {
        name: "Calendar Configuration",
        label: "Configure Calendar",
        hint: "Set up a custom calendar or use the world's default.",
        icon: "fas fa-cog",
        type: CalendarConfig,
        restricted: true
    });

    game.settings.register(MODULE_NAME, "timeMultiplier", {
          scope: "world",
        config: false, 
        type: Number,
        default: 1
    });

    game.settings.register(MODULE_NAME, "timeIsRunning", {
        scope: "client", 
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register(MODULE_NAME, "pauseOnCombat", {
        name: localize("settings.pauseOnCombat"), 
        hint: localize("settings.pauseOnCombatHint"), 
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false 
    });

    game.settings.register(MODULE_NAME, "resumeAfterCombat", {
        name: localize("settings.resumeAfterCombat"), 
        hint: localize("settings.resumeAfterCombatHint"), 
        scope: "world",
        config: true, 
        type: Boolean,
        default: false,
        requiresReload: false 
    });

    game.settings.register(MODULE_NAME, "customCalendarDraft", {
        scope: "world", 
        config: false,
        type: String,
        default: ""
    });

    game.keybindings.register("MODULE_NAME", "MiniCalendar", {
      name: "Open the Mini Music Player",
      editable: [
        {key: "KeyK", modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL]}
      ],
      onDown: () => {openwgtngmMiniCalendarSheet()}
    });

}

