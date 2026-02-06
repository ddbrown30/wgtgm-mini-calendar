import { localize, openwgtngmMiniCalendarSheet, renderCalendarIfOpen } from "./helper.js";
export const MODULE_NAME = "wgtgm-mini-calendar";
import { CalendarConfig } from "./calendar-config.js";
import { WeatherEngine } from "./weather.js";
import { WeatherConfig } from "./weather-config.js";
import { CalendarMaker } from "./calendar-maker.js";
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

    game.settings.register(MODULE_NAME, "lastWeatherBroadcastDate", {
        scope: "world",
        config: false,
        type: String,
        default: ""
    });

    game.settings.register(MODULE_NAME, "whisperedNoteIds", {
        scope: "client",
        config: false,
        type: Array,
        default: []
    });

    game.settings.register(MODULE_NAME, "savedCalendars", {
        name: "Saved Custom Calendars",
        scope: "world",
        config: false,
        type: Object,
        default: {},
        requiresReload: false
    });

    game.settings.register(MODULE_NAME, "allowPlayerNotes", {
        name: "Allow Player Notes",
        hint: "If enabled, players can create and edit their own notes in a separate journal.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true
    });

    game.settings.register(MODULE_NAME, "enableSystemPF2e", {
        name: "Enable PF2e System Sync",
        hint: "If enabled, the calendar will strictly synchronize with the PF2e system time and rules (like leap years and epoch offsets). Disable if you want to use custom calendar rules unrelated to PF2e.",
        scope: "world",
        config: game.system.id === 'pf2e',
        type: Boolean,
        default: true,
        requiresReload: true
    });

    game.settings.registerMenu(MODULE_NAME, "calendarConfigMenu", {
        name: "Calendar Configuration",
        label: "Configure Active Calendar",
        hint: "Select and apply a preset or custom calendar.",
        icon: "fas fa-cog",
        type: CalendarConfig,
        restricted: true
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
    
    game.settings.register(MODULE_NAME, "calHudOpened", {
        name: localize("settings.calHudOpened"),
        hint: localize("settings.calHudOpenedHint"),
        scope: "client",
        config: false,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_NAME, "startMinimized", {
        name: "Open Calendar Minimized",
        hint: "If checked, the calendar will always open in its minimized state.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });

    // game.settings.register(MODULE_NAME, "enableHUD", {
    //     name: "Enable Top HUD",
    //     hint: "Show the top-docked HUD bar.",
    //     scope: "client",
    //     config: true,
    //     type: Boolean,
    //     default: true,
    //     requiresReload: true
    // });


    game.settings.register(MODULE_NAME, "dockSidebar", {
        name: "Dock to Sidebar",
        hint: "If enabled, the calendar will be docked above the Player List in the left sidebar. (Requires reopening the calendar).",
        scope: "client",
        config: true,
        default: false,
        type: Boolean,
        onChange: () => {
            if (game.wgtngmMiniCalender && game.wgtngmMiniCalender.rendered) {
                game.wgtngmMiniCalender.render(true);
            }
        }
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
        default: {},
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
            if (game.wgtngmMiniCalender && game.wgtngmMiniCalender.rendered) {
                game.wgtngmMiniCalender.render();
            }
        }
    });

    game.settings.register(MODULE_NAME, "timeIsRunning", {
        scope: "world",
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.register(MODULE_NAME, "fadedUI", {
        name: localize("settings.fadedUI"),
        hint: localize("settings.fadedUIHint"),
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            if (game.wgtngmMiniCalender.hud && game.wgtngmMiniCalender.hud.rendered) {
                game.wgtngmMiniCalender.hud.element.classList.toggle("faded-ui", value);
            }
            if (game.wgtngmMiniCalender && game.wgtngmMiniCalender.rendered) {
                game.wgtngmMiniCalender.element.classList.toggle("faded-ui", value);
            }
        }
    });

    game.settings.register(MODULE_NAME, "pauseOnCombat", {
        name: localize("settings.pauseOnCombat"),
        hint: localize("settings.pauseOnCombatHint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false,
        onChange: (value) => {
            if (!game.user.isGM) return;
            const calendarApp = game.wgtngmMiniCalender;
            if (!calendarApp) return;
            if (value) {
                if (game.combat?.started) {
                    calendarApp.wasPausedForCombat = true;
                    calendarApp._stopTime();
                    console.log("Mini Calendar | Pause on Combat enabled while in combat. Stopping time.");
                }
            } else {
                if (calendarApp.wasPausedForCombat) {
                    calendarApp.wasPausedForCombat = false;
                    calendarApp._startTime();
                    console.log("Mini Calendar | Pause on Combat disabled. Resuming time.");
                }
            }
        }
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

    game.settings.register(MODULE_NAME, "hideHudonCombat", {
        name: localize("settings.hideHudonCombat"),
        hint: localize("settings.hideHudonCombatHint"),
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
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => {
            if (game.wgtngmMiniCalender && game.wgtngmMiniCalender.rendered) {
                game.wgtngmMiniCalender.render();
            }
        }
    });


    game.settings.register(MODULE_NAME, "hideWeatherPlayer", {
        name: "Hide Weather Forecasting from players",
        hint: "If enabled, weather forecasts will be disabled on the calendar",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => {
            if (game.wgtngmMiniCalender && game.wgtngmMiniCalender.rendered) {
                game.wgtngmMiniCalender.render();
            }
        }
    });

    game.settings.register(MODULE_NAME, "sceneDefaultWeather", {
        name: "Enable Weather on Scenes",
        hint: "If enabled, created scenes will have weather enabled by default",
        scope: "world",
        config: true,
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
            import("./weather.js").then(({ WeatherEngine }) => {
                if (!value) WeatherEngine.applyWeatherEffect("none");
                else WeatherEngine.refreshWeather();
            });
            if (game.wgtngmMiniCalender && game.user.isGM) {
                const fxIcon = game.wgtngmMiniCalender.element?.querySelector('[data-action="toggle-weather-fx"]');
                if (fxIcon) fxIcon.classList.toggle('true', value);
            }
        }
    });

    game.settings.register(MODULE_NAME, "enableWeatherForecast", {
        name: "Enable Forecasting",
        scope: "world",
        config: false,
        type: Boolean,
        default: true,
        onChange: () => {
            if (game.wgtngmMiniCalender && game.wgtngmMiniCalender.rendered) {
                game.wgtngmMiniCalender.render();
            }
        }
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
                import("./weather.js").then(({ WeatherEngine }) => {
                    WeatherEngine.stopWeatherSounds();
                });
            }
            if (game.wgtngmMiniCalender && game.user.isGM) {
                WeatherEngine.refreshWeather();
                const soundIcon = game.wgtngmMiniCalender.element.querySelector('[data-action="toggle-weather-sound"]');
                soundIcon.classList.toggle('fa-volume-high', value);
                soundIcon.classList.toggle('fa-volume-xmark', !value);
            }
        }
    });

    game.settings.register(MODULE_NAME, "customBiomeMap", {
        scope: "world",
        config: false,
        default: {},
        type: Object
    });

    game.settings.register(MODULE_NAME, "customBiomeConfig", {
        scope: "world",
        config: false,
        default: {},
        type: Object
    });
    // KEY BINDS
    game.keybindings.register(MODULE_NAME, "MiniCalendar", {
        name: "Open the Mini Calendar",
        editable: [
            { key: "KeyK", modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL] }
        ],
        onDown: () => { openwgtngmMiniCalendarSheet() }
    });

}

