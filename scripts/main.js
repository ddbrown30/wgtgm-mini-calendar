import { CalendarHUD } from "./calendar-hud.js";
import minicalendarSettings, { MODULE_NAME } from "./settings.js";
import { wgtngmMiniCalender } from "./mini-calendar.js";
import { handleMPClick, localize, openwgtngmMiniCalendarSheet, openwgtngmMiniCalendarAPI } from "./helper.js";
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
    const darknessEnabled = game.settings.get(MODULE_NAME, "enableDarknessControl") ? '' : `disabled`;
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

    Handlebars.registerHelper('json', function (context) {
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
    if (game.pf2e?.worldClock && game.settings.get(MODULE_NAME, "enableDarknessControl")) {
        const pf2eWorldClock = game.settings.get('pf2e', 'worldClock');
        if (pf2eWorldClock?.syncDarkness) {
            await game.settings.set('pf2e', 'worldClock', { ...pf2eWorldClock, syncDarkness: false });
            ui.notifications.warn("Mini Calendar: PF2e Darkness Sync Disabled to avoid conflicts.");
        }
    }

    game.wgtngmMiniCalender = new wgtngmMiniCalender();
    await game.wgtngmMiniCalender.initialize();

    // Initialize HUD
    game.wgtngmMiniCalender.hud = new CalendarHUD();
    if (game.settings.get(MODULE_NAME, "calHudOpened")) {
        game.wgtngmMiniCalender.hud.render(true);
    }

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

Hooks.on("closeCalendarConfig", () => {
    const calendarApp = game.wgtngmMiniCalender;

    if (calendarApp instanceof wgtngmMiniCalender) {
        console.log("Mini Calendar | Handling config close, re-rendering calendar.");
        calendarApp._resetMoonCache();
        calendarApp.render();
    }
});

Hooks.on("combatStart", (combat, updateData) => {
    if (!game.user.isGM) return;
    const pauseOnCombat = game.settings.get(MODULE_NAME, "pauseOnCombat");
    const calendarApp = game.wgtngmMiniCalender;

    if (pauseOnCombat && calendarApp instanceof wgtngmMiniCalender && calendarApp.isRunning) {
        calendarApp._stopTime();
        calendarApp.wasPausedForCombat = true;
        console.log("Mini Calendar | Time advancement paused due to combat.");
        if (calendarApp.rendered) calendarApp.render();
    }
    if (game.settings.get(MODULE_NAME, "hideHudonCombat")){
        if (game.wgtngmMiniCalender.hud?.rendered) game.wgtngmMiniCalender.hud.close();
    }
});

Hooks.on("deleteCombat", (combat, options, userId) => {
    if (!game.user.isGM) return;
    const resumeAfterCombat = game.settings.get(MODULE_NAME, "resumeAfterCombat");
    const calendarApp = game.wgtngmMiniCalender;

    if (resumeAfterCombat && calendarApp instanceof wgtngmMiniCalender && calendarApp.wasPausedForCombat) {
        calendarApp._startTime();
        calendarApp.wasPausedForCombat = false;
        console.log("Mini Calendar | Time advancement resumed after combat.");
        if (calendarApp.rendered) calendarApp.render();
    }
    if (game.settings.get(MODULE_NAME, "hideHudonCombat")){
        if (!game.wgtngmMiniCalender.hud?.rendered) game.wgtngmMiniCalender.hud.render(true);
    }

});


Hooks.on("updateScene", async (scene, changes, options, userId) => {
    // if (foundry.utils.hasProperty(changes, "weather")){
    //     if (game.wgtngmMiniCalender.hud.rendered) game.wgtngmMiniCalender.hud.updateWeatherIcon();
    // }
    if (foundry.utils.hasProperty(changes, "flags.wgtgm-mini-calendar")) {
        const myFlags = changes.flags["wgtgm-mini-calendar"];
        console.log("Mini Calendar flags were updated:", myFlags);
        if (myFlags.enableDarkness !== undefined) {
            if (game.wgtngmMiniCalender) {
                await game.wgtngmMiniCalender._updateSceneDarkness(game.time.worldTime);
            } else {
                await canvas.scene.update(
                    { environment: { darknessLevel: 0 } },
                    { animateDarkness: 1200 }
                );
            }

        }
        if (myFlags.enableWeather !== undefined) {
            if (!myFlags.enableWeather) await WeatherEngine.disableWeatherEffect();
            else WeatherEngine.refreshWeather();
        }
    }
});

Hooks.on("canvasReady", async (canvas) => {
    WeatherEngine.refreshWeather();
    if (game.wgtngmMiniCalender) await game.wgtngmMiniCalender._updateSceneDarkness(game.time.worldTime);
    // await WeatherEngine.playWeatherSound(canvas.scene.weather);
});


Hooks.on("pauseGame", (paused) => {
    if (!game.user.isGM) return;

    const calendarApp = game.wgtngmMiniCalender;

    if (calendarApp instanceof wgtngmMiniCalender) {
        if (paused) {
            if (calendarApp.isRunning && !calendarApp.wasPausedForCombat) {
                calendarApp._stopTime();
                calendarApp.wasPausedForGame = true;
                console.log("Mini Calendar | Time advancement paused due to game pause.");
            }
        } else {
            if (calendarApp.wasPausedForGame) {
                if (!calendarApp.wasPausedForCombat) {
                    calendarApp._startTime();
                }
                calendarApp.wasPausedForGame = false;
                console.log("Mini Calendar | Time advancement resumed after game pause.");
            }
        }
        if (calendarApp.rendered) calendarApp.render();
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
        order: Object.keys(controls).length + 1,
        title: "Mini Calendar",
        layer: "wgtngmMiniCalendar",
        icon: "fas fa-calendar",
        visible: true,
        onChange: (event, active) => {
            // if ( active ) canvas.templates.activate();
        },
        onToolChange: () => canvas.templates.setAllRenderFlags({ refreshState: true }),
        activeTool: "wgtngmdummy",

        tools: {
            miniCalendar: {
                name: "miniCalendar",
                order: 2,
                title: "Mini Calendar",
                icon: "fa-solid fa-calendar",
                visible: !canvas.scene?.environment.darknessLock,
                onChange: () => {
                    openwgtngmMiniCalendarSheet();
                },
                button: true,
            },
            miniCalendarHUD: {
                name: "miniCalendarHUD",
                order: 3,
                title: "Mini Calendar HUD",
                icon: "fa-solid fa-clock",
                visible: !canvas.scene?.environment.darknessLock,
                onChange: () => {
                    const hud = game.wgtngmMiniCalender?.hud;
                    if (hud) {
                        if (hud.element) hud.close();
                        else hud.render(true);
                    }
                },
                button: true,
            },
            wgtngmdummy: {
                name: "wgtngmdummy",
                visible: true,
                order: 9,
                onChange: (event, active) => { }
            },
        }
    }
});


Hooks.on('renderSceneControls', () => {
    if (ui.controls.control.name === 'wgtngmMiniCalendar') {
        const toolElements = document.getElementById("scene-controls-tools");
        toolElements.querySelector('button[data-tool="wgtngmdummy"]').parentElement.style.display = "none";
    }
});





