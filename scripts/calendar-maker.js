import { MODULE_NAME } from "./settings.js";
import { PIN_TYPES, confirmationDialog } from "./helper.js";


const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;


export class CalendarMaker extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "wgtngm-calendar-maker",
        classes: ["wgtngmMiniCalenderMaker"],
        window: {
            title: "Calendar Maker",
            icon: 'fas fa-hat-wizard',
            resizable: true
        },
        position: { width: 800, height: 750 },
        form: {
            handler: this.#onSubmitForm,
            closeOnSubmit: false,
            submitOnChange: false,
        },
        actions: {
            importCalendar: function () { this.element.querySelector("#wgtgm-maker-import-file").click(); },
            addMonth: function () {
                this._modifyCollection('months.values', (arr) => {
                    const last = arr[arr.length - 1];
                    arr.push({ name: "New Month", abbreviation: "NM", ordinal: last ? last.ordinal + 1 : 1, days: 30, intercalary: false });
                })
            },
            removeMonth: function (e, t) { this._modifyCollection('months.values', (arr) => arr.splice(t.dataset.index, 1)); },
            addDay: function () {
                this._modifyCollection('days.values', (arr) => {
                    const last = arr[arr.length - 1];
                    arr.push({ name: "New Day", abbreviation: "Nd", ordinal: last ? last.ordinal + 1 : 1 });
                })
            },
            removeDay: function (e, t) { this._modifyCollection('days.values', (arr) => arr.splice(t.dataset.index, 1)); },
            addSeason: function () {
                this._modifyCollection('seasons.values', (arr) => {
                    arr.push({ name: "New Season", monthStart: 1, monthEnd: 1, included: true });
                })
            },
            removeSeason: function (e, t) { this._modifyCollection('seasons.values', (arr) => arr.splice(t.dataset.index, 1)); },
            addSun: function () {
                this._modifyCollection('sun.values', (arr) => {
                    arr.push({ dawn: 6, dusk: 18, monthStart: 1, monthEnd: 1, included: true });
                })
            },
            removeSun: function (e, t) { this._modifyCollection('sun.values', (arr) => arr.splice(t.dataset.index, 1)); },
            addWeather: function () {
                this._modifyCollection('weather.values', (arr) => {
                    arr.push({ name: "Winter", monthStart: 1, monthEnd: 1, tempOffset: 0, included: true });
                })
            },
            removeWeather: function (e, t) { this._modifyCollection('weather.values', (arr) => arr.splice(t.dataset.index, 1)); },
            addMoon: function () {
                this._modifyCollection('moons.values', (arr) => {
                    arr.push({
                        name: "Luna", cycleLength: 29.5, offset: 0, color: "#e0e0e0",
                        firstNewMoon: { year: 0, month: 1, day: 1 },
                        phases: this._getDefaultPhases()
                    });
                })
            },
            removeMoon: function (e, t) { this._modifyCollection('moons.values', (arr) => arr.splice(t.dataset.index, 1)); },
            addNote: function () {
                this._modifyCollection('notes', (arr) => {
                    arr.push({ title: "New Event", content: "", icon: "", date: { year: 1, month: 0, day: 0 }, repeatUnit: "none", isPreset: true, playerVisible: false });
                })
            },
            removeNote: function (e, t) { this._modifyCollection('notes', (arr) => arr.splice(t.dataset.index, 1)); },
            exportCalendar: this.#exportSavedCalendar,
            loadCalendar: this.#loadCalendar,
            deleteCalendar: this.#deleteCalendar,
            createNew: this.#createNew,
        },
    };


    static PARTS = {
        tabs: {
            template: "modules/wgtgm-mini-calendar/templates/calendar-maker-nav.hbs",
        },
        sidebar: { template: "modules/wgtgm-mini-calendar/templates/calendar-maker-sidebar.hbs" },

        general: {
            template: `modules/wgtgm-mini-calendar/templates/calendar-maker-general.hbs`,
            scrollable: ["", ".scrollable", ".editor-main"],
        },
        months: {
            template: `modules/wgtgm-mini-calendar/templates/calendar-maker-months.hbs`,
            scrollable: ["", ".scrollable", ".editor-main"],
        },
        weekdays: {
            template: `modules/wgtgm-mini-calendar/templates/calendar-maker-weekdays.hbs`,
            scrollable: ["", ".scrollable", ".editor-main"],
        },
        events: {
            template: `modules/wgtgm-mini-calendar/templates/calendar-maker-events.hbs`,
            scrollable: ["", ".scrollable", ".editor-main"],
        },
        seasons: {
            template: `modules/wgtgm-mini-calendar/templates/calendar-maker-seasons.hbs`,
            scrollable: ["", ".scrollable", ".editor-main"],
        },
        sun: {
            template: `modules/wgtgm-mini-calendar/templates/calendar-maker-sun.hbs`,
            scrollable: ["", ".scrollable", ".editor-main"],
        },
        weather: {
            template: `modules/wgtgm-mini-calendar/templates/calendar-maker-weather.hbs`,
            scrollable: ["", ".scrollable", ".editor-main"],
        },
        moons: {
            template: `modules/wgtgm-mini-calendar/templates/calendar-maker-moons.hbs`,
            scrollable: ["", ".scrollable", ".editor-main"],
        },
        footer: {
            template: "templates/generic/form-footer.hbs",
        },
    };

    static TABS = {
        sheet: {
            tabs: [
                { id: "general", type: "general", label: "General", icon: "fas fa-info-circle" },
                { id: "months", type: "months", label: "Months", icon: "fas fa-calendar-alt" },
                { id: "weekdays", type: "weekdays", label: "Weekdays", icon: "fas fa-calendar-day" },
                { id: "events", type: "events", label: "Events", icon: "fas fa-star" },
                { id: "seasons", type: "seasons", label: "Seasons", icon: "fas fa-leaf" },
                { id: "sun", type: "sun", label: "Sun", icon: "fas fa-sun" },
                { id: "weather", type: "weather", label: "Weather", icon: "fas fa-cloud-sun" },
                { id: "moons", type: "moons", label: "Moons", icon: "fas fa-moon" }
            ],
            initial: "general",
        }
    };

    #workingConfig = null;

    /** @override */
    async _onRender(context, options) {
        await super._onRender(context, options);
        this._activateListeners(this.element);
    }

    /** @override */
    _activateListeners(html) {
        if (!html) return;
        html.onchange = (event) => {
            event.stopPropagation();
            this._captureFormState();
        };
        const fileInput = html.querySelector("#wgtgm-maker-import-file");
        if (fileInput) {
            fileInput.onchange = (event) => this.#handleImportFile(event);
        }
        const iconInputs = html.querySelectorAll(".wgtgm-icon-picker");
        iconInputs.forEach(input => {
            input.addEventListener("input", (event) => {
                const val = event.target.value;
                const container = event.target.closest(".icon-container");
                const preview = container?.querySelector(".icon-preview");
                if (preview) {
                    preview.className = `icon-preview ${val}`;
                }
            });
        });

    }

    _getDefaultPhases() {
        return [
            { name: "New Moon", display: "New Moon", length: 3.6, icon: "fa-moon", included: true },
            { name: "Waxing Crescent", display: "Waxing Crescent", length: 3.6, icon: "fa-moon", included: true },
            { name: "First Quarter", display: "First Quarter", length: 3.6, icon: "fa-adjust", included: true },
            { name: "Waxing Gibbous", display: "Waxing Gibbous", length: 3.6, icon: "fa-moon", included: true },
            { name: "Full Moon", display: "Full Moon", length: 3.6, icon: "fa-circle", included: true },
            { name: "Waning Gibbous", display: "Waning Gibbous", length: 3.6, icon: "fa-moon", included: true },
            { name: "Last Quarter", display: "Last Quarter", length: 3.6, icon: "fa-adjust fa-flip-horizontal", included: true },
            { name: "Waning Crescent", display: "Waning Crescent", length: 3.6, icon: "fa-moon", included: true }
        ];
    }

    _createEmptyConfig() {
        return {
            name: "New Custom Calendar",
            id: "custom-" + Date.now(),
            description: "",
            years: { yearZero: 0, firstWeekday: 0, resetWeekdays: false, leapYear: { leapStart: 0, leapInterval: 4 } },
            months: { values: [] },
            days: { values: [], daysPerYear: 0, hoursPerDay: 24, minutesPerHour: 60, secondsPerMinute: 60 },
            seasons: { values: [] },
            moons: { values: [] },
            weather: { values: [] },
            notes: [],
            sun: { values: [] }
        };
    }

    async #handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);

                // Merge into a clean config
                this.#workingConfig = foundry.utils.mergeObject(this._createEmptyConfig(), json);

                // Force Arrays
                if (this.#workingConfig.months && !Array.isArray(this.#workingConfig.months.values)) {
                    this.#workingConfig.months.values = Object.values(this.#workingConfig.months.values);
                }

                // Normalize Import (Ensure Included flags)
                this._normalizeData(this.#workingConfig);

                this.render();
                ui.notifications.info(`Imported "${this.#workingConfig.name}" into editor.`);
            } catch (err) {
                console.error(err);
                ui.notifications.error("Import Failed: Invalid JSON file.");
            }
        };
        reader.readAsText(file);
    }

    _modifyCollection(path, callback) {
        this._captureFormState();
        const parts = path.split('.');
        let target = this.#workingConfig;

        for (let i = 0; i < parts.length - 1; i++) {
            if (!target[parts[i]]) target[parts[i]] = {};
            target = target[parts[i]];
        }

        const key = parts[parts.length - 1];
        if (!Array.isArray(target[key])) {
            target[key] = target[key] ? Object.values(target[key]) : [];
        }

        callback(target[key]);
        this.render();
    }

    _normalizeData(config) {
        const ensureIncluded = (arr) => {
            if (!Array.isArray(arr)) return;
            arr.forEach(item => {
                if (item.included === undefined) item.included = true;
            });
        };

        if (config.seasons?.values) ensureIncluded(config.seasons.values);
        if (config.weather?.values) ensureIncluded(config.weather.values);
        if (config.sun?.values) ensureIncluded(config.sun.values);
        if (config.moons?.values) {
            config.moons.values.forEach(m => {
                if (m.phases) ensureIncluded(m.phases);
            });
        }
    }

    _cleanData(config) {
        const clean = foundry.utils.deepClone(config);

        if (clean.months?.values) {
            clean.months.values.forEach(m => {
                if (m.leapDays === 0) delete m.leapDays;
            });
        }

        const cleanCollection = (arr) => {
            if (!Array.isArray(arr)) return [];
            const active = arr.filter(i => i.included !== false);
            active.forEach(i => delete i.included);
            return active;
        };

        if (clean.seasons) clean.seasons.values = cleanCollection(clean.seasons.values);
        if (clean.weather) clean.weather.values = cleanCollection(clean.weather.values);
        if (clean.sun) clean.sun.values = cleanCollection(clean.sun.values);

        if (clean.moons?.values) {
            clean.moons.values.forEach(m => {
                if (m.phases) m.phases = cleanCollection(m.phases);
            });
        }

        return clean;
    }

    _captureFormState() {
        if (!this.element) return;
        const formData = new foundry.applications.ux.FormDataExtended(this.element).object;

        this.#workingConfig = foundry.utils.mergeObject(this.#workingConfig, formData);

        // Include 'sun.values' here now
        const arrayPaths = [
            'months.values', 'days.values', 'seasons.values',
            'weather.values', 'moons.values', 'notes', 'sun.values'
        ];

        for (const path of arrayPaths) {
            const parts = path.split('.');
            let target = this.#workingConfig;
            let valid = true;

            for (let i = 0; i < parts.length - 1; i++) {
                if (target[parts[i]]) target = target[parts[i]];
                else { valid = false; break; }
            }

            if (valid) {
                const key = parts[parts.length - 1];
                // Ensure it is an array
                if (target[key] && !Array.isArray(target[key])) {
                    // Sort by key if they are numeric indices to preserve order
                    const keys = Object.keys(target[key]).sort((a, b) => parseInt(a) - parseInt(b));
                    target[key] = keys.map(k => target[key][k]);
                }
                // Fallback: If it became null/undefined, make it empty array
                if (!target[key]) target[key] = [];
            }
        }

        // Nested Arrays
        if (this.#workingConfig.moons?.values && Array.isArray(this.#workingConfig.moons.values)) {
            this.#workingConfig.moons.values.forEach(moon => {
                if (moon.phases && !Array.isArray(moon.phases)) {
                    moon.phases = Object.values(moon.phases);
                }
            });
        }

        // Numeric Enforcement
        if (this.#workingConfig.months?.values) {
            this.#workingConfig.months.values.forEach(m => {
                m.ordinal = parseInt(m.ordinal) || 0;
                m.days = parseInt(m.days) || 0;
                m.leapDays = parseInt(m.leapDays) || 0;
            });
        }
        if (this.#workingConfig.seasons?.values) {
            this.#workingConfig.seasons.values.forEach(s => {
                s.monthStart = parseInt(s.monthStart) || 1;
                s.monthEnd = parseInt(s.monthEnd) || 1;
            });
        }
        if (this.#workingConfig.sun?.values) {
            this.#workingConfig.sun.values.forEach(s => {
                s.monthStart = parseInt(s.monthStart) || 1;
                s.monthEnd = parseInt(s.monthEnd) || 1;
                s.dawn = parseInt(s.dawn) || 0;
                s.dusk = parseInt(s.dusk) || 0;
            });
        }
        if (this.#workingConfig.weather?.values) {
            this.#workingConfig.weather.values.forEach(w => {
                w.monthStart = parseInt(w.monthStart) || 1;
                w.monthEnd = parseInt(w.monthEnd) || 1;
                w.tempOffset = parseInt(w.tempOffset) || 0;
            });
        }
        if (this.#workingConfig.moons?.values) {
            this.#workingConfig.moons.values.forEach(m => {
                m.cycleLength = parseFloat(m.cycleLength) || 0;
                m.offset = parseFloat(m.offset) || 0;
                if (m.firstNewMoon) {
                    m.firstNewMoon.year = parseInt(m.firstNewMoon.year) || 0;
                    m.firstNewMoon.month = parseInt(m.firstNewMoon.month) || 0;
                    m.firstNewMoon.day = parseInt(m.firstNewMoon.day) || 0;
                }
                if (m.phases) {
                    m.phases.forEach(p => p.length = parseFloat(p.length) || 0);
                }
            });
        }
        if (this.#workingConfig.notes) {
            this.#workingConfig.notes.forEach(n => {
                if (!n.icon) {
                    n.icon = "fas fa-star";
                }
                if (n.date) {
                    n.date.year = parseInt(n.date.year) || 0;
                    n.date.month = parseInt(n.date.month) || 0;
                    n.date.day = parseInt(n.date.day) || 0;
                }
            });
        }

        if (this.#workingConfig.months?.values && Array.isArray(this.#workingConfig.months.values)) {
            const totalDays = this.#workingConfig.months.values.reduce((sum, m) => sum + (parseInt(m.days) || 0), 0);
            if (!this.#workingConfig.days) this.#workingConfig.days = {};
            this.#workingConfig.days.daysPerYear = totalDays;
        }
    }

    /** @inheritDoc */
    changeTab(tab, group, options) {
        super.changeTab(tab, group, options);
    }

    async _preparePartContext(partId, context, options) {
        // context = await super._preparePartContext(partId, context, options);
        if (partId in context.tabs) context.tab = context.tabs[partId];
        context.pinTypes = PIN_TYPES;

        const savedCalendars = game.settings.get(MODULE_NAME, "savedCalendars") || {};
        context.savedList = Object.values(savedCalendars).map(c => ({ id: c.id, name: c.name }));

        if (!this.#workingConfig) {
            this.#workingConfig = this._createEmptyConfig();
        }

        const config = this.#workingConfig;

        if (!Array.isArray(config.months?.values)) config.months = { values: [] };
        if (!Array.isArray(config.seasons?.values)) config.seasons = { values: [] };
        if (!Array.isArray(config.weather?.values)) config.weather = { values: [] };
        if (!Array.isArray(config.sun?.values)) config.sun = { values: [] };

        config.days.daysPerYear = config.months.values.reduce((sum, m) => sum + (m.days || 0), 0);

        const uniqueOrdinals = [];
        const seenOrd = new Set();
        config.months.values.forEach(m => {
            const ord = parseInt(m.ordinal) || 0;
            if (!seenOrd.has(ord)) {
                seenOrd.add(ord);
                uniqueOrdinals.push({ ordinal: ord, displayName: `${m.name} (Ord ${ord})` });
            }
        });
        uniqueOrdinals.sort((a, b) => a.ordinal - b.ordinal);
        uniqueOrdinals.sort((a, b) => a.ordinal - b.ordinal);
        context.uniqueMonthOrdinals = uniqueOrdinals;

        context.allMonths = config.months.values.map((m, i) => ({
            name: m.name,
            index: i,
            ordinal: m.ordinal,
            displayName: `${m.name} (Idx ${i})`
        }));

        const seasonCheck = this._checkOverlaps(config.months.values, config.seasons.values);
        context.seasonErrors = seasonCheck.errors;
        context.seasons = config.seasons.values.map((s, i) => ({ ...s, index: i, isOverlapping: seasonCheck.badIndices.has(i) }));

        const weatherCheck = this._checkOverlaps(config.months.values, config.weather.values);
        context.weatherErrors = weatherCheck.errors;
        context.weather = config.weather.values.map((w, i) => ({ ...w, index: i, isOverlapping: weatherCheck.badIndices.has(i) }));

        const sunCheck = this._checkOverlaps(config.months.values, config.sun.values, 'dawn'); // Use dawn as dummy name if name missing
        context.sunErrors = sunCheck.errors;
        context.sun = config.sun.values.map((s, i) => ({ ...s, index: i, isOverlapping: sunCheck.badIndices.has(i) }));

        context.months = config.months.values.map((m, i) => ({
            ...m, index: i,
            seasonClass: this._getVisualClass(m.ordinal, config.seasons.values),
            weatherClass: this._getVisualClass(m.ordinal, config.weather.values),
            sunClass: this._getVisualClass(m.ordinal, config.sun.values)
        }));

        context.weatherTypes = ["Spring", "Summer", "Autumn", "Winter"];

        context.days = (config.days?.values || []).map((d, i) => ({ ...d, index: i }));
        context.notes = (config.notes || []).map((n, i) => ({ ...n, index: i }));
        context.moons = (config.moons?.values || []).map((m, i) => ({ ...m, index: i }));

        context.config = config;
        context.buttons = [
            { type: "button", action: "createNew", icon: "fa-solid fa-calendar-plus", label: "New" },
            { type: "button", action: "importCalendar", icon: "fa-solid fa-file-import", label: "Import" },
            { type: "submit", icon: "fa-solid fa-floppy-disk", label: "Save" },
            { type: "close", action: "close", icon: "fa-solid fa-circle-x", label: "Close" },
        ];


        return context;
    }
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const tabs = this._prepareTabs("sheet");

        return context;
    }

    _checkOverlaps(months, items, nameKey = 'name') {
        if (!items || !months) return { errors: [], badIndices: new Set() };
        if (!Array.isArray(items)) items = Object.values(items);
        if (!Array.isArray(months)) months = Object.values(months);

        const allOrdinals = months.map(m => parseInt(m.ordinal) || 0);
        const maxOrdinal = Math.max(0, ...allOrdinals);
        const occupied = new Map();
        const overlaps = [];
        const badIndices = new Set();

        items.forEach((item, index) => {
            if (item.included === false) return;
            let current = parseInt(item.monthStart);
            const end = parseInt(item.monthEnd);

            const name = item[nameKey] || `Config #${index + 1}`;

            let steps = 0;
            const maxSteps = maxOrdinal + 12;
            while (steps < maxSteps) {
                if (allOrdinals.includes(current)) {
                    if (occupied.has(current)) {
                        const otherName = occupied.get(current);
                        if (otherName !== name) {
                            overlaps.push(`${name} overlaps with ${otherName} at Month Ordinal ${current}`);
                            badIndices.add(index);
                        }
                    } else occupied.set(current, name);
                }
                if (current === end) break;
                current++;
                if (current > maxOrdinal) current = 1;
                steps++;
            }
        });
        return { errors: [...new Set(overlaps)], badIndices };
    }

    _getVisualClass(monthOrd, items) {
        if (!items) return 'seg-empty';
        if (!Array.isArray(items)) items = Object.values(items);
        let count = 0;
        items.forEach(item => {
            if (item.included === false) return;
            const start = parseInt(item.monthStart);
            const end = parseInt(item.monthEnd);
            let inRange = (start <= end) ? (monthOrd >= start && monthOrd <= end) : (monthOrd >= start || monthOrd <= end);
            if (inRange) count++;
        });
        if (count === 0) return 'seg-empty';
        if (count === 1) return 'seg-ok';
        return 'seg-conflict';
    }

    /**
     * Validates the calendar configuration before saving.
     * Checks for empty required fields and runs specific data validation.
     * @param {object} data - The calendar configuration object.
     * @throws {Error} - If validation fails.
     */
    _validateData(data) {
        if (!data.months?.values || data.months.values.length === 0) {
            throw new Error("Calendar must have at least one month.");
        }
        const totalDays = data.months.values.reduce((acc, m) => acc + (parseInt(m.days) || 0), 0);
        if (totalDays <= 0) {
            throw new Error("Calendar must have a total positive number of days.");
        }
        if (!data.days) throw new Error("Calendar configuration is missing 'days' object.");


        const requiredTime = ["hoursPerDay", "minutesPerHour", "secondsPerMinute"];
        requiredTime.forEach(field => {
            const val = parseInt(data.days[field]);
            if (isNaN(val) || val <= 0) {
                throw new Error(`Invalid Time Configuration: '${field}' must be a positive integer (found: ${data.days[field]}).`);
            }
        });
        if (data.seasons?.values) {
            const validOrdinals = data.months.values.map(m => m.ordinal);
            data.seasons.values.forEach((s, i) => {
                if (s.included === false) return;
                if (typeof s.monthStart !== "number" || typeof s.monthEnd !== "number") {
                    throw new Error(`Season "${s.name || i}" is missing 'monthStart' or 'monthEnd'.`);
                }
                const startValid = validOrdinals.includes(s.monthStart);
                const endValid = validOrdinals.includes(s.monthEnd);

                if (!startValid || !endValid) {
                    throw new Error(`Season "${s.name}" references invalid month ordinals (${s.monthStart}-${s.monthEnd}). Check your Month configuration.`);
                }
            });
        }

        if (data.moons?.values) {
            data.moons.values.forEach((m, i) => {
                if (m.included === false) return;
                if (!m.name) throw new Error(`Moon #${i + 1} is missing a name.`);
                if (typeof m.cycleLength !== "number" || m.cycleLength <= 0) {
                    throw new Error(`Moon "${m.name}" has an invalid cycle length.`);
                }
                if (!m.firstNewMoon || typeof m.firstNewMoon.year !== "number" || typeof m.firstNewMoon.month !== "number" || typeof m.firstNewMoon.day !== "number") {
                    throw new Error(`Moon "${m.name}" has an invalid 'firstNewMoon' definition.`);
                }
            });
        }

        if (data.sun?.values) {
            data.sun.values.forEach((s, i) => {
                if (s.included === false) return;
                if (typeof s.dawn !== "number" || typeof s.dusk !== "number") {
                    throw new Error(`Sun config entry #${i + 1} has invalid dawn/dusk values.`);
                }
                if (s.dawn >= s.dusk) {
                    console.warn(`Mini Calendar | Sun config ${i}: Dawn is after Dusk.`);
                }
            });
        }

        if (data.weather?.values) {
            data.weather.values.forEach((w, i) => {
                if (w.included === false) return;
                if (typeof w.tempOffset !== "number") {
                    throw new Error(`Weather entry "${w.name || i}" has an invalid tempOffset.`);
                }
            });
        }
    }



    static async #onSubmitForm(event, form, formData) {
        this._captureFormState();
        const config = this._cleanData(this.#workingConfig);
        try {
            this._validateData(config);
        } catch (e) {
            ui.notifications.error(`Cannot Save: ${e.message}`);
            return;
        }
        const seasonCheck = this._checkOverlaps(config.months.values, config.seasons.values);
        const weatherCheck = this._checkOverlaps(config.months.values, config.weather.values);
        const sunCheck = this._checkOverlaps(config.months.values, config.sun.values, 'dawn');

        if (seasonCheck.errors.length > 0) {
            ui.notifications.error("Cannot Save: Seasons have overlaps. Please fix them.");
            return;
        }
        if (weatherCheck.errors.length > 0) {
            ui.notifications.error("Cannot Save: Weather has overlaps. Please fix them.");
            return;
        }
        if (sunCheck.errors.length > 0) {
            ui.notifications.error("Cannot Save: Sun Configuration has overlaps. Please fix them.");
            return;
        }
        if (!config.name || !config.id) {
            ui.notifications.error("Calendar Name and ID are required.");
            return;
        }
        const savedCalendars = game.settings.get(MODULE_NAME, "savedCalendars") || {};

        const existingById = savedCalendars[config.id];
        const existingByName = Object.values(savedCalendars).find(c => c.name === config.name && c.id !== config.id);

        if (existingById) {
            const confirm = await confirmationDialog(`A calendar with this ID (${config.name}) already exists. Overwrite it?`);
            if (!confirm) return;
        } else if (existingByName) {
            const confirm = await confirmationDialog(`A calendar named "${config.name}" already exists (ID: ${existingByName.id}). Do you want to save this as a new calendar with the same name?`);
            if (!confirm) return;
        }

        savedCalendars[config.id] = config;

        await game.settings.set(MODULE_NAME, "savedCalendars", savedCalendars);
        ui.notifications.info(`Calendar "${config.name}" saved! Go to Calendar Configuration to apply it.`);
        if (foundry.applications.instances.get("wgtngm-calendar-config")) await foundry.applications.instances.get("wgtngm-calendar-config").render();
        this.render();
    }

    static async #loadCalendar(event, target) {
        const id = target.dataset.id;
        const savedCalendars = game.settings.get(MODULE_NAME, "savedCalendars") || {};
        if (savedCalendars[id]) {
            this.#workingConfig = foundry.utils.deepClone(savedCalendars[id]);
            this._normalizeData(this.#workingConfig);
            this.render();
            ui.notifications.info(`Loaded "${this.#workingConfig.name}" for editing.`);
        }
    }

    static #exportSavedCalendar(event, target) {
        const id = target.dataset.id;
        const savedCalendars = game.settings.get(MODULE_NAME, "savedCalendars") || {};
        const data = savedCalendars[id];

        if (data) {
            const filename = `${data.id || "calendar"}.json`;
            foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), "text/json", filename);
            ui.notifications.info(`Exported "${data.name}" to ${filename}`);
        }
    }

    static async #deleteCalendar(event, target) {
        const id = target.dataset.id;
        const savedCalendars = game.settings.get(MODULE_NAME, "savedCalendars") || {};
        if (savedCalendars[id]) {
            const confirm = await foundry.applications.api.DialogV2.confirm({
                content: `Are you sure you want to delete "${savedCalendars[id].name}"?`
            });
            if (confirm) {
                delete savedCalendars[id];
                await game.settings.set(MODULE_NAME, "savedCalendars", savedCalendars);
                if (this.#workingConfig.id === id) {
                    this.#workingConfig = this._createEmptyConfig();
                }
                if (foundry.applications.instances.get("wgtngm-calendar-config")) foundry.applications.instances.get("wgtngm-calendar-config").render();
                this.render();
            }
        }
    }



    static #createNew() {
        this.#workingConfig = this._createEmptyConfig();
        this.render();
    }
}