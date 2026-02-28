import { MODULE_NAME } from "./settings.js";
import { localize, calendarJournal, playerJournalName, whisperChat, confirmationDialog, PIN_TYPES } from "./helper.js";

const ApplicationV2 = foundry.applications.api.ApplicationV2;
const HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
const ViewNotesBase = HandlebarsApplicationMixin(ApplicationV2);


export class ViewNotesApp extends ViewNotesBase {
    
    _noteDate = null;
    
    _notes = [];
    
    _selectedNoteId = null;
    
    _calendarApp = null;
    
    _noteSettingsOpen = false;
    
    _enrichedContentCache = new Map();
    
    _settingsSaveTimer = null;
    
    _calendarRenderTimer = null;
    
    _pmSaveTimer = null;
    
    _renderListeners = null;
    
    _boundConfigurePlugins = this._onConfigurePlugins.bind(this);

    
    static DOCUMENT_COLLECTIONS = {
        JournalEntry: { collection: () => game.journal, icon: "fas fa-book-open" },
        Actor: { collection: () => game.actors, icon: "fas fa-user" },
        Item: { collection: () => game.items, icon: "fas fa-suitcase" },
    };

    static REPEAT_UNITS = [
        { value: "none", label: "Never" },
        { value: "days", label: "Days" },
        { value: "months", label: "Months" },
        { value: "years", label: "Years" },
    ];

    static ADVANCED_RULES = [
        { value: "lunar", label: "Lunar Phase" },
        { value: "weekday", label: "Nth Weekday (e.g. 2nd Tues)" },
        { value: "week_index", label: "Specific Week & Day" },
        { value: "random", label: "Random Occurrences" },
    ];

    static ORDINAL_OPTIONS = [
        { value: 0, label: "First" },
        { value: 1, label: "Second" },
        { value: 2, label: "Third" },
        { value: 3, label: "Fourth" },
        { value: -1, label: "Last" },
    ];

    static DEFAULT_OPTIONS = {
        id: "wgtngm-view-notes",
        tag: "div",
        classes: ["wgtngm-view-notes"],
        window: {
            title: "Event Notes",
            icon: "fas fa-calendar-day",
            resizable: true,
        },
        position: {
            width: 750,
            height: 600,
        },
        actions: {
            "select-note": ViewNotesApp._onSelectNote,
            "add-note": ViewNotesApp._onAddNote,
            "delete-note": ViewNotesApp._onDeleteNote,
            "toggle-visibility": ViewNotesApp._onToggleVisibility,
            "send-to-chat": ViewNotesApp._onSendToChat,
            "remove-macro": ViewNotesApp._onRemoveMacro,
            "remove-document": ViewNotesApp._onRemoveDocument,
            "open-document": ViewNotesApp._onOpenDocument,
        },
    };

    static PARTS = {
        main: {
            template: `modules/wgtgm-mini-calendar/templates/view-notes.hbs`,
        },
    };

    constructor(date, notes, calendarApp, options = {}) {
        super(options);
        this._noteDate = date;
        this._notes = notes || [];
        this._calendarApp = calendarApp;
        if (this._notes.length > 0) {
            this._selectedNoteId = this._notes[0].id;
        }
    }

    get title() {
        const calendar = game.time.calendar;
        const monthName = game.i18n.localize(calendar.months.values[this._noteDate.month].name);
        const day = this._noteDate.day + 1;
        return `Notes for ${monthName} ${day}, ${this._noteDate.year}`;
    }


    async updateNotes(notes, selectId = null) {
        this._notes = notes || [];
        if (selectId) {
            this._selectedNoteId = selectId;
        } else if (this._selectedNoteId) {
            if (!this._findNote(this._selectedNoteId)) {
                this._selectedNoteId = this._notes.length > 0 ? this._notes[0].id : null;
            }
        } else {
            this._selectedNoteId = this._notes.length > 0 ? this._notes[0].id : null;
        }
        this.render();
    }

    _queueSettingsSave(delay = 350) {
        clearTimeout(this._settingsSaveTimer);
        this._settingsSaveTimer = setTimeout(() => {
            this._settingsSaveTimer = null;
            this._saveSettingsFromDOM();
        }, delay);
    }

    async _flushPendingSettingsSave() {
        if (!this._settingsSaveTimer) return;
        clearTimeout(this._settingsSaveTimer);
        this._settingsSaveTimer = null;
        await this._saveSettingsFromDOM();
    }

    _scheduleCalendarRender(delay = 250) {
        if (!this._calendarApp) return;
        clearTimeout(this._calendarRenderTimer);
        this._calendarRenderTimer = setTimeout(() => {
            if (this._calendarApp._debouncedRender) this._calendarApp._debouncedRender();
            else this._calendarApp.render();
        }, delay);
    }

    _objectsEqual(a = {}, b = {}) {
        if (foundry?.utils?.objectsEqual) return foundry.utils.objectsEqual(a, b);
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        for (const key of aKeys) {
            if (a[key] !== b[key]) return false;
        }
        return true;
    }

    
    _findNote(id) {
        return this._notes.find((n) => n.id === id);
    }

    
    async _flushAll() {
        await this._flushPendingSettingsSave();
        await this._saveProseMirrorContent();
    }

