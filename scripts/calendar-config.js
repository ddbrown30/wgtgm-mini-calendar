import { MODULE_NAME } from "./settings.js";
import { confirmationDialog } from "./helper.js";
import { setCalendarJSON } from "./main.js";

var ApplicationV2 = foundry.applications.api.ApplicationV2;
var HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
const calendarForm = HandlebarsApplicationMixin(ApplicationV2);

/**
 * The settings application for the Mini Calendar
 */
export class CalendarConfig extends calendarForm {
    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "wgtngm-calendar-config",
        classes: ["wgtngmMiniCalenderConfig"],
        title: "Mini Calendar Configuration",
        window: {
            resizable: true,
        },
        position: { width: 600, height: "auto" },
        form: {
            handler: this.#onSubmitForm,
            closeOnSubmit: true,
            submitOnChange: false,
        },
        actions: {
            reset: this.#onResetDefaults,
        },
    };

    /** @override */
    static PARTS = {
        form: {
            template: `modules/wgtgm-mini-calendar/templates/wgtgm-calendar-config.hbs`,
            scrollable: [".form-body"],
        },
        footer: {
            template: "templates/generic/form-footer.hbs",
        },
    };

    /**
     * Tries to parse a JSON string.
     * @param {string} jsonString
     * @returns {object|null} The parsed object or null if invalid.
     */
    _tryParseJson(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
                return parsed;
            }
            return null;
        } catch (e) {
            console.warn("Mini Calendar | JSON Parse Error:", e);
            return null;
        }
    }

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.buttons = this._getButtons();

        const source = game.settings.get(MODULE_NAME, "calendarSource");

        context.calendarOptions = [
            { value: "world", label: "Default (World's Calendar)", selected: source === "world" },
            { value: "harptos", label: "Preset: Harptos (Full Format)", selected: source === "harptos" },
            { value: "gregorian", label: "Preset: Gregorian (Full Format)", selected: source === "gregorian" },
            { value: "custom", label: "Custom JSON (Full Format)", selected: source === "custom" },
        ];

        let calendarJsonString = "{}";
        let calendarData = null;

        if (source === "harptos") {
            calendarData = this._getHarptosFullExample();
            calendarJsonString = JSON.stringify(calendarData, null, 2);
        } else if (source === "gregorian") {
            calendarData = this._getGregorianFullExample();
            calendarJsonString = JSON.stringify(calendarData, null, 2);
        } else if (source === "custom") {
            let savedConfig;
            if (game.settings.get(MODULE_NAME, "customCalendarDraft")) {
                try {
                    savedConfig = JSON.parse(game.settings.get(MODULE_NAME, "customCalendarDraft"));
                } catch (e) {
                    console.log(e);
                    savedConfig = game.settings.get(MODULE_NAME, "calendarConfiguration");
                }
            } else {
                savedConfig = game.settings.get(MODULE_NAME, "calendarConfiguration");
            }
            if (savedConfig && Object.keys(savedConfig).length > 0) {
                calendarData = savedConfig;
                calendarJsonString = JSON.stringify(calendarData, null, 2);
            } else {
                ui.notifications.warn("Custom calendar selected but no configuration found. Loading Harptos example.");
                calendarData = this._getHarptosFullExample();
                calendarJsonString = JSON.stringify(calendarData, null, 2);
            }
        } else {
            calendarData = game.time.calendar.toJSON();
            calendarJsonString = JSON.stringify(calendarData, null, 2);
        }

        if (!calendarData || Object.keys(calendarData).length === 0) {
            ui.notifications.warn("Invalid or empty calendar data found. Loading Harptos default for display.");
            calendarData = this._getHarptosFullExample();
            calendarJsonString = JSON.stringify(calendarData, null, 2);
        }

        context.timeMultiplier = game.settings.get(MODULE_NAME, "timeMultiplier");
        context.calendarJson = calendarJsonString;

        return context;
    }

    _getButtons() {
        return [
            {
                type: "button",
                action: "reset",
                icon: "fa-solid fa-undo",
                label: "Reset to default",
            },
            {
                type: "submit",
                icon: "fa-solid fa-floppy-disk",
                label: "Save Changes",
            },
        ];
    }

    /**
     * @override
     * @param {Event} event
     * @param {object} form
     * @param {object} formData
     */
    static async #onSubmitForm(event, form, formData) {
        const source = formData.object.source;
        let calendarJsonString = formData.object.calendarJson;
        let calendarData = null;
        const multiplier = parseInt(formData.object.timeMultiplier) || 1;

        await game.settings.set(MODULE_NAME, "timeMultiplier", multiplier);
        await game.settings.set(MODULE_NAME, "calendarSource", source);

        let calendarChanged = false;

        if (source === "world") {
            await game.settings.set(MODULE_NAME, "calendarConfiguration", {});
            ui.notifications.info("Calendar source set to World Default.");
            calendarChanged = true;
        } else {
            if (source === "harptos") {
                calendarData = this._getHarptosFullExample();
            } else if (source === "gregorian") {
                calendarData = this._getGregorianFullExample();
            } else if (source === "custom") {
                calendarData = this._tryParseJson(calendarJsonString);
                if (!calendarData) {
                    ui.notifications.error(
                        "Invalid JSON! Calendar was not saved. Please check the format and try again.",
                    );
                    return;
                }
                try {
                    const validationData = foundry.utils.deepClone(calendarData);
                    if (validationData.moons) delete validationData.moons;
                    if (validationData.sun) delete validationData.sun;
                    new foundry.data.CalendarData(validationData);
                } catch (validationError) {
                    console.error("Mini Calendar | Calendar validation failed:", validationError);
                    ui.notifications.error(
                        `Calendar data is invalid: ${validationError.message}. Please fix and try again.`,
                    );
                    return;
                }
                game.settings.set(MODULE_NAME, "customCalendarDraft", calendarJsonString);
            }

            if (calendarData) {
                try {
                    await game.settings.set(MODULE_NAME, "calendarConfiguration", calendarData);
                    ui.notifications.info(`Custom Calendar (${source}) Saved!`);
                    calendarChanged = true;
                } catch (err) {
                    console.error("Mini Calendar | Error saving calendar configuration:", err);
                    ui.notifications.error("Failed to save calendar configuration. Check console.");
                    return;
                }
            } else {
                ui.notifications.error("Failed to obtain calendar data. Save aborted.");
                return;
            }
        }

        setCalendarJSON();

        // if (calendarChanged) {
        //     ui.notifications.warn("Global calendar configuration changed. A reload (F5) is required for all changes to take effect.");
        // }

        Hooks.callAll("closeCalendarConfig");
    }

    /** @override */
    async _onRender(context, options) {
        await super._onRender(context, options);
        this._activateListeners(this.element);
    }

    /** @override */
    _activateListeners(html) {
        if (!html) return;
        const sourceSelect = html.querySelector("#calendar-source");
        if (!sourceSelect) return;

        sourceSelect.addEventListener("change", async (event) => {
            await game.settings.set(MODULE_NAME, "calendarSource", event.currentTarget.value);
            this.render();
        });

        const jsonArea = html.querySelector("#wgtngm-custom-json-area");
        const jsonTextarea = html.querySelector("#calendar-json");

        if (jsonArea && jsonTextarea) {
            const currentSource = sourceSelect.value;
            if (currentSource === "world") {
                jsonArea.style.display = "";
                jsonTextarea.disabled = true;
                jsonTextarea.style.opacity = "0.7";
            } else if (currentSource === "custom") {
                jsonArea.style.display = "";
                jsonTextarea.disabled = false;
                jsonTextarea.style.opacity = "1";
            } else {
                jsonArea.style.display = "";
                jsonTextarea.disabled = true;
                jsonTextarea.style.opacity = "0.7";
            }
        }
    }

    /**
     * Get Harptos preset in FULL CalendarData format
     * CORRECTED VERSION - Matches Foundry VTT v13 CalendarData schema
     */
    _getHarptosFullExample() {
        return {
            name: "Harptos (Forgotten Realms)",
            id: "harptos-preset",
            description: "The standard calendar of the Forgotten Realms.",
            years: {
                yearZero: 0,
                firstWeekday: 0,
                leapYear: {
                    leapStart: 0,
                    leapInterval: 4,
                },
            },
            months: {
                values: [
                    {
                        name: "Hammer",
                        abbreviation: "Ham",
                        ordinal: 1,
                        days: 30,
                    },
                    {
                        name: "Midwinter",
                        abbreviation: "Mid",
                        ordinal: 1,
                        days: 1,
                    },
                    {
                        name: "Alturiak",
                        abbreviation: "Alt",
                        ordinal: 2,
                        days: 30,
                    },
                    {
                        name: "Ches",
                        abbreviation: "Che",
                        ordinal: 3,
                        days: 30,
                    },
                    {
                        name: "Tarsakh",
                        abbreviation: "Tar",
                        ordinal: 4,
                        days: 30,
                    },
                    {
                        name: "Greengrass",
                        abbreviation: "Gre",
                        ordinal: 4,
                        days: 1,
                    },
                    {
                        name: "Mirtul",
                        abbreviation: "Mir",
                        ordinal: 5,
                        days: 30,
                    },
                    {
                        name: "Kythorn",
                        abbreviation: "Kyt",
                        ordinal: 6,
                        days: 30,
                    },
                    {
                        name: "Flamerule",
                        abbreviation: "Fla",
                        ordinal: 7,
                        days: 30,
                    },
                    {
                        name: "Midsummer",
                        abbreviation: "MidS",
                        ordinal: 7,
                        days: 1,
                    },
                    {
                        name: "Shieldmeet",
                        abbreviation: "Shi",
                        ordinal: 7,
                        days: 0,
                        leapDays: 1,
                    },
                    {
                        name: "Eleasis",
                        abbreviation: "Ele",
                        ordinal: 8,
                        days: 30,
                    },
                    {
                        name: "Eleint",
                        abbreviation: "Eli",
                        ordinal: 9,
                        days: 30,
                    },
                    {
                        name: "Highharvestide",
                        abbreviation: "Hig",
                        ordinal: 9,
                        days: 1,
                    },
                    {
                        name: "Marpenoth",
                        abbreviation: "Mar",
                        ordinal: 10,
                        days: 30,
                    },
                    {
                        name: "Uktar",
                        abbreviation: "Ukt",
                        ordinal: 11,
                        days: 30,
                    },
                    {
                        name: "Feast of the Moon",
                        abbreviation: "Fea",
                        ordinal: 11,
                        days: 1,
                    },
                    {
                        name: "Nightal",
                        abbreviation: "Nig",
                        ordinal: 12,
                        days: 30,
                    },
                ],
            },
            days: {
                values: [
                    {
                        name: "First-day",
                        abbreviation: "1d",
                        ordinal: 1,
                    },
                    {
                        name: "Second-day",
                        abbreviation: "2d",
                        ordinal: 2,
                    },
                    {
                        name: "Third-day",
                        abbreviation: "3d",
                        ordinal: 3,
                    },
                    {
                        name: "Fourth-day",
                        abbreviation: "4d",
                        ordinal: 4,
                    },
                    {
                        name: "Fifth-day",
                        abbreviation: "5d",
                        ordinal: 5,
                    },
                    {
                        name: "Sixth-day",
                        abbreviation: "6d",
                        ordinal: 6,
                    },
                    {
                        name: "Seventh-day",
                        abbreviation: "7d",
                        ordinal: 7,
                    },
                    {
                        name: "Eighth-day",
                        abbreviation: "8d",
                        ordinal: 8,
                    },
                    {
                        name: "Ninth-day",
                        abbreviation: "9d",
                        ordinal: 9,
                    },
                    {
                        name: "Tenth-day",
                        abbreviation: "10d",
                        ordinal: 10,
                    },
                ],
                daysPerYear: 365,
                hoursPerDay: 24,
                minutesPerHour: 60,
                secondsPerMinute: 60,
            },
            moons: {
                values: [
                    {
                        name: "Selûne",
                        cycleLength: 30.4375,
                        offset: 0,
                        phases: [
                            {
                                name: "New Moon",
                                length: 3.8,
                                icon: "fa-moon",
                            },
                            {
                                name: "Waxing Crescent",
                                length: 3.8,
                                icon: "fa-moon",
                            },
                            {
                                name: "First Quarter",
                                length: 3.8,
                                icon: "fa-adjust",
                            },
                            {
                                name: "Waxing Gibbous",
                                length: 3.8,
                                icon: "fa-moon",
                            },
                            {
                                name: "Full Moon",
                                length: 3.8,
                                icon: "fa-circle",
                            },
                            {
                                name: "Waning Gibbous",
                                length: 3.8,
                                icon: "fa-moon",
                            },
                            {
                                name: "Last Quarter",
                                length: 3.8,
                                icon: "fa-adjust fa-flip-horizontal",
                            },
                            {
                                name: "Waning Crescent",
                                length: 3.8,
                                icon: "fa-moon",
                            },
                        ],
                        color: "#e0e0e0",
                        firstNewMoon: {
                            year: 1,
                            month: 1,
                            day: 1,
                        },
                    },
                ],
            },
            sun: {
                values: [
                    {
                        // Hammer, Alturiak (Winter)
                        dawn: 8,
                        dusk: 16,
                        monthStart: 1,
                        monthEnd: 2
                    },
                    {
                        // Ches, Tarsakh, Mirtul (Spring)
                        dawn: 6,
                        dusk: 18,
                        monthStart: 3,
                        monthEnd: 5
                    },
                    {
                        // Kythorn, Flamerule, Eleasis (Summer)
                        dawn: 5,
                        dusk: 20,
                        monthStart: 6,
                        monthEnd: 8
                    },
                    {
                        // Eleint, Marpenoth, Uktar (Autumn)
                        dawn: 6,
                        dusk: 18,
                        monthStart: 9,
                        monthEnd: 11
                    },
                    {
                        // Nightal (Winter)
                        dawn: 8,
                        dusk: 16,
                        monthStart: 12,
                        monthEnd: 12
                    }
                ]
            },            
            seasons: {
                values: [
                    {
                        name: "Deepwinter",
                        monthStart: 1,
                        monthEnd: 1,
                    },
                    {
                        name: "The Claw of Winter",
                        monthStart: 2,
                        monthEnd: 2,
                    },
                    {
                        name: "The Claw of Sunsets",
                        monthStart: 3,
                        monthEnd: 3,
                    },
                    {
                        name: "The Claw of Storms",
                        monthStart: 4,
                        monthEnd: 4,
                    },
                    {
                        name: "The Melting",
                        monthStart: 5,
                        monthEnd: 5,
                    },
                    {
                        name: "The Time of Flowers",
                        monthStart: 6,
                        monthEnd: 6,
                    },
                    {
                        name: "Summertide",
                        monthStart: 7,
                        monthEnd: 7,
                    },
                    {
                        name: "Highsun",
                        monthStart: 8,
                        monthEnd: 8,
                    },
                    {
                        name: "The Fading",
                        monthStart: 9,
                        monthEnd: 9,
                    },
                    {
                        name: "Leaffall",
                        monthStart: 10,
                        monthEnd: 10,
                    },
                    {
                        name: "The Rotting",
                        monthStart: 11,
                        monthEnd: 11,
                    },
                    {
                        name: "The Drawing Down",
                        monthStart: 12,
                        monthEnd: 12,
                    },
                ],
            },
        };
    }

    /**
     * Get Gregorian preset in FULL CalendarData format
     */
    _getGregorianFullExample() {
        return {
            name: "Simplified Gregorian",
            id: "gregorian-preset",
            description: "The Gregorian calendar with simplified leap years.",
            years: {
                yearZero: 0,
                firstWeekday: 0,
                leapYear: { leapStart: 0, leapInterval: 4 },
            },
            months: {
                values: [
                    {
                        name: "CALENDAR.GREGORIAN.January",
                        abbreviation: "CALENDAR.GREGORIAN.JanuaryAbbr",
                        ordinal: 1,
                        days: 31,
                    },
                    {
                        name: "CALENDAR.GREGORIAN.February",
                        abbreviation: "CALENDAR.GREGORIAN.FebruaryAbbr",
                        ordinal: 2,
                        days: 28,
                        leapDays: 29,
                    },
                    {
                        name: "CALENDAR.GREGORIAN.March",
                        abbreviation: "CALENDAR.GREGORIAN.MarchAbbr",
                        ordinal: 3,
                        days: 31,
                    },
                    {
                        name: "CALENDAR.GREGORIAN.April",
                        abbreviation: "CALENDAR.GREGORIAN.AprilAbbr",
                        ordinal: 4,
                        days: 30,
                    },
                    {
                        name: "CALENDAR.GREGORIAN.May",
                        abbreviation: "CALENDAR.GREGORIAN.MayAbbr",
                        ordinal: 5,
                        days: 31,
                    },
                    {
                        name: "CALENDAR.GREGORIAN.June",
                        abbreviation: "CALENDAR.GREGORIAN.JuneAbbr",
                        ordinal: 6,
                        days: 30,
                    },
                    {
                        name: "CALENDAR.GREGORIAN.July",
                        abbreviation: "CALENDAR.GREGORIAN.JulyAbbr",
                        ordinal: 7,
                        days: 31,
                    },
                    {
                        name: "CALENDAR.GREGORIAN.August",
                        abbreviation: "CALENDAR.GREGORIAN.AugustAbbr",
                        ordinal: 8,
                        days: 31,
                    },
                    {
                        name: "CALENDAR.GREGORIAN.September",
                        abbreviation: "CALENDAR.GREGORIAN.SeptemberAbbr",
                        ordinal: 9,
                        days: 30,
                    },
                    {
                        name: "CALENDAR.GREGORIAN.October",
                        abbreviation: "CALENDAR.GREGORIAN.OctoberAbbr",
                        ordinal: 10,
                        days: 31,
                    },
                    {
                        name: "CALENDAR.GREGORIAN.November",
                        abbreviation: "CALENDAR.GREGORIAN.NovemberAbbr",
                        ordinal: 11,
                        days: 30,
                    },
                    {
                        name: "CALENDAR.GREGORIAN.December",
                        abbreviation: "CALENDAR.GREGORIAN.DecemberAbbr",
                        ordinal: 12,
                        days: 31,
                    },
                ],
            },
            days: {
                values: [
                    { name: "CALENDAR.GREGORIAN.Monday", abbreviation: "CALENDAR.GREGORIAN.MondayAbbr", ordinal: 1 },
                    { name: "CALENDAR.GREGORIAN.Tuesday", abbreviation: "CALENDAR.GREGORIAN.TuesdayAbbr", ordinal: 2 },
                    {
                        name: "CALENDAR.GREGORIAN.Wednesday",
                        abbreviation: "CALENDAR.GREGORIAN.WednesdayAbbr",
                        ordinal: 3,
                    },
                    {
                        name: "CALENDAR.GREGORIAN.Thursday",
                        abbreviation: "CALENDAR.GREGORIAN.ThursdayAbbr",
                        ordinal: 4,
                    },
                    { name: "CALENDAR.GREGORIAN.Friday", abbreviation: "CALENDAR.GREGORIAN.FridayAbbr", ordinal: 5 },
                    {
                        name: "CALENDAR.GREGORIAN.Saturday",
                        abbreviation: "CALENDAR.GREGORIAN.SaturdayAbbr",
                        ordinal: 6,
                        isRestDay: true,
                    },
                    {
                        name: "CALENDAR.GREGORIAN.Sunday",
                        abbreviation: "CALENDAR.GREGORIAN.SundayAbbr",
                        ordinal: 7,
                        isRestDay: true,
                    },
                ],
                daysPerYear: 365,
                hoursPerDay: 24,
                minutesPerHour: 60,
                secondsPerMinute: 60,
            },
            moons: {
                values: [
                    {
                        name: "Luna",
                        cycleLength: 29.53,
                        offset: 4,
                        phases: [
                            { name: "New Moon", length: 3.69, icon: "fa-moon" },
                            { name: "Waxing Crescent", length: 3.69, icon: "fa-moon" },
                            { name: "First Quarter", length: 3.69, icon: "fa-adjust" },
                            { name: "Waxing Gibbous", length: 3.69, icon: "fa-moon" },
                            { name: "Full Moon", length: 3.69, icon: "fa-circle" },
                            { name: "Waning Gibbous", length: 3.69, icon: "fa-moon" },
                            { name: "Last Quarter", length: 3.69, icon: "fa-adjust fa-flip-horizontal" },
                            { name: "Waning Crescent", length: 3.69, icon: "fa-moon" },
                        ],
                        color: "#f4f4f4",
                        firstNewMoon: { year: 0, month: 1, day: 1 },
                    },
                ],
            },
            seasons: {
                values: [
                    { name: "CALENDAR.GREGORIAN.Spring", monthStart: 3, monthEnd: 5 },
                    { name: "CALENDAR.GREGORIAN.Summer", monthStart: 6, monthEnd: 8 },
                    { name: "CALENDAR.GREGORIAN.Fall", monthStart: 9, monthEnd: 11 },
                    { name: "CALENDAR.GREGORIAN.Winter", monthStart: 12, monthEnd: 2 },
                ],
            },
        };
    }

    /** Reset to Harptos preset */
    static async #onResetDefaults(event, form) {
        const app = form.owner;
        if (!app) return;

        const confirmed = await confirmationDialog(
            `Reset calendar configuration to the Harptos preset? Unsaved changes will be lost.`,
        );
        if (!confirmed) return;

        try {
            const harptosData = this._getHarptosFullExample();
            const value = JSON.stringify(harptosData, null, 2);

            const formElement = form.element;
            if (formElement) {
                const sourceSelect = formElement.querySelector("#calendar-source");
                const textarea = formElement.querySelector("#calendar-json");
                const jsonArea = formElement.querySelector("#wgtngm-custom-json-area");

                if (sourceSelect) sourceSelect.value = "harptos";
                if (textarea) {
                    textarea.value = value;
                    textarea.disabled = true;
                    textarea.style.opacity = "0.7";
                }
                if (jsonArea) jsonArea.style.display = "block";
            }
            ui.notifications.info("Calendar preset changed to Harptos. Click 'Save Changes' to apply.");
        } catch (e) {
            console.error("Mini Calendar | Error resetting to Harptos:", e);
            ui.notifications.error("Failed to load Harptos preset.");
        }
    }
}