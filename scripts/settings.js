import { localize, openwgtngmMiniCalendarSheet,renderCalendarIfOpen } from "./helper.js";
export const MODULE_NAME = "wgtgm-mini-calendar";
import { CalendarConfig } from "./calendar-config.js";
import { WeatherEngine } from "./weather.js";
import { WeatherConfig } from "./weather-config.js";
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
        default: {} ,
        requiresReload: true
    });

    game.settings.register(MODULE_NAME, "calendarSource", {
        scope: "world",
        config: false,
        type: String,
        default: "world",
        requiresReload: true 
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

game.settings.register(MODULE_NAME, "use12hour", {
        name: "Use 12-Hour Clock",
        hint: "Display time in 12-hour format (AM/PM) instead of 24-hour format.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false, 
        onChange: () => {
             if (game.wgtngmMiniCalender?.calendarInstance?.rendered) {
                 game.wgtngmMiniCalender.calendarInstance.render();
             }
        }
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

    game.settings.register(MODULE_NAME, "enableDarknessControl", {
        name: "Enable Scene Darkness Control",
        hint: "If enabled, the module will adjust scene darkness based on the time of day.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });


    game.settings.register(MODULE_NAME, "enableDarknessActive", {
        name: "Adjust Darkness on Active Scenes Only",
        hint: "If enabled, the module will adjust scene darkness only on active scenes.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_NAME, "defaultSceneDarkness", {
        name: "Enable Darkness on Scenes by Default",
        hint: "If checked, all scenes will have darkness control enabled unless specifically disabled in Scene Configuration.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register(MODULE_NAME, "darknessLevelHigh", {
        name: "Darkness Level (Night)",
        hint: "The darkness level for the scene during the night (0.0 to 1.0).",
        scope: "world",
        config: true,
        type: Number,
        range: { min: 0, max: 1, step: 0.05 },
        default: 1.0
    });

    game.settings.register(MODULE_NAME, "darknessLevelLow", {
        name: "Darkness Level (Day)",
        hint: "The darkness level for the scene during the day (0.0 to 1.0).",
        scope: "world",
        config: true,
        type: Number,
        range: { min: 0, max: 1, step: 0.05 },
        default: 0.0
    });

    game.settings.register(MODULE_NAME, "auroraDarknessOverride", {
        name: "Darkness Level (Night - Aurora)",
        hint: "The darkness level for the scene during an aurora (0.0 to 1.0).",
        scope: "world",
        config: true,
        type: Number,
        range: { min: 0, max: 1, step: 0.05 },
        default: 0.8
    });

    game.settings.register(MODULE_NAME, "moonDarknessOverride", {
        name: "Darkness Level (Full Moon)",
        hint: "The darkness level for the scene during the full moon (0.0 to 1.0).",
        scope: "world",
        config: true,
        type: Number,
        range: { min: 0, max: 1, step: 0.05 },
        default: 0.7
    });


    game.settings.register(MODULE_NAME, "customCalendarDraft", {
        scope: "world", 
        config: false,
        type: String,
        default: ""
    });

    
    // WEATHER
    game.settings.register(MODULE_NAME, "useCelsius", {
        name: "Use Celsius",
        hint: "Display temperatures in Celsius instead of Fahrenheit.",
        scope: "client",
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register(MODULE_NAME, "broadcastWeather", {
        name: "Broadcast weather to chat",
        hint: "Sends a Message to Chat with the days weather on date change.",
        scope: "world",
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register(MODULE_NAME, "allAurora", {
        name: "Non Seasonal Aurora",
        hint: "Display the Aurora weather effect throughout the year.",
        scope: "world",
        config: false,
        type: Boolean,
        default: true
    });
    game.settings.register(MODULE_NAME, "auroraChance", {
        name: "Chance for Aurora",
        hint: "The likelyhood an aurora will occur on a clear night (0.0 to 1.0).",
        scope: "world",
        config: false,
        type: Number,
        range: { min: 0, max: 1, step: 0.05 },
        default: 0.25
    });

    // Internal setting to store the calculated forecast data
    game.settings.register(MODULE_NAME, "weatherForecast", {
        scope: "world",
        config: false,
        type: Object,
        default: {}
    });

// --- WEATHER SETTINGS MENU ---
    game.settings.registerMenu(MODULE_NAME, "weatherConfigMenu", {
        name: "Weather Configuration",
        label: "Configure Weather",
        hint: "Set biomes, toggle effects, and manage forecasts.",
        icon: "fas fa-cloud-sun",
        type: WeatherConfig,
        restricted: true
    });

    // --- UNDERLYING WEATHER SETTINGS ---
    game.settings.register(MODULE_NAME, "biome", {
        name: "Current Biome",
        scope: "world",
        config: false, 
        type: String,
        default: "temperate"
    });

    game.settings.register(MODULE_NAME, "enableWeatherEffects", {
        name: "Enable Visual Effects",
        scope: "world",
        config: false, 
        type: Boolean,
        default: true,
        onChange: (value) => {
            import("./weather.js").then(({WeatherEngine}) => {
                if (!value) WeatherEngine.applyWeatherEffect("none");
                else WeatherEngine.refreshWeather(); 
            });
            if (game.wgtngmMiniCalender.calendarInstance && game.user.isGM) {
                const fxIcon = game.wgtngmMiniCalender.calendarInstance.element.querySelector('[data-action="toggle-weather-fx"]');
                fxIcon.classList.toggle('true', value);
            }
        }
    });

    game.settings.register(MODULE_NAME, "enableWeatherForecast", {
        name: "Enable Forecasting",
        scope: "world",
        config: false,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_NAME, "enableWeatherSound", {
        name: "Enable Weather Sounds",
        hint: "Play ambient sound effects matching the current weather.",
        scope: "world", 
        config: false,
        type: Boolean,
        default: true,
        onChange: (value) => {
             if (!value) {
                 import("./weather.js").then(({WeatherEngine}) => {
                    WeatherEngine.stopWeatherSounds();
                 });
             }
            if (game.wgtngmMiniCalender.calendarInstance && game.user.isGM) {
                WeatherEngine.refreshWeather();
                const soundIcon = game.wgtngmMiniCalender.calendarInstance.element.querySelector('[data-action="toggle-weather-sound"]');
                soundIcon.classList.toggle('fa-volume-high', value);      
                soundIcon.classList.toggle('fa-volume-xmark', !value);
            }
        }
    });

// KEY BINDS
    game.keybindings.register(MODULE_NAME, "MiniCalendar", {
      name: "Open the Mini Calendar",
      editable: [
        {key: "KeyK", modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL]}
      ],
      onDown: () => {openwgtngmMiniCalendarSheet()}
    });

}