    static async _resolveMacro(refOrId) {
        const ref =
            typeof refOrId === "object" && refOrId !== null
                ? refOrId
                : {
                    ...(typeof refOrId === "string" && refOrId.includes(".")
                        ? { uuid: refOrId }
                        : { id: refOrId }),
                };
        try {
            let macro = null;
            if (ref.uuid) macro = await fromUuid(ref.uuid);
            if (!macro && ref.id) macro = game.macros.get(ref.id);
            return macro || null;
        } catch {
            return null;
        }
    }

    static async _resolveDocument(type, refOrId) {
        const entry = ViewNotesApp.DOCUMENT_COLLECTIONS[type];
        if (!entry) return null;
        const ref =
            typeof refOrId === "object" && refOrId !== null
                ? refOrId
                : { id: refOrId };
        try {
            let doc = null;
            if (ref.uuid) {
                doc = await fromUuid(ref.uuid);
            }
            if (!doc && ref.id) {
                doc = entry.collection().get(ref.id);
            }
            return doc ? { doc, icon: entry.icon } : null;
        } catch {
            return null;
        }
    }

    static _buildMetaHtml({ hasTime, timeStr, isRepeating, playerVisible }, { useTags = false } = {}) {
        let html = "";
        if (useTags) {
            if (hasTime) html += `<span class="vn-tag"><i class="fas fa-clock"></i> ${timeStr}</span>`;
            if (isRepeating) html += `<span class="vn-tag"><i class="fas fa-repeat"></i> Repeating</span>`;
            if (!playerVisible)
                html += `<span class="vn-tag vn-tag-hidden"><i class="fas fa-eye-slash"></i> Hidden</span>`;
        } else {
            if (hasTime) html += `<i class="fas fa-clock"></i> ${timeStr} `;
            if (isRepeating) html += `<i class="fas fa-repeat" title="Repeating"></i> `;
            if (!playerVisible) html += `<i class="fas fa-eye-slash" title="Hidden"></i>`;
        }
        return html;
    }

    static _readAdvParams(el, rule) {
        const int = (sel, fallback = 0) => parseInt(el.querySelector(sel)?.value ?? fallback, 10);
        switch (rule) {
            case "lunar":
                return {
                    moonIndex: int("select[name='adv_moonIndex']"),
                    phaseIndex: int("#vn-adv-phase-select"),
                    lunarStartMonth: int("select[name='adv_lunarStartMonth']"),
                    lunarEndMonth: int("select[name='adv_lunarEndMonth']"),
                };
            case "weekday":
                return {
                    ordinal: int("select[name='adv_ordinal']"),
                    weekdayIndex: int("select[name='adv_weekdayIndex']"),
                    monthIndex_wk: int("select[name='adv_monthIndex_wk']", -1),
                };
            case "week_index":
                return {
                    weekNum: int("input[name='adv_weekNum']", 1),
                    dayNum: int("select[name='adv_dayNum']"),
                };
            case "random":
                return {
                    count: int("input[name='adv_count']", 5),
                    startMonth: int("select[name='adv_startMonth']"),
                    endMonth: int("select[name='adv_endMonth']"),
                };
            default:
                return {};
        }
    }

    get date() {
        return this._noteDate;
    }

