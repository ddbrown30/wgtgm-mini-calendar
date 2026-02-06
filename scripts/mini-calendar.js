import { MODULE_NAME } from "./settings.js";
import { localize, calendarJournal, playerJournalName, confirmationDialog, whisperChat, broadcastChat, renderCalendarIfOpen, PIN_TYPES } from "./helper.js";
import { CalendarConfig } from "./calendar-config.js";
import { WeatherEngine } from "./weather.js";
import { WeatherConfig } from "./weather-config.js";

var ApplicationV2 = foundry.applications.api.ApplicationV2;
var HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
const wgtngmcal = HandlebarsApplicationMixin(ApplicationV2);

export class wgtngmMiniCalender extends wgtngmcal {
  static SCOPE = "wgtngmMiniCalender";

  static DEFAULT_OPTIONS = {
    id: "wgtngmMiniCalender",
    tag: "div",
    classes: ["wgtngmMiniCalender"],
    window: {
      title: "Mini Calendar",
      icon: "fas fa-calendar-alt",
      minimizable: false,
      resizable: false,
      zIndex: 10,
      height: "auto",
    },
    actions: {
      "add-note-mini": this.#_addNoteMini,
      "add-note-header": this.#_addNoteHeader,
      "add-note": this.#_addNote,
      "sub-hour": this.#_subhour,
      "sub-minute": this.#_subminute,
      "add-minute": this.#_addminute,
      "add-hour": this.#_addhour,
      "toggle-play": this.#_togglePlay,
      "prev-month": this.#_onPrevMonth,
      "next-month": this.#_onNextMonth,
      "set-year": this.#_onSetYear,
      "set-time": this.#_showSetTimeDialog,
      "go-today": this.#_onGoToday,
      "set-dawn": this.#_setDawn,
      "set-dawn-next": this.#_setDawnNext,
      "set-noon": this.#_setNoon,
      "set-sunset": this.#_setSunset,
      "set-midnight": this.#_setMidnight,
      "open-settings": this.#_openSettings,
      "open-weather-settings": this.#_weatherConfig,
      "set-date": this.#_dayClickContext,
      "toggle-weather-sound": this.#_toggleWeatherSound,
      "toggle-weather-fx": this.#_toggleWeatherFX,
      "toggle-scene-fx": this.#_toggleSceneFX,
      "set-dock": this.#_toggleDock,
      "change-weather": this.#_changeWeatherMini,
    },
  };



  static PARTS = {
    main: {
      template: `modules/wgtgm-mini-calendar/templates/wgtgm_calendar.hbs`,
    },
  };



  #clockInterval = null;
  #gameClockInterval = null;
  #isRunning = false;
  #timeMultiplier = 1;
  #viewTime = null;
  #viewMonth = null;
  #viewYear = null;
  #lastTimeState = null;
  #moonPhaseCache = new Map();
  #isCustomMinimized = false;
  #lastCheckedDate = null;
  #lastWeatherBroadcastDate = game.settings.get(MODULE_NAME, "lastWeatherBroadcastDate") || null;
  wasPausedForGame = false;
  wasPausedForCombat = false;
  _debouncedRender = foundry.utils.debounce(this.render.bind(this), 100);
  _debouncedRenderHud = foundry.utils.debounce(this.updateHud.bind(this), 100);
  
  _positionObserver = null;

  _positionObserver = null;
  _lastDarknessUpdate = 0;
  _lastSubmittedDarkness = null;


  _todayNotesCache = { dateKey: null, notes: null };
  _moonDarknessCache = { dayKey: null, isFullMoon: false, moonOverride: 0.7 };
  _suppressHook = false;

  _debouncedSavePosition = foundry.utils.debounce(async () => {
    if (!this.element || !this.position) return;
    if (this.element && this.element.classList.contains("docked")) return;
    const { width, height, left, top } = this.position;
    const saved = game.settings.get(MODULE_NAME, "calSheetDimensions");
    if (saved.width !== width || saved.height !== height || saved.left !== left || saved.top !== top) {
      await game.settings.set(MODULE_NAME, "calSheetDimensions", { width, height, left, top });
    }
  }, 500);


  async initialize() {
    this.#isRunning = game.settings.get(MODULE_NAME, "timeIsRunning");
    this.#timeMultiplier = game.settings.get(MODULE_NAME, "timeMultiplier");
    if (game.user.isGM) {
      await this._ensureJournalsExist();
      if (this.#isRunning) {
        if (game.paused) {
          this.wasPausedForGame = true;
        }
        const pauseOnCombat = game.settings.get(MODULE_NAME, "pauseOnCombat");
        if (pauseOnCombat && game.combat?.started) {
          this.wasPausedForCombat = true;
        }
        if (!this.wasPausedForGame && !this.wasPausedForCombat) {
          this._startTime();
        } else {
          console.log(`Mini Calendar | Time advancement withheld on initialization. (Game Paused: ${this.wasPausedForGame}, Combat: ${this.wasPausedForCombat})`);
        }
      }
    }

    Hooks.on("updateWorldTime", this._onUpdateWorldTime);
    Hooks.on("updateJournalEntryPage", this._onJournalUpdate);
    Hooks.on("deleteJournalEntry", this._onJournalUpdate);
    Hooks.on("deleteJournalEntryPage", this._onJournalUpdate);

    console.log("Mini Calendar | Initialized persistence.");
  }

