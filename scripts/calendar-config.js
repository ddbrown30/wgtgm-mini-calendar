import { MODULE_NAME } from "./settings.js";
import { confirmationDialog, calendarJournal,renderCalendarIfOpen } from "./helper.js";
import { setCalendarJSON } from "./main.js";
import { pf2e, harptos, gregorian, warhammer, galifar,barovia } from "./presets.js";
import { CalendarMaker } from "./calendar-maker.js"; 

var ApplicationV2 = foundry.applications.api.ApplicationV2;
var HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
const calendarForm = HandlebarsApplicationMixin(ApplicationV2);

export class CalendarConfig extends calendarForm {
    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "wgtngm-calendar-config",
        classes: ["wgtngmMiniCalenderConfig"],
        window: { 
          icon: 'fas fa-cog',
        title: "Mini Calendar Configuration",
        resizable: true 
        },
        position: { width: 600, height: "auto" },
        form: {
            handler: this.#onSubmitForm,
            closeOnSubmit: true,
            submitOnChange: false,
        },
        actions: {
            importTrigger: function() { this.element.querySelector("#wgtgm-import-file").click(); },
            importNotesTrigger: function() { this.element.querySelector("#wgtgm-import-notes-file").click(); },
            exportCalendar: this.#exportJSON,
            openMaker: this.#openMaker
        },
    };

    static PARTS = {
        form: { template: `modules/wgtgm-mini-calendar/templates/wgtgm-calendar-config.hbs`, scrollable: [".form-body"] },
        footer: { template: "templates/generic/form-footer.hbs" },
    };
    
     async _renderFrame(options) {
        const frame = await super._renderFrame(options);
        if ( !this.hasFrame ) return frame;
        const copyId = `
            <button type="button" class="header-control fa-solid fa-hat-wizard icon" data-action="openMaker" data-tooltip="Open Calendar Maker"></button>
            <button type="button" class="header-control fa-solid fa-file-import icon" data-action="importTrigger" data-tooltip="Import JSON"></button>
            <button type="button" class="header-control fa-solid fa-file-arrow-up icon" data-action="importNotesTrigger" data-tooltip="Import Notes Only"></button>
            <button type="button" class="header-control fa-solid fa-file-export icon" data-action="exportCalendar" data-tooltip="Export JSON"></button>
          `;
          this.window.close.insertAdjacentHTML("beforebegin", copyId);
        return frame;
      }

    static #openMaker() {
        this._openMaker()
    }


    _openMaker() {
        const existingApp = foundry.applications.instances.get("wgtngm-calendar-maker") 
                         || game.wgtngmMiniCalender?.wgtngmCalendarMaker;
        if (existingApp) {
             existingApp.render(true);
        } 
        else {
             const newApp = new CalendarMaker();
             if (!game.wgtngmMiniCalender) game.wgtngmMiniCalender = {}; 
             game.wgtngmMiniCalender.wgtngmCalendarMaker = newApp;
             newApp.render(true);
        }
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.buttons = [{ type: "submit", icon: "fa-solid fa-floppy-disk", label: "Save Changes" }];

        const source = game.settings.get(MODULE_NAME, "calendarSource");
        const savedCalendars = game.settings.get(MODULE_NAME, "savedCalendars") || {};

        context.calendarOptions = [
            { value: "world", label: "Default (World's Calendar)", selected: source === "world" },
            { value: "gregorian", label: "Preset: Gregorian", selected: source === "gregorian" },
            { value: "harptos", label: "Preset: Harptos", selected: source === "harptos" },
            { value: "pf2e", label: "Preset: PF2E", selected: source === "pf2e" },
            { value: "galifar", label: "Preset: Galifar", selected: source === "galifar" },
            { value: "barovia", label: "Preset: Barovia", selected: source === "barovia" },
            { value: "warhammer", label: "Preset: Warhammer", selected: source === "warhammer" },
            { value: "custom", label: "Custom (Manual JSON)", selected: source === "custom" },
        ];

        for (const [id, cal] of Object.entries(savedCalendars)) {
            context.calendarOptions.push({
                value: id,
                label: `Custom: ${cal.name || id}`,
                selected: source === id
            });
        }

        let calendarData = null;
        
        if (source === "world") calendarData = game.time.calendar.toJSON();
        else if (source === "warhammer") calendarData = warhammer();
        else if (source === "barovia") calendarData = barovia();
        else if (source === "galifar") calendarData = galifar();
        else if (source === "pf2e") calendarData = pf2e();
        else if (source === "harptos") calendarData = harptos();
        else if (source === "gregorian") calendarData = gregorian();
        else if (savedCalendars[source]) {
            calendarData = savedCalendars[source];
        } else if (source === "custom") {
             try {
                const draft = game.settings.get(MODULE_NAME, "customCalendarDraft");
                calendarData = draft ? JSON.parse(draft) : game.settings.get(MODULE_NAME, "calendarConfiguration");
            } catch(e) { calendarData = {}; }
        }

        if (!calendarData) calendarData = {};
        context.calendarJson = JSON.stringify(calendarData, null, 2);
        context.timeMultiplier = game.settings.get(MODULE_NAME, "timeMultiplier");
        
        return context;
    }

    static async #onSubmitForm(event, form, formData) {
        const source = formData.object.source;
        const calendarJsonString = formData.object.calendarJson;
        const multiplier = parseInt(formData.object.timeMultiplier) || 1;

        await game.settings.set(MODULE_NAME, "timeMultiplier", multiplier);
        await game.settings.set(MODULE_NAME, "calendarSource", source);

        const savedCalendars = game.settings.get(MODULE_NAME, "savedCalendars") || {};
        let calendarData = null;
        let calendarChanged = false;

        if (source === "world") {
            await game.settings.set(MODULE_NAME, "calendarConfiguration", {});
            calendarChanged = true;
        } else if (savedCalendars[source]) {
            try {
                calendarData = savedCalendars[source];
                const activeConfig = foundry.utils.deepClone(calendarData);
                console.log(activeConfig);
                const validationData = foundry.utils.deepClone(activeConfig);
                if (validationData.moons) delete validationData.moons;
                if (validationData.weather) delete validationData.weather;
                if (validationData.sun) delete validationData.sun;
                if (validationData.notes) delete validationData.notes;
                new foundry.data.CalendarData(validationData);
                this._validateCustomData(activeConfig);
                await game.settings.set(MODULE_NAME, "calendarConfiguration", activeConfig);
                if (calendarData.notes) {
                    await this._importPresetEvents(calendarData.notes); 
                }
                ui.notifications.info(`Applied Custom Calendar: ${calendarData.name}`);
                calendarChanged = true;
            } catch (e) {
                // console.error("Mini Calendar | Saved Calendar Validation Failed:", e);
                ui.notifications.error(`Validation Failed: ${e.message}`);
                return;
            }
        } else if (source === "custom") {
            try {
                calendarData = JSON.parse(calendarJsonString);
                const validationData = foundry.utils.deepClone(calendarData);
                if (validationData.moons) delete validationData.moons;
                if (validationData.weather) delete validationData.weather;
                if (validationData.sun) delete validationData.sun;
                if (validationData.notes) delete validationData.notes;
                new foundry.data.CalendarData(validationData);
                this._validateCustomData(calendarData);
                await game.settings.set(MODULE_NAME, "calendarConfiguration", calendarData);
                await game.settings.set(MODULE_NAME, "customCalendarDraft", calendarJsonString);
                if (calendarData.notes) {
                   await this._importPresetEvents(calendarData.notes);
                }
                calendarChanged = true;
                ui.notifications.info("Custom Calendar Saved Successfully.");
             } catch(e) { 
                 // console.error("Mini Calendar | Validation Failed:", e);
                 if (e instanceof SyntaxError) {
                    ui.notifications.error("Invalid JSON Syntax. Please check your formatting.");
                 } else {
                    ui.notifications.error(`Validation Failed: ${e.message}`);
                 }
                 return; 
             }
        } else {
             if (source === "warhammer") calendarData = warhammer();
             else if (source === "barovia") calendarData = barovia();
             else if (source === "galifar") calendarData = galifar();
             else if (source === "pf2e") calendarData = pf2e();
             else if (source === "harptos") calendarData = harptos();
             else if (source === "gregorian") calendarData = gregorian();
             
             await game.settings.set(MODULE_NAME, "calendarConfiguration", calendarData);
             if (calendarData.notes) {
                 await this._importPresetEvents(calendarData.notes);
             }
             calendarChanged = true;
        }

        setCalendarJSON();
        if (calendarChanged) {
            foundry.applications.settings.SettingsConfig.reloadConfirm({ world: true });
        }
        Hooks.callAll("closeCalendarConfig");
    }
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

