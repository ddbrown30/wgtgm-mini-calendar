import minicalendarSettings, { MODULE_NAME } from "./settings.js";
import { wgtngmMiniCalender } from "./mini-calendar.js";
import { handleMPClick, localize, openwgtngmMiniCalendarSheet,openwgtngmMiniCalendarAPI } from "./helper.js";
import { CalendarConfig } from "./calendar-config.js";
import { createMiniCalendarClass } from "./CalendarClass.js";
import { weatherEffects, WeatherEngine } from "./weather.js"; 
import { PlaylistImporter } from "./playlist-importer.js"; // <--- New Import
let DEFAULT_CALENDAR;

export function setCalendarJSON(firstTime = false) {
    const config = game.settings.get(MODULE_NAME, "calendarConfiguration") ?? {};
    const calendarSource = game.settings.get(MODULE_NAME, "calendarSource");

    console.log(`MiniCalendar | Applying calendar source: ${calendarSource}`);

    if (calendarSource === "world") {
        if (DEFAULT_CALENDAR) {
            CONFIG.time.worldCalendarConfig = DEFAULT_CALENDAR;
        }
    } else {
        try {
            const calendarConfig = game.settings.get(MODULE_NAME, "calendarConfiguration");
            if (calendarConfig && Object.keys(calendarConfig).length > 0) {
                CONFIG.time.worldCalendarConfig = calendarConfig;
            } else {
                console.warn(`MiniCalendar | Source is "${calendarSource}" but no config found. Using world default.`);
                if (DEFAULT_CALENDAR) {
                    CONFIG.time.worldCalendarConfig = DEFAULT_CALENDAR;
                }
            }
        } catch (err) {
            console.error("Mini Calendar | Failed to set custom calendar config:", err);
            if (DEFAULT_CALENDAR) {
                CONFIG.time.worldCalendarConfig = DEFAULT_CALENDAR;
            }
        }
    }
    
    if (!firstTime) {
        game.time.initializeCalendar();
    }
}

Hooks.on("preCreateScene", (scene, data, options, userId) => {
    const updates = {};
    if (foundry.utils.getProperty(data, `flags.${MODULE_NAME}.enableDarkness`) === undefined) {
        const defaultDarkness = game.settings.get(MODULE_NAME, "defaultSceneDarkness");
        updates[`flags.${MODULE_NAME}.enableDarkness`] = defaultDarkness;
    }
    if (foundry.utils.getProperty(data, `flags.${MODULE_NAME}.enableWeather`) === undefined) {
        const defaultWeather = game.settings.get(MODULE_NAME, "sceneDefaultWeather");
        updates[`flags.${MODULE_NAME}.enableWeather`] = defaultWeather;
    }
    if (!foundry.utils.isEmpty(updates)) {
        scene.updateSource(updates);
    }
});



Hooks.on("renderSceneConfig", (app, html, data) => {
    const sceneDefaultWeather = game.settings.get(MODULE_NAME, "sceneDefaultWeather");
    const darknessEnabled = game.settings.get(MODULE_NAME, "enableDarknessControl") ? '':`disabled`;
    const defaultEnabled = game.settings.get(MODULE_NAME, "defaultSceneDarkness");
    const currentFlag = app.document.getFlag(MODULE_NAME, "enableDarkness");
    const weatherFlag = app.document.getFlag(MODULE_NAME, "enableWeather");
    const isEnabled = currentFlag !== undefined ? currentFlag : defaultEnabled;
    const isWeatherEnabled = weatherFlag !== undefined ? weatherFlag : sceneDefaultWeather;
    const injection = `
        <fieldset>
            <legend><i class="fas fa-calendar-alt"></i> Mini Calendar</legend>
            <div class="form-group">
                <label>Enable Darkness Control</label>
                <div class="form-fields">
                    <input type="checkbox" name="flags.${MODULE_NAME}.enableDarkness" ${isEnabled ? "checked" : ""} ${darknessEnabled}>
                </div>
                <p class="hint">Allow the Mini Calendar to control the darkness level of this scene based on the time of day.</p>
                <label>Enable Weather on Scene</label>
                <div class="form-fields">
                    <input type="checkbox" name="flags.${MODULE_NAME}.enableWeather" ${isWeatherEnabled ? "checked" : ""}>
                </div>
                <p class="hint">Allow the Mini Calendar apply weather effect overlays on this scene.</p>
            </div>
        </fieldset>
    `;
    // const $html = $(html);
    const target = html.querySelector('div[data-tab="ambience"] > div[data-tab="basic"] > fieldset:last-of-type');
      if (target) {
        target.insertAdjacentHTML("afterend", injection);
      }

});

