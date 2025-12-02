import minicalendarSettings, { MODULE_NAME } from "./settings.js";
import { wgtngmMiniCalender } from "./mini-calendar.js";
import { handleMPClick, localize, openwgtngmMiniCalendarSheet } from "./helper.js";
import { CalendarConfig } from "./calendar-config.js";
// import { MiniCalendarClass } from "./CalendarClass.js";
import { createMiniCalendarClass } from "./CalendarClass.js";

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

Hooks.on("renderSceneConfig", (app, html, data) => {
    if (!game.settings.get(MODULE_NAME, "enableDarknessControl")) return;
    const defaultEnabled = game.settings.get(MODULE_NAME, "defaultSceneDarkness");
    const currentFlag = app.document.getFlag(MODULE_NAME, "enableDarkness");
    const isEnabled = currentFlag !== undefined ? currentFlag : defaultEnabled;
    const injection = `
        <fieldset>
            <legend><i class="fas fa-calendar-alt"></i> Mini Calendar</legend>
            <div class="form-group">
                <label>Enable Darkness Control</label>
                <div class="form-fields">
                    <input type="checkbox" name="flags.${MODULE_NAME}.enableDarkness" ${isEnabled ? "checked" : ""}>
                </div>
                <p class="hint">Allow the Mini Calendar to control the darkness level of this scene based on the time of day.</p>
            </div>
        </fieldset>
    `;
    const $html = $(html);
    const $lightingTab = $html.find('div[data-tab="lighting"]');
    if ($lightingTab.length > 0) {
        $lightingTab.append(injection);
        app.setPosition({ height: "auto" });
    }
});

Hooks.once("init", async function () {
    console.log("MiniCalendar | Initializing");

    await minicalendarSettings();

    DEFAULT_CALENDAR = foundry.utils.deepClone(CONFIG.time.worldCalendarConfig);
    // CONFIG.time.worldCalendarClass = MiniCalendarClass;
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