    async _prepareContext(options) {
        const isGM = game.user.isGM;
        const allowPlayerNotes = game.settings.get(MODULE_NAME, "allowPlayerNotes");

        const sortedNotes = [...this._notes].sort((a, b) => {
            const aAllDay = a.hour === null || a.hour === undefined;
            const bAllDay = b.hour === null || b.hour === undefined;
            if (aAllDay && !bAllDay) return -1;
            if (!aAllDay && bAllDay) return 1;
            if (aAllDay && bAllDay) return a.title.localeCompare(b.title);
            if (a.hour !== b.hour) return a.hour - b.hour;
            return (a.minute || 0) - (b.minute || 0);
        });

        const visibleNotes = sortedNotes.filter((n) => {
            if (isGM) return true;
            if (n.playerVisible) return true;
            if (n.userId === game.user.id) return true;
            return false;
        });

        const enrichedNotes = visibleNotes.map((note) => {
            const hasTime = note.hour !== null && note.hour !== undefined;
            const timeStr = hasTime
                ? `${String(note.hour).padStart(2, "0")}:${String(note.minute || 0).padStart(2, "0")}`
                : "";
            return {
                ...note,
                timeStr,
                active: note.id === this._selectedNoteId,
                isRepeating: note.repeatUnit && note.repeatUnit !== "none",
            };
        });

        const selectedNote = enrichedNotes.find((n) => n.id === this._selectedNoteId) || null;
        let canEdit = false;

        const calendar = game.time.calendar;
        const hoursInDay = calendar.days.hoursPerDay || 24;
        const minutesInHour = calendar.days.minutesPerHour || 60;
        const moons = CONFIG.time.worldCalendarConfig.moons?.values || [];

        const hourOptions = Array.from({ length: hoursInDay }, (_, i) => ({
            value: i,
            label: String(i).padStart(2, "0"),
        }));
        const minuteOptions = Array.from({ length: Math.floor(minutesInHour) }, (_, i) => ({
            value: i,
            label: String(i).padStart(2, "0"),
        }));
        const calendarMonthOptions = calendar.months.values.map((m, i) => ({
            index: i,
            name: game.i18n.localize(m.name),
        }));
        const weekdayOptions = calendar.days.values.map((d, i) => ({ index: i, name: game.i18n.localize(d.name) }));
        const moonOptions = moons.map((m, i) => ({ index: i, name: m.name }));

        if (selectedNote) {
            canEdit = isGM || (allowPlayerNotes && selectedNote.userId === game.user.id);

            const rawContent = selectedNote.content || "";
            const cacheHit = this._enrichedContentCache.get(selectedNote.id);
            if (cacheHit?.raw === rawContent) {
                selectedNote.enrichedContent = cacheHit.html;
            } else {
                const enriched = await foundry.applications.ux.TextEditor.implementation.enrichHTML(rawContent, {
                    async: true,
                });
                selectedNote.enrichedContent = enriched;
                this._enrichedContentCache.set(selectedNote.id, { raw: rawContent, html: enriched });
            }
            if (!selectedNote.enrichedContent?.trim()) {
                selectedNote.enrichedContent = "<p><em>No content.</em></p>";
            }

            selectedNote.escapedContent = foundry.utils.escapeHTML(rawContent);

            const linkedMacroData = await Promise.all(
                (selectedNote.linkedMacros || []).map(async (macroRef) => {
                    const macro = await ViewNotesApp._resolveMacro(macroRef);
                    if (!macro) return null;
                    return { id: macro.id, uuid: macro.uuid, key: macro.uuid || macro.id, name: macro.name };
                })
            );
            selectedNote.linkedMacroData = linkedMacroData.filter(Boolean);

            const linkedDocData = await Promise.all(
                (selectedNote.linkedDocuments || []).map(async (ref) => {
                    const resolved = await ViewNotesApp._resolveDocument(ref.type, ref);
                    if (!resolved) return null;
                    return { uuid: resolved.doc.uuid, type: ref.type, name: resolved.doc.name, icon: resolved.icon };
                })
            );
            selectedNote.linkedDocData = linkedDocData.filter(Boolean);

            selectedNote.hasLinkedItems =
                selectedNote.linkedMacroData.length > 0 || selectedNote.linkedDocData.length > 0;

            const isAllDay = selectedNote.hour === null || selectedNote.hour === undefined;
            selectedNote.isAllDay = isAllDay;
            selectedNote.selectedHour = selectedNote.hour ?? 0;
            selectedNote.selectedMinute = selectedNote.minute ?? 0;
            selectedNote.hasAdvanced = !!selectedNote.advancedRule && selectedNote.advancedRule !== "none";
            selectedNote.repeatCount = selectedNote.repeatCount || 0;
            selectedNote.repeatInterval = selectedNote.repeatInterval || 1;
            selectedNote.selectedRepeatUnit =
                !selectedNote.repeatUnit || selectedNote.repeatUnit === "none" ? "none" : selectedNote.repeatUnit;
            selectedNote.selectedAdvancedRule = selectedNote.advancedRule || "none";

            const ap = selectedNote.advParams || {};
            selectedNote.advMoonIndex = ap.moonIndex || 0;
            selectedNote.advLunarStartMonth = ap.lunarStartMonth || 0;
            selectedNote.advLunarEndMonth = ap.lunarEndMonth ?? calendar.months.values.length - 1;
            selectedNote.advOrdinal = ap.ordinal ?? 0;
            selectedNote.advWeekdayIndex = ap.weekdayIndex || 0;
            selectedNote.advMonthIndexWk = ap.monthIndex_wk ?? -1;
            selectedNote.advWeekNum = ap.weekNum || 1;
            selectedNote.advDayNum = ap.dayNum || 0;
            selectedNote.advCount = ap.count || 5;
            selectedNote.advStartMonth = ap.startMonth || 0;
            selectedNote.advEndMonth = ap.endMonth || 0;
        }

        return {
            notes: enrichedNotes,
            selectedNote,
            noteSettingsOpen: this._noteSettingsOpen,
            canEdit,
            canAddNote: isGM || allowPlayerNotes,
            pinTypes: PIN_TYPES,

            hourOptions,
            minuteOptions,
            calendarMonthOptions,
            weekdayOptions,
            moonOptions,
            repeatUnits: ViewNotesApp.REPEAT_UNITS,
            advancedRules: ViewNotesApp.ADVANCED_RULES,
            ordinalOptions: ViewNotesApp.ORDINAL_OPTIONS,
        };
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const el = this.element;
        if (!el) return;

        this._renderListeners?.abort();
        this._renderListeners = new AbortController();
        const signal = this._renderListeners.signal;

        el.querySelectorAll(".vn-droppable").forEach((zone) => {
            zone.addEventListener("dragover", (ev) => {
                ev.preventDefault();
                zone.classList.add("vn-drop-active");
            }, { signal });
            zone.addEventListener("dragleave", (ev) => {
                if (!zone.contains(ev.relatedTarget)) {
                    zone.classList.remove("vn-drop-active");
                }
            }, { signal });
            zone.addEventListener("drop", (ev) => {
                ev.preventDefault();
                zone.classList.remove("vn-drop-active");
                this._handleDrop(ev, zone);
            }, { signal });
        });

        if (this._selectedNoteId) {
            this._wireSettingsInteractivity(el, signal);
        }

        const pmElement = el.querySelector('prose-mirror[name="noteContent"]');
        if (pmElement) {
            pmElement.addEventListener("input", () => {
                clearTimeout(this._pmSaveTimer);
                this._pmSaveTimer = setTimeout(() => this._saveProseMirrorContent(), 1000);
            }, { signal });

            pmElement.addEventListener("focusout", (ev) => {
                if (!pmElement.contains(ev.relatedTarget)) {
                    clearTimeout(this._pmSaveTimer);
                    this._pmSaveTimer = null;
                    this._saveProseMirrorContent({ refreshView: true });
                }
            }, { signal });

            pmElement.addEventListener("save", (ev) => {
                ev.stopPropagation();
                clearTimeout(this._pmSaveTimer);
                this._pmSaveTimer = null;
                this._saveProseMirrorContent({ refreshView: true });
            }, { signal });
        }
    }


