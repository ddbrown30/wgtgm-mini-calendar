import { MODULE_NAME } from "./settings.js";
import { confirmationDialog, calendarJournal } from "./helper.js";
import { setCalendarJSON } from "./main.js";
import { pf2e, harptos, gregorian, warhammer, galifar } from "./presets.js";

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
            importTrigger: function(event, target) {
                this.element.querySelector("#wgtgm-import-file").click();
                },
            importNotesTrigger: function(event, target) {
                this.element.querySelector("#wgtgm-import-notes-file").click();
            },
            exportCalendar: this.#exportJSON
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

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    if ( !this.hasFrame ) return frame;
    const copyId = `
        <button type="button" class="header-control fa-solid fa-file-import icon" data-action="importTrigger"
                data-tooltip="Import calendar JSON" aria-label="Import calendar from JSON"></button>
        <button type="button" class="header-control fa-solid fa-file-arrow-up icon" data-action="importNotesTrigger"
                    data-tooltip="Import Notes Only" aria-label="Import Notes Only"></button>
        <button type="button" class="header-control fa-solid fa-file-export icon" data-action="exportCalendar"
                data-tooltip="Export Calendar to JSON" aria-label="Export Calendar to JSON"></button>
      `;
      this.window.close.insertAdjacentHTML("beforebegin", copyId);
    
    return frame;
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
                // Check if the season refers to a valid month ordinal
                const startValid = validOrdinals.includes(s.monthStart);
                const endValid = validOrdinals.includes(s.monthEnd);
                
                // Note: Logic allows wrap-around (Winter: Dec -> Feb), so we just check existence
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

    /** @override */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.buttons = this._getButtons();

        const source = game.settings.get(MODULE_NAME, "calendarSource");

        context.calendarOptions = [
            { value: "world", label: "Default (World's Calendar)", selected: source === "world" },
            { value: "gregorian", label: "Preset: Gregorian (Full Format)", selected: source === "gregorian" },
            { value: "harptos", label: "Preset: Harptos (Full Format)", selected: source === "harptos" },
            { value: "pf2e", label: "Preset: PF2E Absalom Reckoning (Golarion)", selected: source === "pf2e" },
            { value: "galifar", label: "Preset: Galifar Calendar (Eberron)", selected: source === "galifar" },
            { value: "warhammer", label: "Preset: Warhammer Imperial Calendar", selected: source === "warhammer" },
            { value: "custom", label: "Custom JSON (Full Format)", selected: source === "custom" },
        ];

        let calendarJsonString = "{}";
        let calendarData = null;

        if (source === "warhammer") {
            calendarData = warhammer();
            calendarJsonString = JSON.stringify(calendarData, null, 2);
        } else if (source === "pf2e") {
            calendarData = pf2e();
            calendarJsonString = JSON.stringify(calendarData, null, 2);
        } else if (source === "galifar") {
            calendarData = galifar();
            calendarJsonString = JSON.stringify(calendarData, null, 2);
        } else if (source === "harptos") {
            calendarData = harptos();
            calendarJsonString = JSON.stringify(calendarData, null, 2);
        } else if (source === "gregorian") {
            calendarData = gregorian();
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
                calendarData = harptos();
                calendarJsonString = JSON.stringify(calendarData, null, 2);
            }
        } else {
            calendarData = game.time.calendar.toJSON();
            calendarJsonString = JSON.stringify(calendarData, null, 2);
        }

        if (!calendarData || Object.keys(calendarData).length === 0) {
            ui.notifications.warn("Invalid or empty calendar data found. Loading Harptos default for display.");
            calendarData = harptos();
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
            if (source === "warhammer") {
                calendarData = warhammer();
            } else if (source === "galifar") {
                calendarData = galifar();
            } else if (source === "pf2e") {
                calendarData = pf2e();
            } else if (source === "harptos") {
                calendarData = harptos();
            } else if (source === "gregorian") {
                calendarData = gregorian();
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
                    if (validationData.weather) delete validationData.weather;
                    if (validationData.sun) delete validationData.sun;
                    if (validationData.notes) delete validationData.notes;
                    new foundry.data.CalendarData(validationData);
                    this._validateCustomData(calendarData);
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
                    const notesToImport = calendarData.notes;
                    const configToSave = foundry.utils.deepClone(calendarData);
                    delete configToSave.notes;
                    if (notesToImport && Array.isArray(notesToImport)) {
                        await this._importPresetEvents(notesToImport);
                    }
                    await game.settings.set(MODULE_NAME, "calendarConfiguration", configToSave);
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


        Hooks.callAll("closeCalendarConfig");
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
                const exists = existingNotes.find(en => en.isPreset && en.title === note.title);
                if (!exists) {
                    const newNote = {
                        id: foundry.utils.randomID(),
                        ...note,
                        startDate: note.date || note.startDate, 
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
                    id: foundry.utils.randomID(),
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
                    const exists = existingNotes.find(en => en.isPreset && en.title === newNote.title);
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

    /** Reset to Harptos preset */
    static async #onResetDefaults(event, form) {
        const app = form.owner;
        if (!app) return;

        const confirmed = await confirmationDialog(
            `Reset calendar configuration to the Harptos preset? Unsaved changes will be lost.`,
        );
        if (!confirmed) return;

        try {
            const harptosData = harptos();
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