/**
     * Manually validates custom fields that Foundry's CalendarData ignores or rejects.
     * @param {object} data - The full calendar configuration object
     * @throws {Error} - If validation fails
     */
    _validateCustomData(data) {
        if (data.seasons?.values) {
            const validOrdinals = data.months.values.map(m => m.ordinal);
            data.seasons.values.forEach((s, i) => {
                if (typeof s.monthStart !== "number" || typeof s.monthEnd !== "number") {
                    throw new Error(`Season ${i} (${s.name}) is missing 'monthStart' or 'monthEnd'.`);
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
                if (!m.name) throw new Error(`Moon ${i} is missing a name.`);
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
                if (typeof s.dawn !== "number" || typeof s.dusk !== "number") {
                    throw new Error(`Sun config entry ${i} has invalid dawn/dusk values.`);
                }
                if (s.dawn >= s.dusk) {
                    console.warn(`Mini Calendar | Sun config ${i}: Dawn is after Dusk. This might be intentional (polar night), but is unusual.`);
                }
            });
        }

        if (data.weather?.values) {
             data.weather.values.forEach((w, i) => {
                if (typeof w.tempOffset !== "number") {
                    throw new Error(`Weather entry ${i} (${w.name}) has an invalid tempOffset.`);
                }
             });
        }
    }



    _getButtons() {
        return [
            {
                type: "submit",
                icon: "fa-solid fa-floppy-disk",
                label: "Save Changes",
            },
        ];
    }



   /**
     * Helper to import preset notes (both recurring and single) into the journal.
     */
    async _importPresetEvents(notes) {
        if (!notes || !notes.length) return;

        let journal = game.journal.getName(calendarJournal);
        if (!journal) {
            journal = await JournalEntry.create({ name: calendarJournal });
        }
        const recurring = notes.filter(n => n.repeatUnit && n.repeatUnit !== 'none');
        const single = notes.filter(n => !n.repeatUnit || n.repeatUnit === 'none');

        let importCount = 0;

        if (recurring.length) {
            const recPageName = "0000-Recurring";
            let recPage = journal.pages.getName(recPageName);

            let existingNotes = recPage?.flags?.[MODULE_NAME]?.notes || [];
            let dirty = false;

            for (const note of recurring) {
                const incomingDate = note.date || note.startDate;

                const exists = existingNotes.find(en => {
                    if (en.id && note.id) {
                        return en.id === note.id;
                    }
                    return en.isPreset &&
                        en.title === note.title &&
                        en.startDate?.year === incomingDate?.year &&
                        en.startDate?.month === incomingDate?.month &&
                        en.startDate?.day === incomingDate?.day;
                });

                if (!exists) {
                    const newNote = {
                        id: note.id || foundry.utils.randomID(),
                        ...note,
                        startDate: incomingDate,
                        isPreset: true
                    };
                    if (newNote.date) delete newNote.date;
                    existingNotes.push(newNote);
                    dirty = true;
                    importCount++;
                }
            }

            if (dirty) {
                let recHtml = "<h1>Recurring Events Index</h1>";
                existingNotes.forEach(n => {
                    recHtml += `<p><strong>${n.title}</strong> (${n.repeatUnit})</p>`;
                });

                const pageData = {
                    "text.content": recHtml,
                    flags: { [MODULE_NAME]: { notes: existingNotes } }
                };

                if (recPage) {
                    await recPage.update(pageData);
                } else {
                    await journal.createEmbeddedDocuments("JournalEntryPage", [{
                        name: recPageName,
                        "text.format": CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML,
                        ...pageData
                    }]);
                }
            }
        }

        if (single.length) {
            const notesByDate = {};

            for (const note of single) {
                const dateObj = note.date || note.startDate;
                if (!dateObj) continue;
                const day = dateObj.day + 1;
                const pageName = `${dateObj.year}-${String(dateObj.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                if (!notesByDate[pageName]) notesByDate[pageName] = [];

                notesByDate[pageName].push({
                    id: note.id || foundry.utils.randomID(),
                    ...note,
                    startDate: dateObj,
                    isPreset: true
                });
            }

            for (const [pageName, dayNotes] of Object.entries(notesByDate)) {
                let page = journal.pages.getName(pageName);
                let existingNotes = page?.flags?.[MODULE_NAME]?.notes || [];
                let dirty = false;

                for (const newNote of dayNotes) {
                    // Check for duplicate preset
                    const exists = existingNotes.find(en => {
                        if (en.id && newNote.id) return en.id === newNote.id;
                        return en.isPreset && en.title === newNote.title
                    });
                    if (!exists) {
                        if (newNote.date) delete newNote.date;
                        existingNotes.push(newNote);
                        dirty = true;
                        importCount++;
                    }
                }

                if (dirty) {
                    let htmlContent = "";
                    for (const note of existingNotes) {
                        htmlContent += `<h2><i class="${note.icon}"></i> ${note.title}</h2><p>${note.content}</p><hr>`;
                    }

                    const pageData = {
                        "text.content": htmlContent,
                        flags: { [MODULE_NAME]: { notes: existingNotes } }
                    };

                    if (page) {
                        await page.update(pageData);
                    } else {
                        await journal.createEmbeddedDocuments("JournalEntryPage", [{
                            name: pageName,
                            "text.format": CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML,
                            ...pageData
                        }]);
                    }
                }
            }
        }

        if (importCount > 0) {
            console.log(`Mini Calendar | Imported ${importCount} preset events.`);
        }
    }
    static #exportJSON() {
        const data = game.settings.get(MODULE_NAME, "customCalendarDraft");
        const filename = `mini-calendar-export.json`;
        foundry.utils.saveDataToFile(data, "text/json", filename);
        ui.notifications.info("Mini Calendar: Exported successfully.");
    }

    async _handleNotesFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonString = e.target.result;
                const json = JSON.parse(jsonString);
                let notes = [];
                if (Array.isArray(json)) {
                    notes = json;
                } 
                else if (json.notes && Array.isArray(json.notes)) {
                    notes = json.notes;
                }

                if (notes.length > 0) {
                    await this._importPresetEvents(notes);
                    ui.notifications.info(`Successfully imported ${notes.length} notes.`);
                    renderCalendarIfOpen();

                } else {
                    ui.notifications.warn("No notes found in the selected file.");
                }

            } catch (err) {
                console.error("Mini Calendar | Import Notes Error:", err);
                ui.notifications.error("Failed to parse JSON file.");
            }
            event.target.value = ""; 
        };
        reader.readAsText(file);
    }


    async _handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonString = e.target.result;
                const json = JSON.parse(jsonString);

                if (json) {
                    const formattedJson = JSON.stringify(json, null, 2);
                    await game.settings.set(MODULE_NAME, "customCalendarDraft", formattedJson);
                    await game.settings.set(MODULE_NAME, "calendarSource", "custom");
                    ui.notifications.info("Calendar JSON imported. Review settings and click 'Save Changes'.");
                    this.render();
                }

            } catch (err) {
                console.error("Mini Calendar | Import Error:", err);
                ui.notifications.error("Failed to parse JSON file.");
            }
            event.target.value = "";
        };
        reader.readAsText(file);
    }

    /** @override */
    async _onRender(context, options) {
        await super._onRender(context, options);
        const fileInput = this.element.querySelector("#wgtgm-import-file");
        if (fileInput) {
            fileInput.addEventListener("change", (event) => this._handleFileSelect(event));
        }
        const notesFileInput = this.element.querySelector("#wgtgm-import-notes-file");
        if (notesFileInput) {
            notesFileInput.addEventListener("change", (event) => this._handleNotesFileSelect(event));
        }
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

}