    _wireSettingsInteractivity(el, signal) {
        const moons = CONFIG.time.worldCalendarConfig.moons?.values || [];

        const titleInput = el.querySelector("input[name='noteTitle']");
        if (titleInput) {
            titleInput.addEventListener("change", () => this._queueSettingsSave(0), { signal });
        }

        const iconInput = el.querySelector("input[name='noteIcon']");
        const iconPreview = el.querySelector("#vn-icon-preview");
        const iconFieldsRow = el.querySelector(".vn-header-fields");
        if (iconPreview && iconFieldsRow) {
            iconPreview.addEventListener("click", () => {
                const hidden = iconFieldsRow.classList.toggle("is-hidden");
                if (!hidden && iconInput) iconInput.focus();
            }, { signal });
        }
        if (iconInput) {
            if (iconPreview) {
                iconInput.addEventListener("input", () => {
                    iconPreview.className = (iconInput.value || "fas fa-book") + " vn-icon-clickable";
                }, { signal });
            }
            iconInput.addEventListener("input", () => this._queueSettingsSave(300), { signal });
            iconInput.addEventListener("change", () => {
                this._queueSettingsSave(0);
                if (iconFieldsRow) iconFieldsRow.classList.add("is-hidden");
            }, { signal });
        }

        const visCheck = el.querySelector("input[name='playerVisible']");
        if (visCheck) visCheck.addEventListener("change", () => this._queueSettingsSave(0), { signal });

        const allDayBox = el.querySelector("#vn-note-all-day");
        const timeContainer = el.querySelector("#vn-note-time-container");
        if (allDayBox && timeContainer) {
            allDayBox.addEventListener("change", () => {
                timeContainer.classList.toggle("is-hidden", allDayBox.checked);
                if (!allDayBox.checked) {
                    const comps = game.time.calendar.timeToComponents(game.time.worldTime);
                    const hourSel = el.querySelector("select[name='hour']");
                    const minSel = el.querySelector("select[name='minute']");
                    if (hourSel && comps.hour != null) hourSel.value = comps.hour;
                    if (minSel && comps.minute != null) minSel.value = comps.minute;
                }
                this._queueSettingsSave(0);
            }, { signal });
        }

        const hourSelect = el.querySelector("select[name='hour']");
        const minuteSelect = el.querySelector("select[name='minute']");
        if (hourSelect) hourSelect.addEventListener("change", () => this._queueSettingsSave(0), { signal });
        if (minuteSelect) minuteSelect.addEventListener("change", () => this._queueSettingsSave(0), { signal });

        const advCheck = el.querySelector("#vn-use-advanced-check");
        const stdRepeat = el.querySelector(".repeat-standard");
        const advContainer = el.querySelector("#vn-advanced-options-container");
        const settingsDetails = el.querySelector(".vn-settings-details");
        const ruleSelect = el.querySelector("#vn-adv-rule-select");
        const subGroups = el.querySelectorAll(".adv-subgroup");
        const moonSelect = el.querySelector("select[name='adv_moonIndex']");
        const phaseSelect = el.querySelector("#vn-adv-phase-select");

        function toggleAdvanced() {
            if (!advCheck) return;
            const isAdv = advCheck.checked;
            if (stdRepeat) stdRepeat.classList.toggle("is-hidden", isAdv);
            if (advContainer) advContainer.classList.toggle("is-hidden", !isAdv);
        }

        function toggleRules() {
            if (!ruleSelect) return;
            const rule = ruleSelect.value;
            subGroups.forEach((g) => (g.style.display = "none"));
            const active = el.querySelector(`.adv-subgroup[data-type="${rule}"]`);
            if (active) active.style.display = "block";
        }

        const updatePhases = () => {
            if (!moonSelect || !phaseSelect) return;
            const moonIdx = moonSelect.value;
            const moon = moons[moonIdx];
            let html = "";
            if (moon && moon.phases) {
                moon.phases.forEach((p, i) => {
                    html += `<option value="${i}">${p.name}</option>`;
                });
            }
            phaseSelect.innerHTML = html;
            const note = this._notes.find((n) => n.id === this._selectedNoteId);
            if (note?.advParams?.phaseIndex !== undefined) phaseSelect.value = note.advParams.phaseIndex;
        };

        toggleAdvanced();
        toggleRules();
        if (moons.length > 0) updatePhases();

        if (settingsDetails) {
            settingsDetails.addEventListener("toggle", () => {
                this._noteSettingsOpen = settingsDetails.open;
            }, { signal });
        }
        if (advCheck)
            advCheck.addEventListener("change", () => {
                toggleAdvanced();
                this._queueSettingsSave(0);
            }, { signal });
        if (ruleSelect)
            ruleSelect.addEventListener("change", () => {
                toggleRules();
                this._queueSettingsSave(0);
            }, { signal });
        if (moonSelect)
            moonSelect.addEventListener("change", () => {
                updatePhases();
                this._queueSettingsSave(0);
            }, { signal });

        const repeatUnit = el.querySelector("select[name='repeatUnit']");
        const repeatCount = el.querySelector("input[name='repeatCount']");
        const repeatInterval = el.querySelector("input[name='repeatInterval']");
        if (repeatUnit) repeatUnit.addEventListener("change", () => this._queueSettingsSave(0), { signal });
        if (repeatCount) repeatCount.addEventListener("change", () => this._queueSettingsSave(0), { signal });
        if (repeatInterval) repeatInterval.addEventListener("change", () => this._queueSettingsSave(0), { signal });

        el.querySelectorAll(".adv-subgroup select, .adv-subgroup input").forEach((field) => {
            field.addEventListener("change", () => this._queueSettingsSave(0), { signal });
        });
        if (phaseSelect) phaseSelect.addEventListener("change", () => this._queueSettingsSave(0), { signal });
    }