Hooks.once("init", async function () {
    console.log("MiniCalendar | Initializing");
    await minicalendarSettings();

    if (weatherEffects) {
        for (const [key, config] of Object.entries(weatherEffects)) {
            CONFIG.weatherEffects[key] = config;
        }
        console.log("MiniCalendar | Registered custom weather effects.");
    }

    game.modules.get(MODULE_NAME).api = {
        /**
         * Sets the weather for the current day immediately.
         * @param {string} type - The weather type (e.g. "rain", "snow", "none")
         * @param {number} temp - Temperature value
         */
        overrideWeather: async (type, temp, dayDelta) => {
            await WeatherEngine.setWeatherOverride(type, temp, dayDelta);
        },
        /**
       * Sets the game time to a specific hour of the current (or offset) day.
       * @param {number} [day=0] - The day offset (0 = today, 1 = tomorrow).
       * @param {number|string} [hour=0] - The hour (0-23) OR a keyword: "dawn", "dusk", "noon", "midnight".
       */
        setTime: async (day, hour) => {
            await wgtngmMiniCalender.setDayHour(day, hour);
        },
        openCalendar: async (toggle) => { await openwgtngmMiniCalendarAPI(toggle) }
    };


    DEFAULT_CALENDAR = foundry.utils.deepClone(CONFIG.time.worldCalendarConfig);
    CONFIG.time.worldCalendarClass = createMiniCalendarClass();

        Handlebars.registerHelper('json', function(context) {
        return JSON.stringify(context);
    });
        setCalendarJSON(true); 

    
    const templatePaths = [
        `modules/${MODULE_NAME}/templates/wgtgm_calendar.hbs`,
        `modules/${MODULE_NAME}/templates/wgtgm-calendar-config.hbs`
    ];
    foundry.applications.handlebars.loadTemplates(templatePaths);
});

Hooks.once("i18nInit", async function () {
    // Localization can be loaded here
 });


Hooks.once("ready", async function () {

    game.wgtngmMiniCalender = new wgtngmMiniCalender();
    game.wgtngmMiniCalender.calendarInstance = null; 
    if (game.settings.get(MODULE_NAME, "calSheetOpened")) {
        openwgtngmMiniCalendarSheet();
    }
    if (game.user.isGM) {
        const importer = new PlaylistImporter();
        await importer.importFromDirectory();
    }
    await WeatherEngine.updateForecasts();
    if (game.user.isGM) {
        if (game.settings.get(MODULE_NAME, "runonlyonce") === false) {
            await ChatMessage.create(
                {
                    user: game.user.id,
                    speaker: ChatMessage.getSpeaker(),
                    content: localize("welcomePageHTML"),
                },
                {},
            );
            await game.settings.set(MODULE_NAME, "runonlyonce", true);
        }
    }
});




Hooks.on("renderChatMessageHTML", (app, html, data) => {
    const handlers = html.querySelectorAll(`[data-wgtngm^="${MODULE_NAME}|"]`);
    handlers.forEach((element) => {
        element.addEventListener("click", handleMPClick);
    });
});

Hooks.on("getSceneControlButtons", (controls) => {
    controls["wgtngmMiniCalendar"] = {
        name: "wgtngmMiniCalendar",
        title: "Mini Calendar",
        icon: "fas fa-calendar",
        visible: true,
        button:true,
        order: Object.keys(controls).length+1,
        onChange: (event, active) => {
        if ( active ) canvas.tokens.activate();
        },
      onToolChange: () => {},
        tools: {
            "mini-calendar": {
                name: "wgtngmMiniCalendar",
                title: "Mini Calendar",
                icon: "fas fa-calendar",
                button: true,
                order: 11,
                onChange: (event, toggle) => {
                    openwgtngmMiniCalendarSheet();
                }
            },

        },
        activeTool: "mini-calendar"
    };
});