  async _ensureJournalsExist() {
    
    
    await WeatherEngine.getForecastPage();

    let pJournal = game.journal.getName(playerJournalName);
    if (!pJournal) {
      await JournalEntry.create({
        name: playerJournalName,
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
        }
      });
      console.log(`Mini Calendar | Created ${playerJournalName} with Owner permissions for all.`);
    } else if (pJournal.ownership.default !== CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) {
      await pJournal.update({ "ownership.default": CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER });
    }
  }

  updateHud(){
    if (game.wgtngmMiniCalender.hud) game.wgtngmMiniCalender.hud.render();
  }

  /**
   * Custom handler for header double-clicks
   */
  _toggleCustomMinimize(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.#isCustomMinimized = !this.#isCustomMinimized;
    this.element.classList.toggle("minimized", this.#isCustomMinimized);
    game.settings.set(MODULE_NAME, "minimized", this.#isCustomMinimized);
    this.setPosition({ height: "auto", width: "auto" });
  }

  _formatTime(seconds, comps = null) {
    const calendar = game.time.calendar;
    try {
      if (!comps) comps = calendar.timeToComponents(seconds);
      let h = comps.hour;
      const m = String(comps.minute).padStart(2, "0");
      const s = String(comps.second).padStart(2, "0");

      if (game.settings.get(MODULE_NAME, "use12hour")) {
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12;
        h = h ? h : 12;
        return `${h}:${m}:${s} ${ampm}`;
      }

      const hString = String(h).padStart(2, "0");
      return `${hString}:${m}:${s}`;

    } catch (e) {
      console.error("Mini Calendar | Error formatting time:", e, { seconds });
      return "--:--:--";
    }
  }

  _getMoonPhasesForDay(dayTimestamp, moons, calendar) {
    const cacheKey = dayTimestamp;

    if (this.#moonPhaseCache.has(cacheKey)) {
      return this.#moonPhaseCache.get(cacheKey);
    }
    const phases = moons
      .map((moon) => this._calculateMoonPhase(dayTimestamp, moon, calendar))
      .filter((phase) => phase !== null)
      .filter((phase) => phase.daysIntoPhase === 0);
    this.#moonPhaseCache.set(cacheKey, phases);
    if (this.#moonPhaseCache.size > 100) {
      const firstKey = this.#moonPhaseCache.keys().next().value;
      this.#moonPhaseCache.delete(firstKey);
    }
    return phases;
  }

  _resetMoonCache() {
    this.#moonPhaseCache.clear();
    console.log("Mini Calendar | Moon phase cache cleared.");
  }

  /**
    * Register context menu entries and fire hooks.
    * @protected
    */
  _createContextMenus() {
    this._createContextMenu(this._getEntryContextOptions, ".day", {
      fixed: true,
      hookName: `get${this.documentName}ContextOptions`,
      parentClassHooks: false
    });
  }

  _getEntryContextOptions() {
    return [{
      name: "Set Date",
      icon: '<i class="fa-solid fa-calendar"></i>',
      condition: li => game.user.isGM && li.dataset.date,
      callback: li => {
        const dateStr = li.dataset.date;
        if (!dateStr) return;
        let date;
        try {
          date = JSON.parse(dateStr);
        } catch (e) {
          console.error("Mini Calendar | Failed to parse date data for context menu:", dateStr, e);
          return [];
        }
        this._contextSetTime(date);
      }
    }, {
      name: "Send to Chat",
      icon: '<i class="fa-solid fa-comment"></i>',
      condition: li => game.user.isGM && li.dataset.hasEvent === "true",
      callback: li => {
        const dateStr = li.dataset.date;
        if (!dateStr) return;
        let date;
        try {
          date = JSON.parse(dateStr);
        } catch (e) {
          console.error("Mini Calendar | Failed to parse date data for context menu:", dateStr, e);
          return [];
        }
        this._whisperToChat(date);
      }
    }, {
      name: "Set Weather",
      icon: '<i class="fas fa-cloud-sun"></i>',
      condition: li => game.user.isGM && li.dataset.date,
      callback: (li) => {
        const dateStr = li.dataset.date;
        if (!dateStr) return;
        const date = JSON.parse(dateStr);
        this._showWeatherOverrideDialog(date);
      },
    }, {
      name: "Generate Forecast",
      icon: '<i class="fas fa-sun"></i>',
      condition: li => game.user.isGM && li.dataset.date,
      callback: (li) => {
        const dateStr = li.dataset.date;
        if (!dateStr) return;
        const date = JSON.parse(dateStr);
        WeatherEngine.createForecasts(date);
      }
    }].concat();
  }


  _getFirstDayOfMonth(year, monthIndex) {
    const calendar = game.time.calendar;

    let dayOfYear = 0;
    for (let i = 0; i < monthIndex; i++) {
      const month = calendar.months.values[i];
      const isLeap = calendar.isLeapYear(year);
      const days = isLeap && month.leapDays != null ? month.leapDays : month.days;
      dayOfYear += days;
    }

    const components = {
      year: year,
      day: dayOfYear,
      hour: 0,
      minute: 0,
      second: 0,
    };

    try {
      return calendar.componentsToTime(components);
    } catch (e) {
      console.error("Mini Calendar | Error calculating first day of month:", e);
      return 0;
    }
  }

  /** Calculates moon phase info for a given timestamp and moon config */
  _calculateMoonPhase(timestamp, moonConfig, calendar) {
    try {



      if (
        !moonConfig.firstNewMoon ||
        typeof moonConfig.firstNewMoon.year !== "number" ||
        typeof moonConfig.firstNewMoon.month !== "number" ||
        typeof moonConfig.firstNewMoon.day !== "number"
      ) {
        console.warn(`Mini Calendar | Moon "${moonConfig.name}" missing valid firstNewMoon configuration.`);
        return null;
      }

      const referenceDateComps = {
        year: moonConfig.firstNewMoon.year,
        month: moonConfig.firstNewMoon.month - 1,
        day: moonConfig.firstNewMoon.day - 1,
        dayOfMonth: moonConfig.firstNewMoon.day - 1,
        hour: 0,
        minute: 0,
        second: 0,
      };

      const referenceTime = calendar.componentsToTime(referenceDateComps);
      const secondsPerDay = calendar.days.hoursPerDay * calendar.days.minutesPerHour * calendar.days.secondsPerMinute;
      const daysSinceReference = Math.floor((timestamp - referenceTime) / secondsPerDay);
      const cycleLengthDays = moonConfig.cycleLength;

      if (cycleLengthDays <= 0) return null;

      const adjustedDays =
        daysSinceReference >= 0
          ? daysSinceReference
          : daysSinceReference + Math.ceil(Math.abs(daysSinceReference) / cycleLengthDays) * cycleLengthDays;

      const dayInCycle = adjustedDays % cycleLengthDays;

      if (!Array.isArray(moonConfig.phases) || moonConfig.phases.length === 0) {
        console.warn(`Mini Calendar | Moon "${moonConfig.name}" missing valid phases configuration.`);
        return null;
      }

      let currentPhaseIndex = 0;
      let daysIntoPhase = dayInCycle;
      let cumulativeDays = 0;

      for (let i = 0; i < moonConfig.phases.length; i++) {
        const phase = moonConfig.phases[i];
        if (typeof phase.length !== "number" || phase.length <= 0) {
          console.warn(`Mini Calendar | Moon "${moonConfig.name}", Phase "${phase.name}" has invalid length.`);
          continue;
        }
        if (daysIntoPhase < phase.length) {
          currentPhaseIndex = i;
          break;
        }
        daysIntoPhase -= phase.length;
        cumulativeDays += phase.length;
      }

      if (currentPhaseIndex >= moonConfig.phases.length) {
        currentPhaseIndex = 0;
        daysIntoPhase = dayInCycle - cumulativeDays;
      }

      const currentPhase = moonConfig.phases[currentPhaseIndex];
      const daysUntilNext = currentPhase.length - daysIntoPhase;

      const phaseImages = {
        "new moon": "new.webp",
        "waxing crescent": "waxing-crescent.webp",
        "first quarter": "first-quarter.webp",
        "waxing gibbous": "waxing-gibbous.webp",
        "full moon": "full.webp",
        "waning gibbous": "waning-gibbous.webp",
        "last quarter": "last-quarter.webp",
        "waning crescent": "waning-crescent.webp",
      };

      const imageName = currentPhase.name ? phaseImages[currentPhase?.name.toLowerCase()] : '';
      const imagePath = imageName ? `modules/wgtgm-mini-calendar/ui/moons/${imageName}` : "icons/svg/circle.svg";

      return {
        name: moonConfig.name,
        phaseName: currentPhase?.name,
        phaseDisplayName: currentPhase?.display || currentPhase?.name,
        image: imagePath,
        color: moonConfig.color || "#ffffff",
        daysIntoPhase: Math.floor(daysIntoPhase),
        daysUntilNext: Math.ceil(daysUntilNext),
      };
    } catch (e) {
      console.error("Mini Calendar | Error calculating moon phase:", e, {
        timestamp,
        moonConfig,
      });
      return null;
    }
  }

  async _getNotesForDay(date, preFetchedJournal = null, preFetchedPageMap = null, preFetchedPlayerJournal = null, preFetchedPageMapPlayer = null) {
    let notes = [];
    const pageName = `${date.year}-${String(date.month + 1).padStart(2, "0")}-${String(date.day + 1).padStart(2, "0")}`;

    
    const cacheKey = pageName;
    if (this._todayNotesCache.dateKey === cacheKey && this._todayNotesCache.notes) {
      return foundry.utils.deepClone(this._todayNotesCache.notes);
    }

    const gmJournal = preFetchedJournal ?? game.journal.getName(calendarJournal);
    if (gmJournal) {
      const page = preFetchedPageMap ? preFetchedPageMap.get(pageName) : gmJournal.pages.getName(pageName);
      if (page) {
        const gmNotes = page.flags?.[MODULE_NAME]?.notes || [];
        
        gmNotes.forEach(n => {
          if (n.isPlayerNote === undefined) n.isPlayerNote = false;
          n.isGMNote = !n.isPlayerNote;
        });
        notes.push(...gmNotes);
      }
    }

    const pJournal = preFetchedPlayerJournal ?? game.journal.getName(playerJournalName);
    if (pJournal) {
      const pPage = preFetchedPageMapPlayer ? preFetchedPageMapPlayer.get(pageName) : pJournal.pages.getName(pageName);
      if (pPage) {
        const pNotes = pPage.flags?.[MODULE_NAME]?.notes || [];
        pNotes.forEach(n => n.isPlayerNote = true);
        notes.push(...pNotes);
      }
    }

    const recurringPageName = "0000-Recurring";
    const recurringPage = preFetchedPageMap ? preFetchedPageMap.get(recurringPageName) : gmJournal?.pages.getName(recurringPageName);

    if (recurringPage) {
      const recurringNotes = recurringPage.flags?.[MODULE_NAME]?.notes || [];
      const matches = recurringNotes.filter(n => this._checkRecurrence(n, date));
      matches.forEach(n => {
        n.isRecurringInstance = true;
        if (n.isPlayerNote === undefined) n.isPlayerNote = false;
      });
      notes = notes.concat(matches);
    }

    const recurringPagePlayer = preFetchedPageMapPlayer ? preFetchedPageMapPlayer.get(recurringPageName) : pJournal?.pages.getName(recurringPageName);
    if (recurringPagePlayer) {
      const recurringNotesPlayer = recurringPagePlayer.flags?.[MODULE_NAME]?.notes || [];
      const matchesPlayer = recurringNotesPlayer.filter(n => this._checkRecurrence(n, date));
      matchesPlayer.forEach(n => {
        n.isRecurringInstance = true;
        n.isPlayerNote = true;
      });
      notes = notes.concat(matchesPlayer);
    }
    this._todayNotesCache = { dateKey: cacheKey, notes: foundry.utils.deepClone(notes) };
    return notes;
  }

  _initializeViewState() {
    if (this.#viewMonth === null || this.#viewYear === null) {
      const currentComps = game.time.calendar.timeToComponents(game.time.worldTime);
      this.#viewMonth = currentComps.month;
      this.#viewYear = currentComps.year;
    }
  }

  static #_dayClickContext(event, target) {

    const dateStr = target.dataset.date;
    let date;
    try {
      date = JSON.parse(dateStr);
    } catch (e) {
      console.error("Mini Calendar | Failed to parse date data for context menu:", dateStr, e);
      return [];
    }

    this._onDayClick_ViewNote(event, date);


  }

  /** @inheritDoc */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    if (!this.hasFrame) return frame;

    let copyId = ``;
    const dockedState = game.settings.get(MODULE_NAME, "dockSidebar") ? "window-maximize" : "anchor";

    if (game.user.isGM) {
      const weatherEnabled = game.settings.get(MODULE_NAME, "enableWeatherEffects");
      const weatherTooltip = weatherEnabled ? "Disable Weather FX" : "Enable Weather FX";
      const currentState = game.settings.get(MODULE_NAME, "enableWeatherEffects");
      const soundEnabled = game.settings.get(MODULE_NAME, "enableWeatherSound");

      const soundTooltip = soundEnabled ? "Disable Weather Sounds" : "Enable Weather Sounds";
      const soundIcon = soundEnabled ? "fa-volume-high" : "fa-volume-xmark";


      const sceneTooltip = weatherEnabled ? "Disable Scene Weather FX" : "Enable Scene Weather FX";
      const sceneFlag = canvas?.scene?.getFlag(MODULE_NAME, "enableWeather") || false;


      copyId = `
          <button type="button" class="header-control fa-solid fa-calendar-plus icon" data-action="add-note-header" 
                  data-tooltip="Create Note" aria-label="Create Note"></button>
          <button type="button" class="header-control fa-solid ${soundIcon} icon" data-action="toggle-weather-sound"
                  data-tooltip="Stop Sound Effects" aria-label="Stop Sound Effects"></button>        
          <button type="button" class="header-control fa-solid fa-cloud-sun-rain icon ${currentState}" data-action="toggle-weather-fx"
                  data-tooltip="${weatherTooltip}" aria-label="Toggle Weather"></button>
          <button type="button" class="header-control fa-solid fa-map ${sceneFlag} icon" data-action="toggle-scene-fx"
                  data-tooltip="${sceneTooltip}" aria-label="Toggle Scene Weather"></button>
        `;
    }
    copyId += `<button type="button" class="header-control fa-solid fa-${dockedState} icon" data-action="set-dock"
                  data-tooltip="Toggle dock" aria-label="Toggle dock"></button>`
    this.window.close.insertAdjacentHTML("beforebegin", copyId);
    return frame;
  }

  static async #_toggleDock(event, target) {
    const dockedState = game.settings.get(MODULE_NAME, "dockSidebar");
    await game.settings.set(MODULE_NAME, "dockSidebar", !dockedState);
    target.classList.toggle("fa-window-maximize", !dockedState);
    target.classList.toggle("fa-anchor", dockedState);
    this.render(true);
  }


  async sceneFX() {
    if (!canvas.scene) return;
    const currentState = canvas.scene.getFlag(MODULE_NAME, "enableWeather");
    const newState = !currentState;
    await canvas.scene.setFlag(MODULE_NAME, "enableWeather", newState);
    if (newState) {
      
      await WeatherEngine.refreshWeather();
    } else {
      
      await WeatherEngine.disableWeatherEffect();
    }
    if (game.wgtngmMiniCalender.hud && game.wgtngmMiniCalender.hud.rendered) {
      game.wgtngmMiniCalender.hud.element.querySelector("[data-action='toggle-scene-weather']").classList.toggle('active', newState);
    }
    if (game.wgtngmMiniCalender && game.wgtngmMiniCalender.rendered) {
      game.wgtngmMiniCalender.element.querySelector("[data-action='toggle-scene-fx']").classList.toggle('true', newState);
    }
  }

  static async #_toggleSceneFX(event, target) {
    if (!canvas.scene || !game.user.isGM) return;
    this.sceneFX();
  }

  async weatherFX() {
    const currentState = game.settings.get(MODULE_NAME, "enableWeatherEffects");
    const newState = !currentState;
    await game.settings.set(MODULE_NAME, "enableWeatherEffects", newState);
    if (newState) {
      
      await WeatherEngine.refreshWeather();
    } else {
      
      await WeatherEngine.applyWeatherEffect("none");
    }
    if (game.wgtngmMiniCalender.hud && game.wgtngmMiniCalender.hud.rendered) {
      game.wgtngmMiniCalender.hud.element.querySelector("[data-action='toggle-weather']").classList.toggle('active', newState);
    }
    if (game.wgtngmMiniCalender && game.wgtngmMiniCalender.rendered) {
      game.wgtngmMiniCalender.element.querySelector("[data-action='toggle-weather-fx']").classList.toggle('true', newState);
    }
  }

  static async #_toggleWeatherFX(event, target) {
    this.weatherFX();
  }

  async weatherSound() {
    const currentState = game.settings.get(MODULE_NAME, "enableWeatherSound");
    const newState = !currentState;
    await game.settings.set(MODULE_NAME, "enableWeatherSound", newState);
    if (newState) {
      ui.notifications.info("Weather Sounds Enabled");
      await WeatherEngine.refreshWeather();
    } else {
      ui.notifications.info("Weather Sounds Disabled");
      await WeatherEngine.stopWeatherSounds();
    }
    if (game.wgtngmMiniCalender.hud && game.wgtngmMiniCalender.hud.rendered) {
      game.wgtngmMiniCalender.hud.element.querySelector("[data-action='toggle-sfx']").classList.toggle('active', newState);
    }
    if (game.wgtngmMiniCalender && game.wgtngmMiniCalender.rendered) {
      game.wgtngmMiniCalender.element.querySelector("[data-action='toggle-weather-sound']").classList.toggle('fa-volume-high', newState);
      game.wgtngmMiniCalender.element.querySelector("[data-action='toggle-weather-sound']").classList.toggle('fa-volume-xmark', !newState);
    }

  }

  static async #_toggleWeatherSound(event, target) {
    this.weatherSound();
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const calendar = game.time.calendar;

    if (!calendar) {
      return { ...context, error: "Calendar not available." };
    }

    this._initializeViewState();


    let weatherHistory = {};
    const hideWeatherPlayer = game.settings.get(MODULE_NAME, "hideWeatherPlayer");
    const enableWeatherForecast = game.settings.get(MODULE_NAME, "enableWeatherForecast");
    const showWeather = enableWeatherForecast && (game.user.isGM || !hideWeatherPlayer) ? true : false;

    const page = game.journal.getName(calendarJournal)?.pages.getName("Weather History");
    weatherHistory = page?.flags?.[MODULE_NAME]?.history || {};

    if (this.#viewMonth < 0 || this.#viewMonth >= calendar.months.values.length) {
      console.warn(`Mini Calendar | Invalid view month index (${this.#viewMonth}). Resetting.`);
      const currentComps = calendar.timeToComponents(game.time.worldTime);
      this.#viewMonth = currentComps.month;
      this.#viewYear = currentComps.year;
    }

    const currentMonth = calendar.months.values[this.#viewMonth];
    const rawMonthConfig = CONFIG.time.worldCalendarConfig.months.values[this.#viewMonth];
    const isIntercalary = rawMonthConfig?.intercalary === true;
    const nowComponents = calendar.timeToComponents(game.time.worldTime);
    const isCurrentGameMonthAndYear = this.#viewYear === nowComponents.year && this.#viewMonth === nowComponents.month;
    const mph = calendar.days.minutesPerHour;
    const spm = calendar.days.secondsPerMinute;
    const hpd = calendar.days.hoursPerDay;

    const currentSeconds = (nowComponents.hour * mph * spm) + (nowComponents.minute * spm) + nowComponents.second;

    const validHpd = Number.isFinite(hpd) ? hpd : 24;
    const validMph = Number.isFinite(mph) ? mph : 60;
    const validSpm = Number.isFinite(spm) ? spm : 60;


    const maxSeconds = (validHpd * validMph * validSpm) - 1;
    const stepSeconds = (validMph / 2) * validSpm;

    const days = [];

    const journal = game.journal.getName(calendarJournal);


    const pageMap = new Map();
    if (journal) {
      const currentMonthPrefix = `${this.#viewYear}-${String(this.#viewMonth + 1).padStart(2, "0")}`;

      journal.pages.forEach((page) => {
        if (page.name === "0000-Recurring" || page.name.startsWith(currentMonthPrefix)) {
          pageMap.set(page.name, page);
        }
      });
    }

    const playerJournal = game.journal.getName(playerJournalName);
    const pageMapPlayer = new Map();
    if (playerJournal) {
      const currentMonthPrefix = `${this.#viewYear}-${String(this.#viewMonth + 1).padStart(2, "0")}`;

      playerJournal.pages.forEach((page) => {
        if (page.name === "0000-Recurring" || page.name.startsWith(currentMonthPrefix)) {
          pageMapPlayer.set(page.name, page);
        }
      });
    }

    const isLeap = calendar.isLeapYear(this.#viewYear);
    const daysInMonth = isLeap && currentMonth.leapDays != null ? currentMonth.leapDays : currentMonth.days;

    const firstDayTimestamp = this._getFirstDayOfMonth(this.#viewYear, this.#viewMonth);
    const firstDayComponents = calendar.timeToComponents(firstDayTimestamp);
    const startingWeekday = firstDayComponents.dayOfWeek;

    for (let i = 0; i < startingWeekday; i++) {
      days.push({ isBlank: true });
    }

    const moons = CONFIG.time.worldCalendarConfig.moons?.values ?? [];

    if (daysInMonth > 0) {
      for (let i = 0; i < daysInMonth; i++) {
        const dayOfMonth = i;

        const dayTimestamp = firstDayTimestamp + i * 86400;

        let moonPhases = this._getMoonPhasesForDay(dayTimestamp, moons, calendar);

        const date = {
          year: this.#viewYear,
          month: this.#viewMonth,
          day: dayOfMonth,
        };

        const notes = await this._getNotesForDay(date, journal, pageMap, playerJournal, pageMapPlayer);
        const hasRecurring = notes.some(n => n.isRecurringInstance);
        const hasVisible = notes.some(n => n.playerVisible);
        const hasEvent = notes.length > 0;
        let noteIcon = "fas fa-book";
        if (notes.length > 1) {
          noteIcon = "fas fa-list";
        } else if (notes.length === 1) {
          noteIcon = notes[0].icon;
        }
        const noteTooltip = hasEvent ? notes.map((n) => `<p>${n.title}</p>`).join("") : "";
        const noteTooltipPlayerVisible = hasEvent ? notes.filter(n => n.playerVisible).map((n) => `<p>${n.title}</p>`).join("") : "";

        const key = `${this.#viewYear}-${this.#viewMonth}-${dayOfMonth}`;
        const weather = weatherHistory[key] || null;
        const weatherIcon = weather ? weather.icon : "";
        const weatherTooltip = weather ? `${weather.label} (${WeatherEngine.getTempDisplay(weather.temp)})` : "";

        days.push({
          isBlank: false,
          dayNumber: dayOfMonth + 1,
          date: date,
          isCurrentDay: isCurrentGameMonthAndYear && dayOfMonth === nowComponents.dayOfMonth,
          hasEvent: hasEvent,
          noteIcon: noteIcon,
          hasVisible: hasVisible,
          noteTooltip: noteTooltip,
          noteTooltipPlayerVisible: noteTooltipPlayerVisible,
          moonPhases: moonPhases,
          hasRecurring: hasRecurring,
          weatherIcon: weatherIcon,
          weatherTooltip: weatherTooltip,
          showWeather: showWeather
        });
      }
    }

    const weekdayNames = calendar.days.values.map((d) => game.i18n.localize(d.abbreviation) || game.i18n.localize(d.name).substring(0, 3));

    const daysInWeek = calendar.days.values.length;

    const currentMoon = moons
      .map((moon) => this._calculateMoonPhase(game.time.worldTime, moon, calendar))
      .filter((phase) => phase !== null);

    const currentDateObj = {
      year: nowComponents.year,
      month: nowComponents.month,
      day: nowComponents.dayOfMonth,
    };
    const currentNotes = await this._getNotesForDay(currentDateObj);
    const currentHasEvent = currentNotes.length > 0;
    const currentHasRecurring = currentNotes.some(n => n.isRecurringInstance);
    const currenthasVisible = currentNotes.some(n => n.playerVisible);
    const currentNoteIcon = currentHasEvent ? currentNotes[0].icon : "";
    const currentNoteTooltip = currentHasEvent ? currentNotes.map((n) => `<p>${n.title}</p>`).join("") : "";
    const currentNoteTooltipPlayerVisible = currentHasEvent ? currentNotes.filter(n => n.playerVisible).map((n) => `<p>${n.title}</p>`).join("") : "";


    const key = `${nowComponents.year}-${nowComponents.month}-${nowComponents.dayOfMonth}`;
    const currentWeather = weatherHistory[key] || null;
    const currentWeatherIcon = currentWeather ? currentWeather.icon : "";
    const currentWeatherTooltip = currentWeather ? `${currentWeather.label} (${WeatherEngine.getTempDisplay(currentWeather.temp)})` : "";


    return {
      ...context,
      isIntercalary: isIntercalary,
      monthName: game.i18n.localize(currentMonth.name),
      year: this.#viewYear,
      weekdays: weekdayNames,
      days: days,
      daysInWeek: daysInWeek,
      isGM: game.user.isGM,
      currentTime: this._formatTime(game.time.worldTime),
      isRunning: this.#isRunning,
      currentDay: nowComponents.dayOfMonth + 1,
      currentMonth: game.i18n.localize(calendar.months.values[nowComponents.month].name),
      currentYear: nowComponents.year,
      currentMoon: currentMoon,
      currentHasEvent: currentHasEvent,
      currenthasVisible: currenthasVisible,
      currentNoteIcon: currentNoteIcon,
      currentNoteTooltip: currentNoteTooltip,
      currentNoteTooltipPlayerVisible: currentNoteTooltipPlayerVisible,
      currentDate: currentDateObj,
      currentSeconds: currentSeconds,
      maxSeconds: maxSeconds,
      stepSeconds: stepSeconds,
      hasRecurring: currentHasRecurring,
      currentWeatherIcon: currentWeatherIcon,
      currentWeatherTooltip: currentWeatherTooltip,
      showWeather: showWeather
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const dockSidebar = game.settings.get(MODULE_NAME, "dockSidebar");
    const uiConfig = game.settings.get("core", "uiConfig") || {};
    const colorScheme = uiConfig.colorScheme;
    const systemTheme = matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light';
    const activeTheme = colorScheme?.interface || systemTheme;
    const dockedTheme = `theme-${activeTheme}`;


    if (dockSidebar) {
      const element = document.querySelector("#ui-left-column-1");
      if (!element.contains(this.element)) {
        this.element.classList.add("docked", dockedTheme);
        const players = element.querySelector("#players");

        players.after(this.element);
      }
    } else {
      this.element.classList.remove("docked");
      const classesToRemove = [...this.element.classList].filter(c => c.startsWith("theme-"));
      this.element.classList.remove(...classesToRemove);
      if (players && this.element.parentNode === players.parentNode) {
        document.body.appendChild(this.element);

        const saved = game.settings.get(MODULE_NAME, "calSheetDimensions");
        if (saved && saved.left && saved.top) {
          this.setPosition(saved);
        } else {
          this.setPosition({ top: 100, left: 100 });
        }
      }
    }

    this._cachedTimeDisplays = this.element?.querySelectorAll(".time-display");
    this._updateTimeOfDayClass(game.time.worldTime);
    this._updateWindowTitle();
    const header = this.element?.querySelector(".window-header");
    if (header) {
      header.removeEventListener("dblclick", this._boundToggleMinimize);
      this._boundToggleMinimize = this._toggleCustomMinimize.bind(this);
      header.addEventListener("dblclick", this._boundToggleMinimize);
    }
    const calendar = game.time.calendar;
    if (calendar && this.element) {
      const daysInWeek = calendar.days.values.length;
      const gridElement = this.element?.querySelector(".wgtngm-calendar-grid");
      if (gridElement) {
        gridElement.style.gridTemplateColumns = `repeat(${daysInWeek}, 1fr)`;
      }
    }

    const slider = this.element?.querySelector(".mini-time-slider");
    if (slider) {


      slider.addEventListener("input", (event) => {
        const val = parseInt(event.target.value);
        if (isNaN(val)) return;

        const mph = calendar.days.minutesPerHour;
        const spm = calendar.days.secondsPerMinute;

        const h = Math.floor(val / (mph * spm));
        const remainder = val % (mph * spm);
        const m = Math.floor(remainder / spm);
        const s = remainder % spm;


        const currentComps = calendar.timeToComponents(game.time.worldTime);
        const previewComps = {
          ...currentComps,
          hour: h,
          minute: m,
          second: s
        };
        const previewTimestamp = calendar.componentsToTime(previewComps);

        const timeString = this._formatTime(previewTimestamp);
        if (this._cachedTimeDisplays) {
          this._cachedTimeDisplays.forEach((el) => {
            el.textContent = timeString;
          });
        }

        this._updateTimeOfDayClass(previewTimestamp);
      });

      slider.addEventListener("change", async (event) => {
        event.target.blur();
        const newSecondsTotal = parseInt(event.target.value);
        if (isNaN(newSecondsTotal)) return;

        const mph = calendar.days.minutesPerHour;
        const spm = calendar.days.secondsPerMinute;

        if (!Number.isFinite(mph) || !Number.isFinite(spm) || mph <= 0 || spm <= 0) {
          console.error("Mini Calendar | Invalid mph/spm config:", { mph, spm });
          return;
        }

        const h = Math.floor(newSecondsTotal / (mph * spm));
        const remainder = newSecondsTotal % (mph * spm);
        const m = Math.floor(remainder / spm);
        const s = remainder % spm;

        const currentComps = calendar.timeToComponents(game.time.worldTime);
        const newTimeComps = {
          ...currentComps,
          hour: h,
          minute: m,
          second: s
        };

        if (isNaN(h) || isNaN(m) || isNaN(s)) {
          console.error("Mini Calendar | Attempted to set NaN time:", { h, m, s });
          ui.notifications.error("Mini Calendar: Calculation Error. Time not set.");
          return;
        }

        try {
          game.time.set(newTimeComps);

        } catch (e) {
          console.error("Mini Calendar | Slider Error:", e);
        }
      });
    }

    if (!this._positionObserver) {
      this._positionObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.attributeName === "style") {
            this._debouncedSavePosition();
            return;
          }
        }
      });
    }

    this._positionObserver.disconnect();
    this._positionObserver.observe(this.element, { attributes: true, attributeFilter: ["style"] });

    this._activateListeners(this.element);
  }

  async _onFirstRender(context, options) {
    game.settings.set(MODULE_NAME, "calSheetOpened", true);
    this._createContextMenus();

    this._initializeViewState();
    if (!this.#clockInterval) {
      let lastProcessedTime = null;

      this.#clockInterval = setInterval(() => {
        const currentWorldTime = game.time.worldTime;
        const slider = this.element?.querySelector(".mini-time-slider");
        if (slider && document.activeElement === slider) return;

        if (currentWorldTime === lastProcessedTime) return;
        lastProcessedTime = currentWorldTime;

        const currentComps = this.getCachedDateComponents(currentWorldTime);
        if (!currentComps) return;

        const timeString = this._formatTime(currentWorldTime, currentComps);
        if (this._cachedTimeDisplays) {
          this._cachedTimeDisplays.forEach((el) => {
            if (el.textContent !== timeString) el.textContent = timeString;
          });
        }
        this._updateTimeOfDayClass(currentWorldTime, currentComps);

        if (
          this.#viewYear === currentComps.year &&
          this.#viewMonth === currentComps.month &&
          this.lastRenderedDay !== currentComps.dayOfMonth
        ) {
          this.render();
        }
        this.lastRenderedDay = currentComps.dayOfMonth;
      }, 1000);
    }






    const fadedUI = game.settings.get(MODULE_NAME, "fadedUI");
    if (fadedUI) { this.element.classList.toggle("faded-ui", fadedUI); }



    const startMinimized = game.settings.get(MODULE_NAME, "startMinimized");
    const closedMinimized = game.settings.get(MODULE_NAME, "minimized");
    if (startMinimized || closedMinimized) {
      this.#isCustomMinimized = true;
      this.element.classList.toggle("minimized", this.#isCustomMinimized);
      this.setPosition({ height: "auto", width: "auto" });
    }
  }

  _onJournalUpdate = (page, changes, options, userId) => {
    if (this._suppressHook) return;
    const journalName = calendarJournal;
    const journal = game.journal.getName(journalName);
    if (!journal) {
      this._debouncedRender();
      return;
    }
    if (page.parent?.name !== journalName && page.parent?.name !== playerJournalName) return;
    if (page.name === "0000-Recurring") {
      this._debouncedRender();
      return;
    }
    try {
      const parts = page.name.split("-");
      if (parts.length >= 2) {
        const noteYear = parseInt(parts[0]);
        const noteMonthIndex = parseInt(parts[1]) - 1;
        if (noteYear === this.#viewYear && noteMonthIndex === this.#viewMonth) {
          this._debouncedRender();
        }
      } else {
        this._debouncedRender();
      }
    } catch (e) {
      console.warn("Mini Calendar | Error checking journal update:", e);
      this._debouncedRender();
    }

    this._todayNotesCache = { dateKey: null, notes: null };
    this._moonDarknessCache = { dayKey: null, isFullMoon: false, moonOverride: 0.7 };
  };

  _onUpdateWorldTime = (worldTime, dt) => {

    const calendar = game.time.calendar;
    const c = this.getCachedDateComponents(worldTime) || calendar.timeToComponents(worldTime);

    const timeKey = `${c.year}-${c.month}-${c.dayOfMonth}-${c.hour}-${c.minute}`;
    const dayKey = `${c.year}-${c.month}-${c.dayOfMonth}`;
    const hourKey = `${c.year}-${c.month}-${c.dayOfMonth}-${c.hour}`;

    if (this._lastCheckedMinute !== timeKey) {
      this._checkDailyEvents();


      if (game.user.isGM && game.settings.get(MODULE_NAME, "enableDarknessControl")) {
        this._updateSceneDarkness(worldTime);

      }

      this._lastCheckedMinute = timeKey;
    }

    if (this._lastCheckedHour !== hourKey) {
      this._lastCheckedHour = hourKey;
      if (game.user.isGM) {
        WeatherEngine.refreshWeather();
      }
    }

    if (this._lastCheckedDay !== dayKey) {
      this._lastCheckedDay = dayKey;

      
      this.#viewMonth = c.month;
      this.#viewYear = c.year;
      this._debouncedRender();
      this._debouncedRenderHud();

      if (game.user.isGM) {
        WeatherEngine.updateForecasts();
      }
      this._weatherToChat();
    }


    const timeString = this._formatTime(worldTime);



    if (this._sliderEl && document.activeElement !== this._sliderEl) {
      const mph = calendar.days.minutesPerHour;
      const spm = calendar.days.secondsPerMinute;
      const seconds = (c.hour * mph * spm) + (c.minute * spm) + c.second;
      this._sliderEl.value = seconds;
    }
  };

  /**
   * Checks the current game date for any unwhispered events and sends them to chat.
   */
  async _whisperToChat(date) {

    const notes = await this._getNotesForDay(date);
    if (!notes || notes.length === 0) return;
    const calendar = game.time.calendar;

    const newNotes = notes;
    if (newNotes.length === 0) return;

    const monthName = game.i18n.localize(calendar.months.values[date.month].name);
    const dayNum = date.day + 1;
    let content = `<h4>Events for ${monthName} ${dayNum}, ${date.year}</h4>`;

    newNotes.forEach((n) => {
      content += `<p><strong>${n.title}</strong><br/>${n.content}</p>`;
    });

    whisperChat(content);

  }


  async _weatherToChat() {
    const showWeather = game.settings.get(MODULE_NAME, "enableWeatherForecast");
    const broadcastWeather = game.settings.get(MODULE_NAME, "broadcastWeather");

    if (!showWeather || !broadcastWeather || !game.user.isGM) return;

    const calendar = game.time.calendar;

    const nowComponents = calendar.timeToComponents(game.time.worldTime);
    const dateKey = `${nowComponents.year}-${nowComponents.month}-${nowComponents.dayOfMonth}`;

    if (this.#lastWeatherBroadcastDate === dateKey) return;
    const storedDate = game.settings.get(MODULE_NAME, "lastWeatherBroadcastDate");
    if (storedDate === dateKey) {
      this.#lastWeatherBroadcastDate = dateKey;
      return;
    }
    await game.settings.set(MODULE_NAME, "lastWeatherBroadcastDate", dateKey);
    this.#lastWeatherBroadcastDate = dateKey;

    const page = game.journal.getName(calendarJournal)?.pages.getName("Weather History");
    const weatherHistory = page?.flags?.[MODULE_NAME]?.history || {};
    const currentWeather = weatherHistory[dateKey];

    if (!currentWeather) return;

    const currentWeatherIcon = currentWeather.icon ? `<i class="${currentWeather.icon}"></i>` : "";
    const currentTemp = WeatherEngine.getTempDisplay(currentWeather.temp) || "";
    const weatherLabel = currentWeather.label === "Aurora" ? "Clear" : currentWeather.label;

    let content = `<h3>${currentWeatherIcon} ${currentTemp}</h3><span style="font-size:16px">${weatherLabel}</span>`;

    broadcastChat(content);
  }

  async _checkDailyEvents() {
    if (!game.users.activeGM?.isSelf) return;

    const calendar = game.time.calendar;
    const currentComps = calendar.timeToComponents(game.time.worldTime);

    const date = {
      year: currentComps.year,
      month: currentComps.month,
      day: currentComps.dayOfMonth,
    };
    const dateKey = `${date.year}-${date.month}-${date.day}`;


    let notes = [];
    if (this._todayNotesCache.dateKey === dateKey && this._todayNotesCache.notes !== null) {
      notes = this._todayNotesCache.notes;
    } else {
      notes = await this._getNotesForDay(date);
      this._todayNotesCache = { dateKey, notes };
    }
    if (!notes || notes.length === 0) return;

    
    const whisperedIds = game.settings.get(MODULE_NAME, "whisperedNoteIds");
    const unwhisperedNotes = notes.filter((n) => !whisperedIds.includes(n.id));

    if (unwhisperedNotes.length === 0) return;

    let notesToWhisper = [];
    let newIdsToSave = [];

    for (const n of unwhisperedNotes) {
      let shouldSend = false;

      if (n.hour !== null && n.hour !== undefined) {
        const noteHour = n.hour;
        const noteMinute = n.minute || 0;

        if (currentComps.hour > noteHour || (currentComps.hour === noteHour && currentComps.minute >= noteMinute)) {
          shouldSend = true;
        }
      }
      else {
        shouldSend = true;
      }

      if (shouldSend) {
        notesToWhisper.push(n);
        newIdsToSave.push(n.id);
      }
    }

    if (notesToWhisper.length > 0) {
      const monthName = game.i18n.localize(calendar.months.values[date.month].name);
      const dayNum = date.day + 1;
      let content = `<h4>Events for ${monthName} ${dayNum}, ${date.year}</h4>`;

      notesToWhisper.forEach((n) => {
        const timeStr = (n.hour !== null && n.hour !== undefined)
          ? ` [${String(n.hour).padStart(2, '0')}:${String(n.minute || 0).padStart(2, '0')}]`
          : "";
        content += `<p><strong>${n.title}${timeStr}</strong><br/>${n.content}</p>`;
      });

      whisperChat(content);
    }

    if (newIdsToSave.length > 0 && game.user.isGM) {
      const updatedList = [...whisperedIds, ...newIdsToSave];
      game.settings.set(MODULE_NAME, "whisperedNoteIds", updatedList);
    }
  }


  _activateListeners(html) {
    if (!html) return;
    this._sliderEl = html.querySelector(".mini-time-slider");
    const mainGrid = html.querySelector(".wgtngm-calendar-grid");
    if (!mainGrid) return;
  }

  static #_weatherConfig(event) {
    const WeatherConfigDialog = new WeatherConfig();
    WeatherConfigDialog.render(true);
  }

  static #_addNoteHeader(event, target) {
    const nowComponents = game.time.calendar.timeToComponents(game.time.worldTime);
    const currentDateObj = {
      year: nowComponents.year,
      month: nowComponents.month,
      day: nowComponents.dayOfMonth,
    };
    this._showAddNoteDialog(currentDateObj, null, null, false);
  }

  static #_changeWeatherMini(event, target) {
    const nowComponents = game.time.calendar.timeToComponents(game.time.worldTime);
    const currentDateObj = {
      year: nowComponents.year,
      month: nowComponents.month,
      day: nowComponents.dayOfMonth,
    };
    this._showWeatherOverrideDialog(currentDateObj)
  }



  static #_addNoteMini(event, target) {
    const dateStr = target.dataset.date;
    let date;
    try {
      date = JSON.parse(dateStr);
    } catch (e) {
      console.error("Mini Calendar | Failed to parse date data for context menu:", dateStr, e);
      return [];
    }
    this._showAddNoteDialog(date, null, null, false);
  }

  static #_addNote(event, target) {
    const dateStr = target.dataset.date;
    let date;
    try {
      date = JSON.parse(dateStr);
    } catch (e) {
      console.error("Mini Calendar | Failed to parse date data for context menu:", dateStr, e);
      return [];
    }
    this._onDayClick_ViewNote(event, date);
  }

  static #_setDawn(event) {
    const { dawn } = this._getSunTimes();
    this._onSetTimeOfDay(dawn, 0);
  }

  static #_setDawnNext(event) {
    const { dawn } = this._getSunTimes();
    this._onSetTimeOfDay(dawn, 1);
  }

  static #_setSunset(event) {
    const { dusk } = this._getSunTimes();
    this._onSetTimeOfDay(dusk, 0);
  }

  static #_setNoon(event) {

    const hoursInDay = game.time.calendar.days.hoursPerDay;
    const noon = Math.floor(hoursInDay / 2);
    this._onSetTimeOfDay(noon, 0);
  }

  static #_setMidnight(event) {
    this._onSetTimeOfDay(0, 1);
  }

  static #_openSettings(event) {
    this._openSettings();
  }

  static #_subhour(event) {
    const secondsPerHour = game.time.calendar.days.minutesPerHour * game.time.calendar.days.secondsPerMinute || 3600;
    this._advanceTime(-secondsPerHour);
  }
  static #_subminute(event) {
    const secondsPerMinute = game.time.calendar.days.secondsPerMinute * 10 || 600;
    this._advanceTime(-secondsPerMinute);
  }
  static #_addhour(event) {
    const secondsPerHour = game.time.calendar.days.minutesPerHour * game.time.calendar.days.secondsPerMinute || 3600;
    this._advanceTime(secondsPerHour);
  }
  static #_addminute(event) {
    const secondsPerMinute = game.time.calendar.days.secondsPerMinute * 10 || 600;
    this._advanceTime(secondsPerMinute);
  }
  /**
   * Resets the calendar view to the current game time's month and year.
   */
  static #_onGoToday() {
    const calendar = game.time.calendar;
    if (!calendar) return;
    const currentComps = calendar.timeToComponents(game.time.worldTime);
    this.#viewMonth = currentComps.month;
    this.#viewYear = currentComps.year;
    console.log("Mini Calendar | Browsing to current date.");
    this.render();
  }

  async _saveNotesForDay(date, notes) {
    if (game.user.isGM) {
      
      const gmNotes = notes.filter(n => !n.isPlayerNote);
      const playerNotes = notes.filter(n => n.isPlayerNote);

      await this._saveNotesToSpecificJournal(date, gmNotes, calendarJournal);
      await this._saveNotesToSpecificJournal(date, playerNotes, playerJournalName);
    } else {
      const allowPlayerNotes = game.settings.get(MODULE_NAME, "allowPlayerNotes");
      if (allowPlayerNotes) {
        
        const myNotes = notes.filter(n => n.userId === game.user.id);
        await this._saveNotesToSpecificJournal(date, myNotes, playerJournalName);
      }
    }
  }

  async _saveNotesToSpecificJournal(date, notes, journalName) {
    let journal = game.journal.getName(journalName);

    if (!journal) {
      if (!game.user.isGM) {
        if (notes.length > 0) ui.notifications.warn(`The ${journalName} journal doesn't exist.`);
        return;
      }
      try {
        journal = await JournalEntry.create({ name: journalName });
      } catch (e) {
        console.error("Mini Calendar | Failed to create journal", e);
        return;
      }
    }
    const dailyNotes = notes.filter(n => !n.repeatUnit || n.repeatUnit === 'none');
    const recurringNotesToSave = notes.filter(n => n.repeatUnit && n.repeatUnit !== 'none');
    const day = date.day + 1;
    const pageName = `${date.year}-${String(date.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    let page = journal.pages.getName(pageName);

    if (!dailyNotes || dailyNotes.length === 0) {
      if (page) await page.delete();
    } else {
      let htmlContent = "";
      for (const note of dailyNotes) {
        htmlContent += `<h2><i class="${note.icon}"></i> ${note.title}</h2><p>${note.content}</p><hr>`;
      }
      const pageData = {
        "text.content": htmlContent,
        flags: { [MODULE_NAME]: { notes: dailyNotes } },
      };

      if (page) await page.update(pageData);
      else {
        const newPageData = foundry.utils.mergeObject(pageData, {
          name: pageName,
          "text.format": CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML,
        });
        await journal.createEmbeddedDocuments("JournalEntryPage", [newPageData]);
      }
    }
    if (recurringNotesToSave.length > 0) {
      const recPageName = "0000-Recurring";
      let recPage = journal.pages.getName(recPageName);
      let existingRecNotes = recPage?.flags?.[MODULE_NAME]?.notes || [];
      for (const newNote of recurringNotesToSave) {
        const idx = existingRecNotes.findIndex(n => n.id === newNote.id);
        if (idx > -1) existingRecNotes[idx] = newNote;
        else existingRecNotes.push(newNote);
      }
      let recHtml = "<h1>Recurring Events Index</h1>";
      existingRecNotes.forEach(n => {
        recHtml += `<p><strong>${n.title}</strong> (${n.repeatUnit})</p>`;
      });

      const recData = {
        "text.content": recHtml,
        flags: { [MODULE_NAME]: { notes: existingRecNotes } }
      };

      if (recPage) await recPage.update(recData);
      else {
        await journal.createEmbeddedDocuments("JournalEntryPage", [{
          name: recPageName,
          "text.format": CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML,
          ...recData
        }]);
      }
    }
  }



  /**
     * Shows the dialog to ADD or EDIT a single note using an HBS template.
     */
  async _showAddNoteDialog(date, noteToEdit = null, position = null, openViewNote = false) {
    const calendar = game.time.calendar;
    const hoursInDay = calendar.days.hoursPerDay || 24;
    const minutesInHour = calendar.days.minutesPerHour || 60;
    const moons = CONFIG.time.worldCalendarConfig.moons?.values || [];
    const currentTimeComps = game.time.calendar.timeToComponents(game.time.worldTime)

    const isLeap = calendar.isLeapYear(date.year);
    const monthData = calendar.months.values[date.month];
    const daysInMonth = (isLeap && monthData.leapDays !== undefined) ? monthData.leapDays : monthData.days;


    const isEditing = noteToEdit !== null;
    const title = isEditing ? "Edit Note" : "Add Note";
    const isAllDay = noteToEdit ? (noteToEdit.hour === null || noteToEdit.hour === undefined) : true;

    const renderData = {
      title: noteToEdit?.title || "",
      currentIcon: noteToEdit?.icon || "",
      pinTypes: PIN_TYPES,

      hasAdvanced: !!noteToEdit?.advancedRule && noteToEdit.advancedRule !== 'none',
      repeatCount: noteToEdit?.repeatCount || 0,
      repeatInterval: noteToEdit?.repeatInterval || 1,
      selectedRepeatUnit: (!noteToEdit?.repeatUnit || noteToEdit.repeatUnit === 'none') ? 'none' : noteToEdit.repeatUnit,
      repeatUnits: [
        { value: "none", label: "Never" },
        { value: "days", label: "Days" },
        { value: "months", label: "Months" },
        { value: "years", label: "Years" }
      ],

      selectedAdvancedRule: noteToEdit?.advancedRule || 'none',
      advancedRules: [
        { value: "lunar", label: "Lunar Phase" },
        { value: "weekday", label: "Nth Weekday (e.g. 2nd Tues)" },
        { value: "week_index", label: "Specific Week & Day" },
        { value: "random", label: "Random Occurrences" }
      ],
      advParams: {
        moonIndex: noteToEdit?.advParams?.moonIndex || 0,
        phaseIndex: noteToEdit?.advParams?.phaseIndex,


        lunarStartMonth: noteToEdit?.advParams?.lunarStartMonth || 0,
        lunarEndMonth: noteToEdit?.advParams?.lunarEndMonth || (calendar.months.values.length - 1),


        monthIndex_wk: noteToEdit?.advParams?.monthIndex_wk ?? -1,
        ordinal: noteToEdit?.advParams?.ordinal ?? 0,
        weekdayIndex: noteToEdit?.advParams?.weekdayIndex || 0,


        weekNum: noteToEdit?.advParams?.weekNum || 1,
        dayNum: noteToEdit?.advParams?.dayNum || 0,


        count: noteToEdit?.advParams?.count || 5,
        startMonth: noteToEdit?.advParams?.startMonth || 0,
        endMonth: noteToEdit?.advParams?.endMonth || 0
      },

      moonOptions: moons.map((m, i) => ({ index: i, name: m.name })),
      monthOptions: calendar.months.values.map((m, i) => ({ index: i, name: m.name })),
      weekdayOptions: calendar.days.values.map((d, i) => ({ index: i, name: game.i18n.localize(d.name) })),
      ordinalOptions: [
        { value: 0, label: "First" }, { value: 1, label: "Second" },
        { value: 2, label: "Third" }, { value: 3, label: "Fourth" },
        { value: -1, label: "Last" }
      ],
      allDay: isAllDay,
      timeDisplay: isAllDay ? "none" : "flex",
      selectedHour: noteToEdit?.hour || currentTimeComps?.hour || 0,
      selectedMinute: noteToEdit?.minute || currentTimeComps?.minute ||0,
      hourOptions: Array.from({ length: hoursInDay }, (_, i) => ({ value: i, label: String(i).padStart(2, "0") })),
      minuteOptions: Array.from({ length: Math.floor(minutesInHour) + 1 }, (_, i) => {
        const m = i;
        return m < minutesInHour ? { value: m, label: String(m).padStart(2, "0") } : null;
      }).filter(x => x),

      content: noteToEdit?.content || "",
      playerVisible: noteToEdit?.playerVisible || !game.user.isGM || false,


      isEditing: isEditing,
      editDate: date,
      yearOptions: Array.from({ length: 21 }, (_, i) => ({ value: (this.#viewYear - 10) + i })),
      monthOptions: calendar.months.values.map((m, i) => ({ index: i, name: game.i18n.localize(m.name) })),
      
      dayOptions: Array.from({ length: daysInMonth }, (_, i) => ({ value: i, label: i + 1 })),

    };

    const htmlContent = await foundry.applications.handlebars.renderTemplate("modules/wgtgm-mini-calendar/templates/add-note.hbs", renderData);

    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: title },
      content: htmlContent,
      classes: ["wgtngmMiniCalender-dialog", "dialog", "edit-note"],
      modal: false,
      close: (dialog) => {
      },
      render: (dialog) => {
        const el = dialog.target.element;
        const advCheck = el.querySelector("#use-advanced-check");
        const stdRepeat = el.querySelector(".repeat-standard");
        const advContainer = el.querySelector("#advanced-options-container");
        const ruleSelect = el.querySelector("#adv-rule-select");
        const subGroups = el.querySelectorAll(".adv-subgroup");
        const moonSelect = el.querySelector("select[name='adv_moonIndex']");
        const phaseSelect = el.querySelector("#adv-phase-select");


        const editMonth = el.querySelector("select[name='editMonth']");
        const editYear = el.querySelector("select[name='editYear']");
        const editDay = el.querySelector("select[name='editDay']");

        if (editMonth && editYear && editDay) {
          const updateDays = () => {
            const year = parseInt(editYear.value);
            const monthIndex = parseInt(editMonth.value);
            const monthData = game.time.calendar.months.values[monthIndex];
            const isLeap = game.time.calendar.isLeapYear(year);
            const daysInMonth = (isLeap && monthData.leapDays !== undefined) ? monthData.leapDays : monthData.days;
            let currentDayValue = parseInt(editDay.value);
            let newDayValue = Math.min(currentDayValue, daysInMonth - 1);
            let html = "";
            for (let i = 0; i < daysInMonth; i++) {
              html += `<option value="${i}" ${i === newDayValue ? "selected" : ""}>${i + 1}</option>`;
            }
            editDay.innerHTML = html;
            editDay.value = newDayValue;
            editDay.dispatchEvent(new Event('change', { bubbles: true }));
          };
          editMonth.addEventListener("change", updateDays);
          editYear.addEventListener("change", updateDays);
        }

        function updatePhases() {
          if (!moonSelect) return;
          const moonIdx = moonSelect.value;
          const moon = moons[moonIdx];
          let html = "";
          if (moon && moon.phases) {
            moon.phases.forEach((p, i) => {
              html += `<option value="${i}">${p.name}</option>`;
            });
          }
          phaseSelect.innerHTML = html;
          if (noteToEdit?.advParams?.phaseIndex !== undefined) phaseSelect.value = noteToEdit.advParams.phaseIndex;
        }

        function toggleAdvanced() {
          const isAdv = advCheck.checked;
          stdRepeat.style.display = isAdv ? "none" : "flex";
          advContainer.style.display = isAdv ? "block" : "none";
        }

        function toggleRules() {
          const rule = ruleSelect.value;
          subGroups.forEach(g => g.style.display = "none");
          const active = el.querySelector(`.adv-subgroup[data-type="${rule}"]`);
          if (active) active.style.display = "block";
        }

        if (moons.length > 0) updatePhases();
        toggleAdvanced();
        toggleRules();

        advCheck.addEventListener("change", toggleAdvanced);
        ruleSelect.addEventListener("change", toggleRules);
        if (moonSelect) moonSelect.addEventListener("change", updatePhases);

        const allDayBox = el.querySelector("#note-all-day");
        const timeContainer = el.querySelector("#note-time-container");
        allDayBox.addEventListener("change", (ev) => timeContainer.style.display = ev.target.checked ? "none" : "flex");

        const iconInput = el.querySelector("input[name='icon']");
        const iconPreview = el.querySelector("#icon-preview");
        iconInput.addEventListener("input", (ev) => iconPreview.className = ev.target.value);
      },
      ok: {
        label: "Save",
        icon: "fas fa-check",
        callback: (event, button, dialog) => {
          const form = button.form;
          if (!form.title.value.trim()) { ui.notifications.warn("Title is required."); return false; }
          dialog.element.style.display = "none";
          const newDate = {
            year: form.editYear ? parseInt(form.editYear.value) : date.year,
            month: form.editMonth ? parseInt(form.editMonth.value) : date.month,
            day: form.editDay ? parseInt(form.editDay.value) : date.day
          };
          const useAdv = form.useAdvanced.checked;
          const data = {
            targetDate: newDate,
            title: form.title.value.trim(),
            icon: form.icon.value || "fas fa-book",
            content: form.content.value,
            hour: form.allDay.checked ? null : parseInt(form.hour.value),
            minute: form.allDay.checked ? null : parseInt(form.minute.value),
            playerVisible: form.playerVisible.checked,
            startDate: date,
            repeatUnit: 'none'
          };
          if (useAdv) {
            data.advancedRule = form.advancedRule.value;
            data.advParams = {};
            if (data.advancedRule === 'lunar') {
              data.advParams = {
                moonIndex: parseInt(form.adv_moonIndex.value),
                phaseIndex: parseInt(form.adv_phaseIndex.value),
                lunarStartMonth: parseInt(form.adv_lunarStartMonth.value),
                lunarEndMonth: parseInt(form.adv_lunarEndMonth.value)
              };
              data.repeatUnit = 'advanced';
            } else if (data.advancedRule === 'weekday') {
              data.advParams = {
                ordinal: parseInt(form.adv_ordinal.value),
                weekdayIndex: parseInt(form.adv_weekdayIndex.value),
                monthIndex_wk: parseInt(form.adv_monthIndex_wk.value)
              };
              data.repeatUnit = 'advanced';
            } else if (data.advancedRule === 'week_index') {
              data.advParams = {
                weekNum: parseInt(form.adv_weekNum.value),
                dayNum: parseInt(form.adv_dayNum.value)
              };
              data.repeatUnit = 'advanced';
            } else if (data.advancedRule === 'random') {
              data.advParams = {
                count: parseInt(form.adv_count.value),
                startMonth: parseInt(form.adv_startMonth.value),
                endMonth: parseInt(form.adv_endMonth.value)
              };
              data.repeatUnit = 'advanced';
            }
          } else {
            data.repeatUnit = form.repeatUnit.value;
            data.repeatInterval = parseInt(form.repeatInterval.value);
            data.repeatCount = parseInt(form.repeatCount.value);
          }
          return data;
        },
      },
    });
    if (!result) return;

    await new Promise(resolve => setTimeout(resolve, 50));

    const newDate = result.targetDate;
    const dateChanged = isEditing && (
      newDate.year !== date.year ||
      newDate.month !== date.month ||
      newDate.day !== date.day
    );

    if (isEditing) {
      const wasRecurring = noteToEdit.repeatUnit && noteToEdit.repeatUnit !== 'none';
      if (wasRecurring) {
        await this._removeRecurringNote(noteToEdit.id);
      }
    }

    let freshNotes;
    if (dateChanged) {
      const oldMonthName = game.i18n.localize(calendar.months.values[date.month].name);
      const oldDialogId = `Notes for ${oldMonthName} ${date.day + 1}, ${date.year}`;
      const oldDialog = foundry.applications.instances.get(oldDialogId);
      if (oldDialog) oldDialog.close();
      await this._transactionalNoteUpdate(date, (notes) => {
        return notes.filter(n => n.id !== noteToEdit.id);
      });

      freshNotes = await this._transactionalNoteUpdate(newDate, (notes) => {
        const noteData = { ...noteToEdit, ...result };
        delete noteData.targetDate;
        notes.push(noteData);
        return notes;
      });
    } else {
      freshNotes = await this._transactionalNoteUpdate(date, (notes) => {
        const noteData = isEditing
          ? { ...noteToEdit, ...result }
          : {
            id: foundry.utils.randomID(),
            userId: game.user.id,
            isPlayerNote: !game.user.isGM, 
            ...result
          };

        delete noteData.targetDate;

        if (isEditing) {
          const idx = notes.findIndex(n => n.id === noteToEdit.id);
          if (idx > -1) notes.splice(idx, 1);
        }
        notes.push(noteData);
        return notes;
      });
    }

    if (openViewNote) {
      this._showViewNotesDialog(dateChanged ? newDate : date, freshNotes, position);
    }
  }

  _checkRecurrence(note, targetDate) {
    if (note.repeatUnit === 'advanced' && note.advancedRule) {
      const p = note.advParams;
      if (!p) return false;

      const calendar = game.time.calendar;
      const months = calendar.months.values;
      const moons = CONFIG.time.worldCalendarConfig.moons?.values || [];
      const daysInWeek = calendar.days.values.length || 7;

      switch (note.advancedRule) {
        case 'lunar': {

          const start = p.lunarStartMonth;
          const end = p.lunarEndMonth;
          const inRange = (start <= end)
            ? (targetDate.month >= start && targetDate.month <= end)
            : (targetDate.month >= start || targetDate.month <= end);

          if (!inRange) return false;


          let dayOfYear = 0;
          const isLeap = calendar.isLeapYear(targetDate.year);
          for (let i = 0; i < targetDate.month; i++) {
            const m = months[i];
            dayOfYear += (isLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
          }
          dayOfYear += targetDate.day;

          const timestamp = calendar.componentsToTime({
            year: targetDate.year, day: dayOfYear, hour: 0, minute: 0, second: 0
          });

          const moon = moons[p.moonIndex];
          if (!moon) return false;

          const phaseData = this._calculateMoonPhase(timestamp, moon, calendar);
          if (!phaseData) return false;

          const targetPhaseName = moon.phases[p.phaseIndex]?.name;
          return (phaseData.phaseName === targetPhaseName && phaseData.daysIntoPhase === 0);
        }

        case 'weekday': {
          if (p.monthIndex_wk !== -1 && targetDate.month !== p.monthIndex_wk) return false;


          let dayOfYear = 0;
          const isLeap = calendar.isLeapYear(targetDate.year);
          for (let i = 0; i < targetDate.month; i++) {
            const m = months[i];
            dayOfYear += (isLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
          }
          dayOfYear += targetDate.day;

          const timestamp = calendar.componentsToTime({
            year: targetDate.year, day: dayOfYear, hour: 0, minute: 0, second: 0
          });
          const comps = calendar.timeToComponents(timestamp);

          if (comps.dayOfWeek !== p.weekdayIndex) return false;
          const dayOfMonth = targetDate.day + 1;
          const occurrence = Math.ceil(dayOfMonth / daysInWeek);

          if (p.ordinal === -1) {
            const m = months[targetDate.month];
            const daysInMonth = (isLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
            return (dayOfMonth + daysInWeek > daysInMonth);
          } else {
            return (occurrence - 1) === p.ordinal;
          }
        }

        case 'week_index': {
          let dayOfYear = 0;
          const isLeap = calendar.isLeapYear(targetDate.year);
          for (let i = 0; i < targetDate.month; i++) {
            const m = months[i];
            dayOfYear += (isLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
          }
          dayOfYear += targetDate.day;

          const timestamp = calendar.componentsToTime({
            year: targetDate.year, day: dayOfYear, hour: 0, minute: 0, second: 0
          });
          const comps = calendar.timeToComponents(timestamp);

          if (comps.dayOfWeek !== p.dayNum) return false;
          const dayOfMonth = targetDate.day + 1;
          const occurrence = Math.ceil(dayOfMonth / daysInWeek);

          const m = months[targetDate.month];
          const daysInMonth = (isLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
          if (p.weekNum === -1) {
            const m = months[targetDate.month];
            const daysInMonth = (isLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
            console.log(dayOfMonth + daysInWeek > daysInMonth);
            return (dayOfMonth + daysInWeek > daysInMonth);
          } else {
            return (occurrence) === p.weekNum;
          }
        }

        case 'random': {
          let startM = p.startMonth;
          let endM = p.endMonth;
          const inRange = (startM <= endM)
            ? (targetDate.month >= startM && targetDate.month <= endM)
            : (targetDate.month >= startM || targetDate.month <= endM);

          if (!inRange) return false;


          const cyrb53 = (str, seed = 0) => {
            let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
            for (let i = 0, ch; i < str.length; i++) {
              ch = str.charCodeAt(i);
              h1 = Math.imul(h1 ^ ch, 2654435761);
              h2 = Math.imul(h2 ^ ch, 1597334677);
            }
            h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
            h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
            return 4294967296 * (2097151 & h2) + (h1 >>> 0);
          };

          const seed = cyrb53(`${note.id}-${targetDate.year}`);
          let state = seed;
          const nextRandom = () => {
            let t = state += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
          };

          const pool = [];
          const isLeap = calendar.isLeapYear(targetDate.year);
          const mCount = months.length;
          for (let mIdx = 0; mIdx < mCount; mIdx++) {
            let active = (startM <= endM) ? (mIdx >= startM && mIdx <= endM) : (mIdx >= startM || mIdx <= endM);
            if (active) {
              const m = months[mIdx];
              const days = (isLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
              for (let d = 0; d < days; d++) {
                pool.push({ m: mIdx, d: d });
              }
            }
          }

          let m = pool.length, t, i;
          while (m) {
            i = Math.floor(nextRandom() * m--);
            t = pool[m];
            pool[m] = pool[i];
            pool[i] = t;
          }

          const selected = pool.slice(0, p.count);
          return selected.some(x => x.m === targetDate.month && x.d === targetDate.day);
        }
      }
      return false;
    }

    if (!note.repeatUnit || note.repeatUnit === 'none') return false;
    const start = note.startDate;
    const interval = parseInt(note.repeatInterval) || 1;
    const count = parseInt(note.repeatCount) || 0;
    const unit = String(note.repeatUnit).toLowerCase();
    const calendar = game.time.calendar;

    if (targetDate.year < start.year) return false;
    if (targetDate.year === start.year && targetDate.month < start.month) return false;
    if (targetDate.year === start.year && targetDate.month === start.month && targetDate.day < start.day) return false;

    let isMatch = false;
    let occurrenceIndex = 0;

    if (unit === 'years') {
      const yearDiff = targetDate.year - start.year;
      if (yearDiff >= 0 && yearDiff % interval === 0) {
        if (targetDate.month === start.month && targetDate.day === start.day) {
          isMatch = true;
          occurrenceIndex = yearDiff / interval;
        }
      }
    } else if (unit === 'months') {
      const monthDiff = (targetDate.year - start.year) * calendar.months.values.length + (targetDate.month - start.month);
      if (monthDiff >= 0 && monthDiff % interval === 0) {
        if (targetDate.day === start.day) {
          isMatch = true;
          occurrenceIndex = monthDiff / interval;
        }
      }
    } else {
      const getTimestamp = (d) => {
        let dayOfYear = 0;
        for (let i = 0; i < d.month; i++) {
          const m = calendar.months.values[i];
          const isLeap = calendar.isLeapYear(d.year);
          const mDays = isLeap && m.leapDays != null ? m.leapDays : m.days;
          dayOfYear += mDays;
        }
        dayOfYear += d.day;
        return calendar.componentsToTime({
          year: d.year, day: dayOfYear, hour: 0, minute: 0, second: 0
        });
      };

      const startTime = getTimestamp(start);
      const targetTime = getTimestamp(targetDate);
      const secondsPerDay = calendar.days.hoursPerDay * calendar.days.minutesPerHour * calendar.days.secondsPerMinute;
      const diffSeconds = targetTime - startTime;
      const diffDays = Math.round(diffSeconds / secondsPerDay);

      if (diffDays >= 0 && diffDays % interval === 0) {
        isMatch = true;
        occurrenceIndex = diffDays / interval;
      }
    }

    if (isMatch && count > 0 && occurrenceIndex >= count) return false;
    return isMatch;
  }


  /**
   * Helper to perform a safe Read-Modify-Write operation on notes.
   * This minimizes race conditions by applying changes to the latest data immediately before saving.
   * @param {object} date - {year, month, day}
   * @param {Function} mutationFn - A function that takes the current notes array and modifies it.
   */
  async _transactionalNoteUpdate(date, mutationFn) {
    const isPlayer = !game.user.isGM;
    const currentNotes = await this._getNotesForDay(date);

    const notesCopy = foundry.utils.deepClone(currentNotes);
    const updatedNotes = mutationFn(notesCopy);

    let notesToSave;
    if (isPlayer) {
      notesToSave = updatedNotes.filter(n => n.userId === game.user.id);
    } else {
      notesToSave = updatedNotes;
    }

    this._suppressHook = true;
    try {
      await this._saveNotesForDay(date, notesToSave);
    } finally {
      this._suppressHook = false;
      this._debouncedRender();
    }

    this._todayNotesCache = { dateKey: null, notes: null };

    return updatedNotes;
  }

  /**
    * Shows the "List" dialog for all notes on a given day.
    * @param {object} date - The date object {year, month, day}
    * @param {Array} notes - The array of note objects for that day.
    */
  async _showViewNotesDialog(date, notes, openPosition = null) {
    await new Promise(r => setTimeout(r, 0));

    if (!notes) {
      notes = await this._getNotesForDay(date);
    }
    let position = {};
    if (openPosition) {
      position = openPosition;
    }

    const isGM = game.user.isGM;
    const allowPlayerNotes = game.settings.get(MODULE_NAME, "allowPlayerNotes"); //

    notes.sort((a, b) => {
      const aAllDay = a.hour === null || a.hour === undefined;
      const bAllDay = b.hour === null || b.hour === undefined;

      if (aAllDay && !bAllDay) return -1;
      if (!aAllDay && bAllDay) return 1;
      if (aAllDay && bAllDay) return a.title.localeCompare(b.title);

      if (a.hour !== b.hour) return a.hour - b.hour;
      return (a.minute || 0) - (b.minute || 0);
    });

    let notesHTML = notes
      .map(
        (note) => {
          const isAuthor = note.userId === game.user.id;
          if (!isGM && !note.playerVisible && !isAuthor) return "";
          const hasTime = note.hour !== null && note.hour !== undefined;
          const noteTime = hasTime ? `${String(note.hour).padStart(2, '0')}:${String(note.minute || 0).padStart(2, '0')}` : '';

          const isRepeating = note.repeatUnit && note.repeatUnit !== 'none';
          const repeatIcon = isRepeating ? '<i class="fas fa-repeat" title="Repeating Event" style="margin-right: 5px; font-size: 0.8em; opacity: 0.7;"></i>' : '<span></span>';

          const canUserEdit = isGM || (allowPlayerNotes && note.userId === game.user.id); //

          const isHidden = note?.playerVisible ? '' : '-slash';
          const isVisibleIcon = `<i class="fas fa-eye${isHidden} note-control" title="playerVisible" data-action="visible-toggle" data-note-id="${note.id}" style="margin-right: 5px; font-size: 0.8em; opacity: 0.7;"></i>`;
          const playerIndicator = note.isPlayerNote ? ` <i class="fas fa-user" style="font-size:10px"></i> ` : '';
          return `
            <div class="calendar-note-item" data-note-id="${note.id}" ${canUserEdit ? `data-action="edit-note"` : ''}>
                <span class="note-header">
                <span class="note-title">
                    <i class="${note.icon || "fas fa-book"}"></i>
                    ${foundry.utils.escapeHTML(note.title)}${playerIndicator}</span>
                  ${noteTime ? `<span class="note-time">
                    <i class="fas fa-clock"></i> ${noteTime}
                  </span>`: ''}
                    ${repeatIcon}
                    ${isGM ? isVisibleIcon : ''}
                    ${canUserEdit ? `<i class="fas fa-trash note-control" data-action="delete-note" title="Delete Note"></i>` : ''}
                </span>

                <div class="note-content">
                    ${foundry.utils.escapeHTML(note.content) || "<em>No content.</em>"}
                </div>
            </div>
        `;
        }
      )
      .join("");

    if (notes.length === 0) {
      notesHTML = "<p class='no-notes'><em>No notes for this day.</em></p>";
    }

    const calendar = game.time.calendar;
    const monthName = game.i18n.localize(calendar.months.values[date.month].name);
    const day = date.day + 1;

    const content = `
                ${notesHTML}
        `;
    const prepareButtons = [
      {
        action: "cancel",
        label: "Close",
        callback: () => null,
      }
    ];

    if (isGM || allowPlayerNotes) {
      prepareButtons.push({
        action: "export",
        label: "Add Note",
        icon: "fas fa-calendar-plus",
        default: true,
        callback: (event, button, data) => {
          this._showAddNoteDialog(date, null, data?.position, true);
        },
      });
    }

    const data = await foundry.applications.api.DialogV2.wait({
      window: {
        title: `Notes for ${monthName} ${day}, ${date.year}`,
        resizable: true,
      },
      position: position,
      content: content,
      id: `Notes for ${monthName} ${day}, ${date.year}`,
      classes: ["wgtngmMiniCalender-dialog", "dialog", "add-note"],
      modal: false,
      buttons: prepareButtons,
      close: () => {
      },
      render: (dialog) => {
        dialog.target.element.querySelectorAll('[data-action="edit-note"]').forEach((btn) => {
          btn.addEventListener("click", (event) => {
            const noteId = event.target.closest("[data-note-id]")?.dataset.noteId;
            const note = notes.find((n) => n.id === noteId);
            if (note) {
              this._showAddNoteDialog(date, note, dialog.target?.position, true);
            }
          });
        });
        dialog.target.element.querySelectorAll('[data-action="delete-note"]').forEach((btn) => {
          btn.addEventListener("click", (event) => {
            event.stopPropagation();
            const noteId = event.target.closest("[data-note-id]")?.dataset.noteId;
            if (noteId) {
              this._handleDeleteNote(dialog.target?.position, date, notes, noteId);
            }
          });
        });
        dialog.target.element.querySelectorAll('[data-action="visible-toggle"]').forEach((btn) => {
          btn.addEventListener("click", (event) => {
            event.stopPropagation();
            const noteId = event.target.closest("[data-note-id]")?.dataset.noteId;
            if (noteId) {
              this._toggleVisibility(dialog.target?.position, date, notes, noteId);
            }
          });
        });
      },
    }).catch(() => null);
  }


  async _toggleVisibility(parentDialog, date, notes, noteId) {
    const note = notes.find(n => n.id === noteId);

    if (note && note.repeatUnit && note.repeatUnit !== 'none') {
      const journal = game.journal.getName(calendarJournal);
      const recPage = journal?.pages.getName("0000-Recurring");

      if (recPage) {
        let recNotes = recPage.flags[MODULE_NAME]?.notes || [];
        const index = recNotes.findIndex(n => n.id === noteId);

        if (index > -1) {
          recNotes[index].playerVisible = !recNotes[index].playerVisible;
          await recPage.update({
            flags: { [MODULE_NAME]: { notes: recNotes } }
          });

          note.playerVisible = recNotes[index].playerVisible;
        }
      }
    }
    else {
      await this._transactionalNoteUpdate(date, (currentNotes) => {
        const index = currentNotes.findIndex((n) => n.id === noteId);
        if (index > -1) {
          currentNotes[index].playerVisible = !currentNotes[index].playerVisible;
        }
        return currentNotes;
      });
    }

    this.render();

    if (parentDialog) {
      this._showViewNotesDialog(date, null, parentDialog);
    }
  }

  async _removeRecurringNote(noteId) {
    const journalsToCheck = [
      game.journal.getName(calendarJournal),
      game.journal.getName(playerJournalName)
    ];

    for (const journal of journalsToCheck) {
      if (!journal) continue;
      const recPage = journal.pages.getName("0000-Recurring");
      if (!recPage) continue;

      let recNotes = recPage.flags[MODULE_NAME]?.notes || [];
      const initialLength = recNotes.length;

      recNotes = recNotes.filter(n => n.id !== noteId);

      if (recNotes.length !== initialLength) {
        await recPage.update({
          flags: { [MODULE_NAME]: { notes: recNotes } }
        });
        console.log(`Mini Calendar | Removed recurring note ${noteId} from ${journal.name}`);
      }
    }
  }



  async _handleDeleteNote(parentDialog, date, notes, noteId) {
    const noteToDelete = notes.find(n => n.id === noteId);
    if (!noteToDelete) return;

    const isGM = game.user.isGM;
    const allowPlayerNotes = game.settings.get(MODULE_NAME, "allowPlayerNotes");
    const isOwner = noteToDelete.userId === game.user.id;

    if (!isGM && !(allowPlayerNotes && isOwner)) {
      ui.notifications.warn("You do not have permission to delete this note.");
      return;
    }

    if (noteToDelete.repeatUnit && noteToDelete.repeatUnit !== 'none') {
      await this._removeRecurringNote(noteId);
    } else {
      await this._transactionalNoteUpdate(date, (currentNotes) => {
        return currentNotes.filter((n) => n.id !== noteId);
      });
    }

    this.render();
    if (parentDialog) {
      this._showViewNotesDialog(date, null, parentDialog);
    }
  }

  async close(options = {}) {
    if (options.closeKey) {
      return;
    }

    if (this.#clockInterval) {
      clearInterval(this.#clockInterval);
      this.#clockInterval = null;
    }

    this.#lastTimeState = null;

    if (this.position) {
      const { width, height, left, top } = this.position;
      const saved = game.settings.get(MODULE_NAME, "calSheetDimensions");
      if (saved.width !== width || saved.height !== height || saved.left !== left || saved.top !== top) {
        await game.settings.set(MODULE_NAME, "calSheetDimensions", { width, height, left, top });
      }
    }
    game.settings.set(MODULE_NAME, "calSheetOpened", false);

    this._cachedTimeDisplays = null;
    if (this._positionObserver) {
      this._positionObserver.disconnect();
      this._positionObserver = null;
    }
    return super.close(options);
  }


  async _onDayClick_ViewNote(event, date) {
    const notes = await this._getNotesForDay(date);
    const isGM = game.user.isGM;
    const allowPlayerNotes = game.settings.get(MODULE_NAME, "allowPlayerNotes");

    if (!isGM) {
      if (allowPlayerNotes) {
        this._showViewNotesDialog(date, notes);
      } else if (notes.length > 0 && notes.some(n => n.playerVisible)) {
        this._showViewNotesDialog(date, notes);
      }
    } else {
      if (notes.length === 0) {
        this._showAddNoteDialog(date);
      } else {
        this._showViewNotesDialog(date, notes);
      }
    }
  }





  async _contextSetTime(date) {
    if (!game.user.isGM) return;
    const { dawn } = this._getSunTimes();
    const calendar = game.time.calendar;
    if (date.month < 0 || date.month >= calendar.months.values.length) return;

    try {
      let dayOfYear = 0;
      const isLeap = calendar.isLeapYear(date.year);
      for (let i = 0; i < date.month; i++) {
        const month = calendar.months.values[i];
        const daysInMonth = isLeap && month.leapDays != null ? month.leapDays : month.days;
        dayOfYear += daysInMonth;
      }
      dayOfYear += date.day;

      const yearZero = CONFIG.time.worldCalendarConfig?.years?.yearZero || 0;
      const systemYear = date.year;


      const newTimeComps = {
        year: systemYear,
        day: dayOfYear,
        hour: dawn,
        minute: 0,
        second: 0,
      };
      game.time.set(newTimeComps);


      this.#viewYear = date.year;
      this.#viewMonth = date.month;

      const monthName = calendar.months.values[date.month].name;
      const dayNum = date.day + 1;
      ui.notifications.info(`World time set to ${game.i18n.localize(monthName)} ${dayNum}, ${date.year}.`);
      this.render();
    } catch (e) {
      console.error("Mini Calendar | Error setting world time:", e, { date });
      ui.notifications.error("Failed to set world time.");
    }
  }

  /** Navigate months */
  async _browseMonth(delta) {
    const calendar = game.time.calendar;

    this._initializeViewState();

    let newMonth = this.#viewMonth + delta;
    let newYear = this.#viewYear;

    const monthsPerYear = calendar.months.values.length;
    while (newMonth < 0) {
      newMonth += monthsPerYear;
      newYear--;
    }
    while (newMonth >= monthsPerYear) {
      newMonth -= monthsPerYear;
      newYear++;
    }

    this.#viewMonth = newMonth;
    this.#viewYear = newYear;

    const currentMonthData = calendar.months.values[this.#viewMonth];
    const isLeap = calendar.isLeapYear(this.#viewYear);
    const daysInMonth = isLeap && currentMonthData.leapDays != null
      ? currentMonthData.leapDays
      : currentMonthData.days;

    if (daysInMonth === 0) {
      await this._browseMonth(delta);
      return;
    }


    console.log(
      `Mini Calendar | Browsing to month ${newMonth} (${calendar.months.values[newMonth].name}), year ${newYear}`,
    );
    this.render();
  }

  static async #_onPrevMonth(event) {
    await this._browseMonth(-1);
  }

  static async #_onNextMonth(event) {
    await this._browseMonth(1);
  }

  static async #_onSetYear(event) {
    await this._showSetYearDialog();
  }

  /** Show dialog to set year */
  async _showSetYearDialog() {
    const calendar = game.time.calendar;
    const currentViewYear = this.#viewYear;

    const content = `
            <p>Enter the year to view in the calendar:</p>
            <div class="form-group">
                <label>Year:</label>
                <input type="number" name="year" value="${currentViewYear}" step="1" style="width: 100px;" autofocus />
            </div>
            ${game.user.isGM ? '<p class="notes"><input type="checkbox" name="setWorldTime" id="set-world-time" /> <label for="set-world-time">Set world time to this year</label></p>' : ""}
        `;

    const result = await foundry.applications.api.DialogV2.prompt({
      title: "Go To Year",
      content: content,
      rejectClose: false,
      modal: false,
      classes: ["wgtngmMiniCalender-dialog", "dialog", "set-year", "wgtngmMiniCalender"],
      ok: {
        label: "Go",
        icon: "fas fa-check",
        callback: (event, button, dialog) => {
          const form = button.form;
          return {
            year: parseInt(form.year.value),
            setWorldTime: form.setWorldTime?.checked || false,
          };
        },
      },
    });

    if (!result || isNaN(result.year)) return;

    const newYear = parseInt(result.year);
    if (isNaN(newYear)) {
      ui.notifications.warn("Invalid year entered.");
      return;
    }

    this.#viewYear = newYear;

    if (game.user.isGM && result.setWorldTime) {
      try {
        const currentTimeComps = calendar.timeToComponents(game.time.worldTime);
        const yearZero = CONFIG.time.worldCalendarConfig?.years?.yearZero || 0;
        const systemYear = newYear;

        const newTimeComps = {
          year: systemYear,
          month: currentTimeComps.month,
          dayOfMonth: currentTimeComps.dayOfMonth,
          hour: currentTimeComps.hour,
          minute: currentTimeComps.minute,
          second: currentTimeComps.second,
        };

        const monthData = calendar.months.values[newTimeComps.month];
        const daysInMonth = calendar.isLeapYear(newYear) ? (monthData.leapDays ?? monthData.days) : monthData.days;

        newTimeComps.dayOfMonth = Math.min(newTimeComps.dayOfMonth, Math.max(0, daysInMonth - 1));


        game.time.set(newTimeComps);

        ui.notifications.info(`Viewing year ${newYear} and world time updated.`);
      } catch (e) {
        console.error("Mini Calendar | Error setting year:", e, { newYear });
        ui.notifications.error("Failed to set world time, but calendar view updated.");
      }
    } else {
      ui.notifications.info(`Now viewing year ${newYear}.`);
    }

    this.render();
  }

  /**
   * Shows a dialog to set only the time (HH:MM:SS) for the CURRENT game day.
   */
  static async #_showSetTimeDialog() {
    if (!game.user.isGM) return;
    const calendar = game.time.calendar;
    const timeLimits = calendar.days;
    const maxHour = timeLimits.hoursPerDay - 1;
    const maxMinute = timeLimits.minutesPerHour - 1;
    const maxSecond = timeLimits.secondsPerMinute - 1;

    const currentComps = calendar.timeToComponents(game.time.worldTime);

    const content = `
            <div class="form-group">
                <label>Set Time (HH:MM:SS):</label>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <input type="number" name="hour" value="${currentComps.hour}" min="0" max="${maxHour}" placeholder="HH" style="flex: 1; text-align: center;">
                    <span>:</span>
                    <input type="number" name="minute" value="${currentComps.minute}" min="0" max="${maxMinute}" placeholder="MM" style="flex: 1; text-align: center;">
                    <span>:</span>
                    <input type="number" name="second" value="${currentComps.second}" min="0" max="${maxSecond}" placeholder="SS" style="flex: 1; text-align: center;">
                </div>
                 <p class="notes" style="font-size: 0.8em; margin-top: 5px; color: var(--color-text-light-2);">
                   Limits: ${maxHour}h ${maxMinute}m ${maxSecond}s
                </p>
            </div>
        `;

    const result = await foundry.applications.api.DialogV2.prompt({
      title: "Set World Time",
      content: content,
      classes: ["wgtngmMiniCalender", "dialog", "showSetTime"],
      rejectClose: false,
      modal: false,
      ok: {
        label: "Set Time",
        icon: "fas fa-check",
        callback: (event, button, dialog) => {
          const form = button.form;
          return {
            hour: parseInt(form.hour.value, 10) || 0,
            minute: parseInt(form.minute.value, 10) || 0,
            second: parseInt(form.second.value, 10) || 0,
          };
        },
      },
    });

    if (!result) return;

    const { hour, minute, second } = result;
    if (!game.user.isGM) return;

    try {
      const comps = calendar.timeToComponents(game.time.worldTime);
      comps.hour = hour;
      comps.minute = minute;
      comps.second = second;  
      game.time.set(comps);

      this.render();
    } catch (e) {
      console.error("Mini Calendar | Error setting time:", e);
      ui.notifications.error("Failed to set the time.");
    }


  }

  /**
     * Sets the game time to a specific hour of the current (or offset) day.
     * @param {number} [day=0] - The day offset (0 = today, 1 = tomorrow).
     * @param {number|string} [hour=0] - The hour (0-23) OR a keyword: "dawn", "dusk", "noon", "midnight".
     */
  static async setDayHour(day = 0, hour = 0) {
    const instance = game.wgtngmMiniCalender;
    if (!instance) {
      console.warn("Mini Calendar | Instance not ready.");
      return;
    }

    let targetHour = hour;

    if (typeof hour === "string") {
      const { dawn, dusk } = instance._getSunTimes();
      const mode = hour.toLowerCase();

      if (mode === "dawn") targetHour = dawn;
      else if (mode === "dusk") targetHour = dusk;
      else if (mode === "noon") targetHour = Math.floor(game.time.calendar.days.hoursPerDay / 2);
      else if (mode === "midnight") targetHour = 0;
      else targetHour = parseFloat(hour) || 0;
    }

    await instance._onSetTimeOfDay(targetHour, day);
    renderCalendarIfOpen();
  }

  /** Set specific time of day (e.g., Dawn/Sunset) */
  async _onSetTimeOfDay(hour, dayDelta = 0) {
    if (!game.user.isGM) return;

    const calendar = game.time.calendar;
    try {
      const comps = calendar.timeToComponents(game.time.worldTime);
      const yearZero = CONFIG.time.worldCalendarConfig?.years?.yearZero || 0;

      const systemYear = comps.year;
      const newComps = {
        year: systemYear,
        month: comps.month,
        day: comps.day + dayDelta,
        dayOfMonth: comps.dayOfMonth + dayDelta,
        hour: hour,
        minute: 0,
        second: 0,
      };

      game.time.set(newComps);


      const updatedComps = calendar.timeToComponents(game.time.worldTime);
      this.#viewYear = updatedComps.year;
      this.#viewMonth = updatedComps.month;

      this.render();
    } catch (e) {
      console.error("Mini Calendar | Error setting time:", e);
      ui.notifications.error("Failed to set the time.");
    }
  }


  togglePlayback() {
    if (!game.user.isGM) return;
    this.#isRunning = !this.#isRunning;
    game.settings.set(MODULE_NAME, "timeIsRunning", this.#isRunning);

    if (this.#isRunning) {
      this._startTime();
    } else {
      this._stopTime();
    }
    this.render();
    if (game.wgtngmMiniCalender.hud) game.wgtngmMiniCalender.hud.render();
  }


  /** Toggle automatic time advancement */
  static #_togglePlay() {
    this.togglePlayback();
  }

  _startTime() {
    if (!game.user.isGM) return;

    if (game.paused) {
      this.wasPausedForGame = true;
      return;
    }

    if (this.wasPausedForCombat && game.combat?.started) {
      return;
    }

    this._stopTime();

    this.#timeMultiplier = game.settings.get(MODULE_NAME, "timeMultiplier") || 1;
    if (this.#timeMultiplier <= 0) {
      console.warn("Mini Calendar | Time multiplier is zero or negative. Time will not advance.");
      this.#isRunning = false;
      game.settings.set(MODULE_NAME, "timeIsRunning", false);
      this.render();
      return;
    }

    const advanceClock = async () => {
      if (!this.#isRunning) return;

      const startTick = Date.now();
      if (game.user.isGM && this.#timeMultiplier > 0) {
        try {
          const currentTime = game.time.worldTime;
          const newTime = currentTime + 1 * this.#timeMultiplier;
          game.time.set(newTime);

        } catch (e) {
          console.error("Mini Calendar | Error advancing game time:", e);
          this._stopTime();
          this.#isRunning = false;
          game.settings.set(MODULE_NAME, "timeIsRunning", false);
          this.render();
          return;
        }
      }

      const elapsed = Date.now() - startTick;
      const delay = Math.max(0, 1000 - elapsed);

      if (this.#isRunning) {
        this.#gameClockInterval = setTimeout(advanceClock, delay);
      }
    };
    advanceClock();
  }

  /** Stop the timeout for automatic time advancement */
  _stopTime() {
    if (this.#gameClockInterval) {
      clearTimeout(this.#gameClockInterval);
      this.#gameClockInterval = null;
    }
  }

  /** Advance game time manually by seconds */
  async _advanceTime(seconds) {
    if (!game.user.isGM) return;
    game.time.set(game.time.worldTime + seconds);
  }

  /** Open the calendar configuration dialog */
  _openSettings() {
    const menu = game.settings.menus.get(`${MODULE_NAME}.calendarConfigMenu`);
    if (!menu) return ui.notifications.error("No submenu found for the provided key");
    const app = new menu.type();
    app.render(true);

    Hooks.once("closeCalendarConfig", () => {
      if (this.rendered) {
        const calendar = game.time.calendar;
        const comps = calendar.timeToComponents(game.time.worldTime);
        this.#viewYear = comps.year;
        this.#viewMonth = comps.month;
        this.render();
        if (game.system.id === "dnd5e" && dnd5e?.ui?.calendar) {
          dnd5e.ui.calendar.render();
        }
      }
    });
  }

  get isRunning() {
    return this.#isRunning;
  }

  /**
   * Retrieves the dawn and dusk times for the current date.
   * @param {number} [worldTime=game.time.worldTime] - The timestamp to check (defaults to now)
   * @returns {{dawn: number, dusk: number}} - The hour for dawn and dusk
   */
  _getSunTimes(worldTime = game.time.worldTime, comps = null) {
    return wgtngmMiniCalender.getSunTimes(worldTime, comps);
  }



  _dateCompCache = { time: null, components: null };

  getCachedDateComponents(worldTime) {
    if (this._dateCompCache.time === worldTime && this._dateCompCache.components) {
      return this._dateCompCache.components;
    }
    const calendar = game.time.calendar;
    if (!calendar) return null;

    const components = calendar.timeToComponents(worldTime);
    this._dateCompCache = { time: worldTime, components };
    return components;
  }

  /**
     * Calculates sun times based on the current date configuration.
     * @param {number} [worldTime=game.time.worldTime]
     * @returns {{dawn: number, dusk: number}}
     */
  static _sunCache = { year: null, month: null, data: null };

  static getSunTimes(worldTime = game.time.worldTime, comps = null) {
    const calendar = game.time.calendar;
    if (!calendar) return { dawn: 6, dusk: 18 };

    if (!comps) comps = calendar.timeToComponents(worldTime);


    if (this._sunCache.year === comps.year && this._sunCache.month === comps.month && this._sunCache.data) {
      return this._sunCache.data;
    }

    let dawn = 6;
    let dusk = 18;

    const sunConfig = CONFIG.time.worldCalendarConfig?.sun;

    if (sunConfig && Array.isArray(sunConfig.values)) {
      const currentMonth = calendar.months.values[comps.month];
      const ordinal = currentMonth.ordinal;

      const match = sunConfig.values.find((v) => ordinal >= v.monthStart && ordinal <= v.monthEnd);

      if (match) {
        if (typeof match.dawn === "number") dawn = match.dawn;
        if (typeof match.dusk === "number") dusk = match.dusk;
      }
    }


    this._sunCache = { year: comps.year, month: comps.month, data: { dawn, dusk } };

    return { dawn, dusk };
  }


  _updateTimeOfDayClass(worldTime, comps = null) {
    if (!this.element) return;
    const calendar = game.time.calendar;
    if (!calendar) return;

    try {
      if (!comps) comps = calendar.timeToComponents(worldTime);
      const hour = comps.hour;

      const { dawn, dusk } = this._getSunTimes(worldTime, comps);

      let newState = "midnight";

      if (hour >= dawn && hour < dawn + 1) {
        newState = "dawn";
      } else if (hour >= dawn + 1 && hour < dusk) {
        newState = "midday";
      } else if (hour >= dusk && hour < dusk + 1) {
        newState = "dusk";
      } else {
        newState = "midnight";
      }

      if (this.#lastTimeState === newState) return;
      this.#lastTimeState = newState;

      const icon = this.element.querySelector(".window-header i.window-icon");

      const stateConfig = {
        dawn: { class: "dawn", icon: "fa-sun", colorClass: "icon-dawn" },
        midday: { class: "midday", icon: "fa-sun", colorClass: "icon-midday" },
        dusk: { class: "dusk", icon: "fa-sun", colorClass: "icon-dusk" },
        midnight: { class: "midnight", icon: "fa-moon", colorClass: "icon-midnight" },
      };

      const appClasses = ["dawn", "midday", "dusk", "midnight"];
      const iconMainClasses = ["fa-calendar-alt", "fa-sun", "fa-moon"];
      const iconColorClasses = ["icon-dawn", "icon-midday", "icon-dusk", "icon-midnight"];

      this.element.classList.remove(...appClasses);
      if (icon) icon.classList.remove(...iconMainClasses, ...iconColorClasses);

      const config = stateConfig[newState];
      this.element.classList.add(config.class);
      if (icon) icon.classList.add(config.icon, config.colorClass);
    } catch (e) {
      console.error("Mini Calendar | Failed to update time of day class", e);
    }
  }


  async _updateSceneDarkness(worldTime) {
    if (!canvas.scene || (!canvas.scene.active && game.settings.get(MODULE_NAME, "enableDarknessActive"))) return;

    const defaultEnabled = game.settings.get(MODULE_NAME, "defaultSceneDarkness");
    const sceneFlag = canvas.scene.getFlag(MODULE_NAME, "enableDarkness");
    const isEnabled = sceneFlag !== undefined ? sceneFlag : defaultEnabled;

    if (!isEnabled) return;

    const calendar = game.time.calendar;
    const comps = this.getCachedDateComponents(worldTime) || calendar.timeToComponents(worldTime);
    const mph = calendar.days.minutesPerHour;
    const spm = calendar.days.secondsPerMinute;
    const currentHour = comps.hour + (comps.minute / mph) + (comps.second / (mph * spm));
    const { dawn, dusk } = this._getSunTimes(worldTime);

    const transitionHalf = 1.0;
    const levelLow = game.settings.get(MODULE_NAME, "darknessLevelLow");

    let targetDarkness;


    if (currentHour > (dawn + transitionHalf) && currentHour < (dusk - transitionHalf)) {
      if (Math.abs(canvas.scene.environment.darknessLevel - levelLow) < 0.01) return;
      targetDarkness = levelLow;
    } else {

      let levelHigh = game.settings.get(MODULE_NAME, "darknessLevelHigh");
      const auroraOverride = game.settings.get(MODULE_NAME, "auroraDarknessOverride") || 0.8;
      const moonOverride = game.settings.get(MODULE_NAME, "moonDarknessOverride") || 0.7;

      const moons = CONFIG.time.worldCalendarConfig.moons?.values ?? [];


      const dayKey = `${comps.year}-${comps.month}-${comps.dayOfMonth}`;
      let isFullMoon = false;

      if (this._moonDarknessCache.dayKey === dayKey) {
        isFullMoon = this._moonDarknessCache.isFullMoon;
      } else {
        const currentMoon = moons
          .map((moon) => this._calculateMoonPhase(game.time.worldTime, moon, calendar))
          .filter((phase) => phase !== null);

        isFullMoon = currentMoon?.[0]?.phaseName?.toLowerCase().includes("full");
        this._moonDarknessCache = { dayKey, isFullMoon };
      }

      if (isFullMoon) {
        levelHigh = Math.min(levelHigh, moonOverride);
      }

      if (canvas.scene.weather === "aurora") {
        levelHigh = Math.min(levelHigh, auroraOverride);
      }

      const currentDarkness = canvas.scene.environment.darknessLevel;


      if (currentHour < (dawn - transitionHalf) || currentHour > (dusk + transitionHalf)) {
        if (Math.abs(currentDarkness - levelHigh) < 0.075) return;
        targetDarkness = levelHigh;
      } else {

        if (currentHour <= (dawn + transitionHalf)) {
          const pct = (currentHour - (dawn - transitionHalf)) / (transitionHalf * 2);
          targetDarkness = levelHigh - (pct * (levelHigh - levelLow));
        } else {
          const pct = (currentHour - (dusk - transitionHalf)) / (transitionHalf * 2);
          targetDarkness = levelLow + (pct * (levelHigh - levelLow));
        }
      }
    }

    targetDarkness = Math.min(Math.max(targetDarkness, 0), 1);
    const currentDarkness = canvas.scene.environment.darknessLevel;




    if (this._lastSubmittedDarkness !== null && Math.abs(this._lastSubmittedDarkness - targetDarkness) < 0.075) {
      return;
    }


    const now = Date.now();
    const timeSince = now - this._lastDarknessUpdate;
    const diff = Math.abs(currentDarkness - targetDarkness);

    if (timeSince < 5000 && diff < 0.2) {
      return;
    }


    this._lastDarknessUpdate = now;
    this._lastSubmittedDarkness = targetDarkness;

    if (Math.abs(currentDarkness - targetDarkness) > 0.075) {



      canvas.scene.update(
        { environment: { darknessLevel: targetDarkness, globalLight: canvas.scene.environment.globalLight } },
        { animateDarkness: 1000 }
      );
    }
  }

  /**
     * Checks if the current time is technically night (before dawn OR after dusk).
     * @param {number} [worldTime=game.time.worldTime]
     * @returns {boolean}
     */
  static isNightTime(worldTime = game.time.worldTime) {
    const calendar = game.time.calendar;
    if (!calendar) return false;

    const { dawn, dusk } = this.getSunTimes(worldTime);
    const comps = calendar.timeToComponents(worldTime);

    const mph = calendar.days.minutesPerHour;
    const spm = calendar.days.secondsPerMinute;
    const currentHour = comps.hour + (comps.minute / mph) + (comps.second / (mph * spm));

    return currentHour < dawn || currentHour >= dusk;
  }


  /**
   * Gets the season name for the currently viewed month.
   * @returns {string} The localized season name or the default title.
   */
  _getViewingSeason() {
    const calendar = game.time.calendar;

    const defaultTitle = game.i18n.localize(this.constructor.DEFAULT_OPTIONS.window.title) || "Mini Calendar";


    if (!calendar || !calendar.seasons?.values?.length) {
      return defaultTitle;
    }

    const currentMonth = calendar.months.values[this.#viewMonth];
    if (!currentMonth || typeof currentMonth.ordinal !== "number") {
      console.warn(`Mini Calendar | Could not find ordinal for month index ${this.#viewMonth}.`);
      return defaultTitle;
    }
    const viewMonthOrdinal = currentMonth.ordinal;
    for (const season of calendar.seasons.values) {
      const start = season.monthStart;
      const end = season.monthEnd;

      if (start <= end) {
        if (viewMonthOrdinal >= start && viewMonthOrdinal <= end) {
          return game.i18n.localize(season.name);
        }
      } else {
        if (viewMonthOrdinal >= start || viewMonthOrdinal <= end) {
          return game.i18n.localize(season.name);
        }
      }
    }
    return defaultTitle;
  }

  _updateWindowTitle() {
    if (!this.element) return;
    const titleElement = this.element.querySelector(".window-header .window-title");
    if (!titleElement) return;
    const seasonName = this._getViewingSeason();
    titleElement.textContent = seasonName;
  }





  async _showWeatherOverrideDialog(targetDate) {
    const calendar = game.time.calendar;
    const useCelsius = game.settings.get("wgtgm-mini-calendar", "useCelsius");
    const tempUnitLabel = useCelsius ? "°C" : "°F";
    const defaultTemp = useCelsius ? 20 : 70;

    const existingWeather = await WeatherEngine.getWeatherForDate(targetDate.year, targetDate.month, targetDate.day);
    const existingTemp = existingWeather?.temp;
    const parsedExistingTemp = !isNaN(existingTemp)
      ? (useCelsius
        ? Math.round((existingTemp - 32) / 1.8)
        : Math.round(existingTemp))
      : defaultTemp;

    const selections = {
      morning: existingWeather?.type || "none",
      midday: existingWeather?.variations?.midday?.type || null,
      evening: existingWeather?.variations?.evening?.type || null
    };

    const uiMap = {
      "none": { label: "Clear", icon: "fas fa-sun" },
      "partlyCloudy": { label: "Scattered Clouds", icon: "fas fa-cloud-sun" },
      "clouds": { label: "Overcast", icon: "fas fa-cloud" },
      "lightRain": { label: "Light Rain", icon: "fas fa-cloud-rain" },
      "rain": { label: "Rain", icon: "fas fa-cloud-showers-heavy" },
      "heavyRain": { label: "Heavy Rain", icon: "fas fa-cloud-showers-heavy" },
      "rainStorm": { label: "Storm", icon: "fas fa-bolt" },
      "fog": { label: "Fog", icon: "fas fa-smog" },
      "lightSnow": { label: "Snow", icon: "fas fa-snowflake" },
      "snow": { label: "Heavy Snow", icon: "fas fa-snowflake" },
      "blizzard": { label: "Blizzard", icon: "fas fa-snow-blowing" },
      "leaves": { label: "Windy", icon: "fas fa-wind" },
      "sandstorm": { label: "Sandstorm", icon: "fas fa-wind" },
      "hail": { label: "Hail", icon: "fas fa-cloud-hail" },
      "aurora": { label: "Aurora", icon: "fas fa-moon-over-sun" },
      "heatWave": { label: "Heatwave", icon: "fas fa-sun-haze" },
      "lightWind": { label: "Light Wind", icon: "fas fa-wind" }
    };

    let buttonsHtml = "";
    for (const [key, data] of Object.entries(uiMap)) {
      buttonsHtml += `
            <button type="button" class="weather-tag-btn" data-value="${key}">
                <i class="${data.icon}"></i> ${data.label}
            </button>`;
    }

    const content = `
        <div class="weather-override-container">
            <div class="header-row">
                 <span class="date-label">Weather for <strong>${targetDate.day + 1}/${targetDate.month + 1}/${targetDate.year}</strong></span>
                 <div class="temp-control">
                    <label>Temp (${tempUnitLabel})</label>
                    <input type="number" name="temperature" value="${parsedExistingTemp}">
                 </div>
            </div>

            <div class="timeline-slots">
                <div class="slot-card active" data-mode="morning">
                    <div class="slot-header"><i class="fas fa-sun"></i> Morning</div>
                    <div class="slot-content">
                        <i class="icon fas fa-question"></i>
                        <span class="label">--</span>
                    </div>
                </div>
                
                <div class="slot-card" data-mode="midday">
                    <div class="slot-header"><i class="fas fa-cloud-sun"></i> Midday</div>
                    <div class="slot-content">
                        <i class="icon fas fa-question"></i>
                        <span class="label">--</span>
                    </div>
                    <div class="inherit-indicator" title="Inherits Morning Weather"><i class="fas fa-link"></i> Linked</div>
                </div>

                <div class="slot-card" data-mode="evening">
                    <div class="slot-header"><i class="fas fa-moon"></i> Evening</div>
                    <div class="slot-content">
                        <i class="icon fas fa-question"></i>
                        <span class="label">--</span>
                    </div>
                    <div class="inherit-indicator" title="Inherits Morning Weather"><i class="fas fa-link"></i> Linked</div>
                </div>
            </div>

            <div class="divider">Select Condition:</div>

            <div id="weather-tag-container">
                ${buttonsHtml}
            </div>
            
            <p class="notes" style="font-size:0.8em; margin-top: 5px; text-align: center;">
                <em>Click a timeline card above to target it, then select a condition below.</em>
            </p>
        </div>
        

    `;

    await foundry.applications.api.DialogV2.prompt({
      title: "Override Weather",
      content: content,
      classes: ["wgtngmMiniCalender-dialog", "dialog"],
      modal: true,
      render: (html) => {
        const root = html.target.element;
        const slots = root.querySelectorAll(".slot-card");
        const btns = root.querySelectorAll(".weather-tag-btn");

        let currentMode = "morning";


        const updateVisuals = () => {
          const morningVal = selections.morning;
          const morningData = uiMap[morningVal] || uiMap["none"];

          const middayVal = selections.midday;
          const middayData = middayVal ? (uiMap[middayVal] || uiMap["none"]) : morningData;
          const middayInherited = (middayVal === null);

          const eveningVal = selections.evening;
          const eveningData = eveningVal ? (uiMap[eveningVal] || uiMap["none"]) : morningData;
          const eveningInherited = (eveningVal === null);

          const mSlot = root.querySelector(`.slot-card[data-mode="morning"]`);
          mSlot.querySelector(".icon").className = `icon ${morningData.icon}`;
          mSlot.querySelector(".label").textContent = morningData.label;

          const midSlot = root.querySelector(`.slot-card[data-mode="midday"]`);
          midSlot.querySelector(".icon").className = `icon ${middayData.icon}`;
          midSlot.querySelector(".label").textContent = middayData.label;
          midSlot.classList.toggle("inherited", middayInherited);

          const eveSlot = root.querySelector(`.slot-card[data-mode="evening"]`);
          eveSlot.querySelector(".icon").className = `icon ${eveningData.icon}`;
          eveSlot.querySelector(".label").textContent = eveningData.label;
          eveSlot.classList.toggle("inherited", eveningInherited);

          slots.forEach(s => s.classList.remove("active"));
          root.querySelector(`.slot-card[data-mode="${currentMode}"]`).classList.add("active");
        };

        const setTarget = (mode) => {
          currentMode = mode;
          updateVisuals();
        };

        slots.forEach(slot => {
          slot.addEventListener("click", (ev) => {
            setTarget(ev.currentTarget.dataset.mode);
          });
        });

        btns.forEach(btn => {
          btn.addEventListener("click", (ev) => {
            const val = ev.currentTarget.dataset.value;

            if (currentMode !== "morning" && selections[currentMode] === val) {
              selections[currentMode] = null;
            } else {
              selections[currentMode] = val;

              if (currentMode === "morning") setTarget("midday");
              else if (currentMode === "midday") setTarget("evening");
            }
            updateVisuals();
          });
        });

        updateVisuals();
      },
      ok: {
        label: "Apply Override",
        icon: "fas fa-check",
        callback: async (event, button, dialog) => {
          let tempInput = parseFloat(button.form.querySelector("input[name='temperature']").value);
          if (isNaN(tempInput)) tempInput = defaultTemp;

          let finalTempF = tempInput;
          if (useCelsius) finalTempF = (tempInput * 9 / 5) + 32;

          const variations = {};
          if (selections.midday) variations.midday = selections.midday;
          if (selections.evening) variations.evening = selections.evening;

          await WeatherEngine.setWeatherOverride(selections.morning, finalTempF, 0, targetDate, variations);
        }
      }
    });
  }
}