    async _saveSettingsFromDOM() {
        if (!this._selectedNoteId || !this._calendarApp) return;
        const el = this.element;
        if (!el) return;

        const note = this._findNote(this._selectedNoteId);
        if (!note) return;

        const title = el.querySelector("input[name='noteTitle']")?.value?.trim() || note.title;
        const icon = el.querySelector("input[name='noteIcon']")?.value || "fas fa-book";
        const playerVisible = el.querySelector("input[name='playerVisible']")?.checked ?? note.playerVisible;
        const allDay = el.querySelector("#vn-note-all-day")?.checked ?? true;
        const hour = allDay ? null : parseInt(el.querySelector("select[name='hour']")?.value || 0, 10);
        const minute = allDay ? null : parseInt(el.querySelector("select[name='minute']")?.value || 0, 10);

        const useAdv = el.querySelector("#vn-use-advanced-check")?.checked;

        let repeatUnit = "none";
        let repeatInterval = 1;
        let repeatCount = 0;
        let advancedRule = "none";
        let advParams = {};

        if (useAdv) {
            const rule = el.querySelector("#vn-adv-rule-select")?.value || "none";
            advancedRule = rule;
            if (rule !== "none") {
                advParams = ViewNotesApp._readAdvParams(el, rule);
                repeatUnit = "advanced";
            }
        } else {
            repeatUnit = el.querySelector("select[name='repeatUnit']")?.value || "none";
            repeatInterval = parseInt(el.querySelector("input[name='repeatInterval']")?.value || 1, 10);
            repeatCount = parseInt(el.querySelector("input[name='repeatCount']")?.value || 0, 10);
        }

        const advParamsChanged = !this._objectsEqual(note.advParams || {}, advParams || {});
        const settingsChanged =
            title !== note.title ||
            icon !== note.icon ||
            playerVisible !== note.playerVisible ||
            hour !== note.hour ||
            minute !== note.minute ||
            repeatUnit !== note.repeatUnit ||
            repeatInterval !== (note.repeatInterval ?? 1) ||
            repeatCount !== (note.repeatCount ?? 0) ||
            advancedRule !== (note.advancedRule || "none") ||
            advParamsChanged;

        if (!settingsChanged) return;

        const wasRecurring =
            note.isRecurringInstance ||
            (note.repeatUnit && note.repeatUnit !== "none" && note.repeatUnit !== repeatUnit);
        const isNowNonRecurring = !repeatUnit || repeatUnit === "none";
        if (wasRecurring && isNowNonRecurring && this._calendarApp) {
            await this._calendarApp._removeRecurringNote(note.id);
            this._calendarApp._clearNotesCache();
        }

        const needsSortUpdate =
            title !== note.title || hour !== note.hour || minute !== note.minute || (wasRecurring && isNowNonRecurring);

        const noteData = {
            id: this._selectedNoteId,
            title,
            icon,
            playerVisible,
            hour,
            minute,
            repeatUnit,
            repeatInterval,
            repeatCount,
            advancedRule,
            advParams,
            startDate: this._noteDate,
            content: note.content || "",
            userId: note.userId,
            linkedMacros: note.linkedMacros || [],
            linkedDocuments: note.linkedDocuments || [],
            isPlayerNote: note.isPlayerNote ?? false,
        };
        const updatedNotes = await this._calendarApp._transactionalNoteUpdate(this._noteDate, (notes) => {
            const idx = notes.findIndex((n) => n.id === this._selectedNoteId);
            if (idx > -1) {
                Object.assign(notes[idx], noteData);
            } else {
                notes.push(noteData);
            }
            return notes;
        });

        if (needsSortUpdate) {
            this._scheduleCalendarRender();
            await this.updateNotes(updatedNotes);
            return;
        }

        const hasTime = hour !== null && hour !== undefined;
        const timeStr = hasTime ? `${String(hour).padStart(2, "0")}:${String(minute || 0).padStart(2, "0")}` : "";
        const isRepeating = repeatUnit && repeatUnit !== "none";
        const metaCtx = { hasTime, timeStr, isRepeating, playerVisible };

        const card = el.querySelector(`.vn-card[data-note-id="${this._selectedNoteId}"]`);
        if (card) {
            const cardTitle = card.querySelector(".vn-card-title");
            if (cardTitle) cardTitle.textContent = title;
            const cardIcon = card.querySelector(".vn-card-icon i");
            if (cardIcon) cardIcon.className = icon || "fas fa-book";
            const cardMeta = card.querySelector(".vn-card-meta");
            if (cardMeta) cardMeta.innerHTML = ViewNotesApp._buildMetaHtml(metaCtx);
        }

        const detailMeta = el.querySelector(".vn-detail-meta");
        if (detailMeta) detailMeta.innerHTML = ViewNotesApp._buildMetaHtml(metaCtx, { useTags: true });

        const localNote = this._findNote(this._selectedNoteId);
        if (localNote) {
            Object.assign(localNote, {
                title,
                icon,
                playerVisible,
                hour,
                minute,
                repeatUnit,
                repeatInterval,
                repeatCount,
                advancedRule,
                advParams,
                startDate: this._noteDate,
            });
        }

        this._scheduleCalendarRender();
    }


    _onConfigurePlugins(event) {
        event.plugins.highlightDocumentMatches = ProseMirror.ProseMirrorHighlightMatchesPlugin.build(
            ProseMirror.defaultSchema,
        );
    }

    
    _attachFrameListeners() {
        super._attachFrameListeners();
        this.element.removeEventListener("plugins", this._boundConfigurePlugins);
        this.element.addEventListener("plugins", this._boundConfigurePlugins);
    }

    async _onClose(options) {
        await this._flushAll();
        clearTimeout(this._calendarRenderTimer);
        clearTimeout(this._pmSaveTimer);
        this._pmSaveTimer = null;
        this._renderListeners?.abort();
        this._renderListeners = null;
        this.element?.removeEventListener("plugins", this._boundConfigurePlugins);
        if (this._calendarApp?._viewNotesApp === this) {
            this._calendarApp._viewNotesApp = null;
        }
        return super._onClose?.(options);
    }


    async _saveProseMirrorContent({ refreshView = false } = {}) {
        if (!this._selectedNoteId || !this._calendarApp) return;
        const el = this.element;
        if (!el) return;

        const pmElement = el.querySelector('prose-mirror[name="noteContent"]');
        if (!pmElement) return;

        const htmlContent = pmElement.value;
        const selectedNote = this._findNote(this._selectedNoteId);
        if (!selectedNote) return;

        let contentChanged = false;

        if (htmlContent !== selectedNote.content) {
            contentChanged = true;
            selectedNote.content = htmlContent;
            this._enrichedContentCache.delete(selectedNote.id);
            const updatedNotes = await this._calendarApp._transactionalNoteUpdate(this._noteDate, (notes) => {
                const idx = notes.findIndex((n) => n.id === this._selectedNoteId);
                if (idx > -1) {
                    notes[idx].content = htmlContent;
                }
                return notes;
            });
            if (Array.isArray(updatedNotes)) this._notes = updatedNotes;
            this._scheduleCalendarRender();
        }

        if (refreshView && (contentChanged || this._contentSavedWithoutRefresh)) {
            this._contentSavedWithoutRefresh = false;
            await this.updateNotes(this._notes, this._selectedNoteId);
        } else if (contentChanged && !refreshView) {
            this._contentSavedWithoutRefresh = true;
        }
    }

    async _handleDrop(event, zone) {
        let dropData;
        try {
            dropData = JSON.parse(event.dataTransfer.getData("text/plain"));
        } catch (e) {
            return;
        }

        const noteId = zone.dataset.noteId;
        const note = this._findNote(noteId);
        if (!note) return;

        if (dropData.type === "Macro") {
            let droppedMacro = null;
            if (dropData.uuid) droppedMacro = await ViewNotesApp._resolveMacro({ uuid: dropData.uuid });
            else if (dropData.id) droppedMacro = await ViewNotesApp._resolveMacro({ id: dropData.id });
            if (!droppedMacro) return;

            const droppedKey = droppedMacro.uuid || droppedMacro.id;
            const droppedRef = droppedMacro.pack ? droppedMacro.uuid : droppedMacro.id;
            if (!droppedRef) return;

            if (!note.linkedMacros) note.linkedMacros = [];
            let alreadyLinked = false;
            for (const existing of note.linkedMacros) {
                const macro = await ViewNotesApp._resolveMacro(existing);
                if ((macro?.uuid || macro?.id) === droppedKey) {
                    alreadyLinked = true;
                    break;
                }
            }
            if (alreadyLinked) {
                ui.notifications.info("Macro already linked.");
                return;
            }
            note.linkedMacros.push(droppedRef);
            await this._saveNoteLinks(note);
            ui.notifications.info(`Linked macro to "${note.title}".`);
        } else if (ViewNotesApp.DOCUMENT_COLLECTIONS[dropData.type]) {
            let docUuid = dropData.uuid || null;
            if (!docUuid && dropData.id) {
                const resolved = await ViewNotesApp._resolveDocument(dropData.type, { id: dropData.id });
                docUuid = resolved?.doc?.uuid || null;
            }
            if (!docUuid) return;

            if (!note.linkedDocuments) note.linkedDocuments = [];
            let alreadyLinked = false;
            for (const d of note.linkedDocuments) {
                if (d.type !== dropData.type) continue;
                const resolved = await ViewNotesApp._resolveDocument(d.type, d);
                if (resolved?.doc?.uuid === docUuid) {
                    alreadyLinked = true;
                    break;
                }
            }
            if (alreadyLinked) {
                ui.notifications.info("Document already linked.");
                return;
            }
            note.linkedDocuments.push({ type: dropData.type, uuid: docUuid });
            await this._saveNoteLinks(note);
            ui.notifications.info(`Linked document to "${note.title}".`);
        } else {
            ui.notifications.warn("You can link macros, journals, actors, or items.");
        }
    }

    async _saveNoteLinks(note) {
        await this._saveProseMirrorContent();

        if (!this._calendarApp) return;
        await this._calendarApp._transactionalNoteUpdate(this._noteDate, (notes) => {
            const idx = notes.findIndex((n) => n.id === note.id);
            if (idx > -1) {
                notes[idx].linkedMacros = note.linkedMacros || [];
                notes[idx].linkedDocuments = note.linkedDocuments || [];
            }
            return notes;
        });
        await this.updateNotes(this._notes, note.id);
    }

    static async _onSelectNote(event, target) {
        const noteId = target.closest("[data-note-id]")?.dataset.noteId;
        if (!noteId || noteId === this._selectedNoteId) return;
        await this._flushAll();
        this._selectedNoteId = noteId;
        this.render();
    }


    static async _onAddNote(event, target) {
        if (!this._calendarApp) return;
        await this._flushAll();

        const newNote = {
            id: foundry.utils.randomID(),
            title: "New Note",
            icon: "fas fa-book",
            content: "",
            hour: null,
            minute: null,
            playerVisible: !game.user.isGM,
            repeatUnit: "none",
            repeatInterval: 1,
            repeatCount: 0,
            linkedMacros: [],
            linkedDocuments: [],
            userId: game.user.id,
            isPlayerNote: !game.user.isGM,
        };

        await this._calendarApp._transactionalNoteUpdate(this._noteDate, (notes) => {
            notes.push(newNote);
            return notes;
        });

        this._calendarApp.render();
        const freshNotes = await this._calendarApp._getNotesForDay(this._noteDate);
        await this.updateNotes(freshNotes, newNote.id);
    }

    static async _onDeleteNote(event, target) {
        event.stopPropagation();
        await this._flushAll();

        const noteId = target.closest("[data-note-id]")?.dataset.noteId;
        if (!noteId || !this._calendarApp) return;

        const confirmed = await confirmationDialog("Are you sure you want to delete this note?");
        if (!confirmed) return;

        const noteToDelete = this._findNote(noteId);
        if (!noteToDelete) return;

        const isGM = game.user.isGM;
        const allowPlayerNotes = game.settings.get(MODULE_NAME, "allowPlayerNotes");
        const isOwner = noteToDelete.userId === game.user.id;

        if (!isGM && !(allowPlayerNotes && isOwner)) {
            ui.notifications.warn("You do not have permission to delete this note.");
            return;
        }

        if (noteToDelete.repeatUnit && noteToDelete.repeatUnit !== "none") {
            await this._calendarApp._removeRecurringNote(noteId);
            this._calendarApp._clearNotesCache();
        } else {
            await this._calendarApp._transactionalNoteUpdate(this._noteDate, (currentNotes) => {
                return currentNotes.filter((n) => n.id !== noteId);
            });
        }

        this._calendarApp.render();
        const freshNotes = await this._calendarApp._getNotesForDay(this._noteDate);
        await this.updateNotes(freshNotes);
    }

    static async _onToggleVisibility(event, target) {
        event.stopPropagation();
        await this._flushAll();

        const noteId = target.closest("[data-note-id]")?.dataset.noteId;
        if (!noteId || !this._calendarApp) return;

        const note = this._findNote(noteId);
        if (!note) return;

        if (note.repeatUnit && note.repeatUnit !== "none") {
            const journal = game.journal.getName(calendarJournal);
            const recPage = journal?.pages.getName("0000-Recurring");
            if (recPage) {
                let recNotes = recPage.flags[MODULE_NAME]?.notes || [];
                const index = recNotes.findIndex((n) => n.id === noteId);
                if (index > -1) {
                    recNotes[index].playerVisible = !recNotes[index].playerVisible;
                    await recPage.update({ flags: { [MODULE_NAME]: { notes: recNotes } } });
                }
            }
        } else {
            await this._calendarApp._transactionalNoteUpdate(this._noteDate, (currentNotes) => {
                const index = currentNotes.findIndex((n) => n.id === noteId);
                if (index > -1) {
                    currentNotes[index].playerVisible = !currentNotes[index].playerVisible;
                }
                return currentNotes;
            });
        }

        this._calendarApp.render();
        const freshNotes = await this._calendarApp._getNotesForDay(this._noteDate);
        await this.updateNotes(freshNotes, noteId);
    }


    static async _onSendToChat(event, target) {
        event.stopPropagation();
        const noteId = target.dataset.noteId;
        const note = this._findNote(noteId);
        if (!note) return;

        const calendar = game.time.calendar;
        const monthName = game.i18n.localize(calendar.months.values[this._noteDate.month].name);
        const dayNum = this._noteDate.day + 1;
        const timeStr =
            note.hour !== null && note.hour !== undefined
                ? ` [${String(note.hour).padStart(2, "0")}:${String(note.minute || 0).padStart(2, "0")}]`
                : "";
        let content = `<h4>${foundry.utils.escapeHTML(note.title)}${timeStr}</h4>`;
        content += `<p class="vn-chat-date">${monthName} ${dayNum}, ${this._noteDate.year}</p>`;

        if (note.content) {
            content += `<div>${note.content}</div>`;
        }

        if (note.linkedMacros?.length) {
            content += `<div class="wgtngm-macro-buttons">`;
            for (const macroRef of note.linkedMacros) {
                const macro = await ViewNotesApp._resolveMacro(macroRef);
                if (macro) {
                    const attrId = macro.id ? ` data-macro-id="${macro.id}"` : "";
                    const attrUuid = macro.uuid ? ` data-macro-uuid="${macro.uuid}"` : "";
                    content += `<button class="wgtngm-execute-macro"${attrId}${attrUuid}><i class="fas fa-play"></i> Execute: ${foundry.utils.escapeHTML(macro.name)}</button>`;
                }
            }
            content += `</div>`;
        }

        if (note.linkedDocuments?.length) {
            content += `<div class="wgtngm-linked-docs">`;
            for (const ref of note.linkedDocuments) {
                const resolved = await ViewNotesApp._resolveDocument(ref.type, ref);
                if (resolved) {
                    content += `<span class="wgtngm-doc-link">@UUID[${resolved.doc.uuid}]{${foundry.utils.escapeHTML(resolved.doc.name)}}</span> `;
                }
            }
            content += `</div>`;
        }

        whisperChat(content);
    }

    static async _onRemoveMacro(event, target) {
        event.stopPropagation();
        const macroKey = target.dataset.macroKey;
        const noteId = target.closest("[data-note-id]")?.dataset.noteId;
        const note = this._findNote(noteId);
        if (!note || !macroKey) return;

        const retained = [];
        for (const ref of note.linkedMacros || []) {
            const macro = await ViewNotesApp._resolveMacro(ref);
            if ((macro?.uuid || macro?.id) !== macroKey) retained.push(ref);
        }
        note.linkedMacros = retained;
        await this._saveNoteLinks(note);
    }

    static async _onRemoveDocument(event, target) {
        event.stopPropagation();
        const docType = target.dataset.docType;
        const docUuid = target.dataset.docUuid;
        const noteId = target.closest("[data-note-id]")?.dataset.noteId;
        const note = this._findNote(noteId);
        if (!note || !docType || !docUuid) return;

        const retained = [];
        for (const d of note.linkedDocuments || []) {
            if (d.type !== docType) {
                retained.push(d);
                continue;
            }
            const resolved = await ViewNotesApp._resolveDocument(d.type, d);
            if (resolved?.doc?.uuid !== docUuid) retained.push(d);
        }
        note.linkedDocuments = retained;
        await this._saveNoteLinks(note);
    }

    static async _onOpenDocument(event, target) {
        event.stopPropagation();
        const docType = target.closest("[data-doc-type]")?.dataset.docType;
        const docUuid = target.closest("[data-doc-uuid]")?.dataset.docUuid;
        if (!docType || !docUuid) return;

        const resolved = await ViewNotesApp._resolveDocument(docType, { uuid: docUuid });
        if (resolved?.doc?.sheet) resolved.doc.sheet.render(true);
    }
}
