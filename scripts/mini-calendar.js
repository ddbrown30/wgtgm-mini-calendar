import { MODULE_NAME } from "./settings.js";
import { localize, calendarJournal, confirmationDialog, whisperChat, renderCalendarIfOpen } from "./helper.js";
import { CalendarConfig } from "./calendar-config.js";
import { WeatherEngine } from "./weather.js";
import { WeatherConfig  } from "./weather-config.js";

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
      "add-note-header":this.#_addNoteHeader,
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
      // "set-date": {
      //   handler: this.#_dayClickContext,
      //   buttons: [0, 2],
      // },
      "toggle-weather-fx": this.#_toggleWeatherFX,
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
  _throttledDarknessUpdate = foundry.utils.throttle(this._updateSceneDarkness.bind(this), 1000);
  _debouncedRender = foundry.utils.debounce(this.render.bind(this), 100);
  _positionObserver = null;
  
_debouncedSavePosition = foundry.utils.debounce(async () => {
    if (!this.element || !this.position) return;
    const { width, height, left, top } = this.position;
    const saved = game.settings.get(MODULE_NAME, "calSheetDimensions");
    if (saved.width !== width || saved.height !== height || saved.left !== left || saved.top !== top) {
       await game.settings.set(MODULE_NAME, "calSheetDimensions", { width, height, left, top });
    }
  }, 500);

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

  _formatTime(seconds) {
    const calendar = game.time.calendar;
    try {
      const comps = calendar.timeToComponents(seconds);
      let h = comps.hour;
      const m = String(comps.minute).padStart(2, "0");
      const s = String(comps.second).padStart(2, "0");
      
      if (game.settings.get(MODULE_NAME, "use12hour")) {
          const ampm = h >= 12 ? "PM" : "AM";
          h = h % 12;
          h = h ? h : 12; // the hour '0' should be '12'
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
    // Use the timestamp directly as the key
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
      const date = calendar.timeToComponents(timestamp);

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

      const imageName = phaseImages[currentPhase.name.toLowerCase()];
      const imagePath = imageName ? `modules/wgtgm-mini-calendar/ui/moons/${imageName}` : "icons/svg/circle.svg";

      return {
        name: moonConfig.name,
        phaseName: currentPhase.name,
        phaseDisplayName: currentPhase.display || currentPhase.name,
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

async _getNotesForDay(date, preFetchedJournal = null, preFetchedPageMap = null) {
    const journal = preFetchedJournal ?? game.journal.getName(calendarJournal);
    if (!journal) return [];

    const day = date.day + 1;
    const pageName = `${date.year}-${String(date.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const page = preFetchedPageMap ? preFetchedPageMap.get(pageName) : journal.pages.getName(pageName);
    let notes = page?.flags?.[MODULE_NAME]?.notes || [];

    const recurringPageName = "0000-Recurring";
    const recurringPage = preFetchedPageMap ? preFetchedPageMap.get(recurringPageName) : journal.pages.getName(recurringPageName);
    
    if (recurringPage) {
        const recurringNotes = recurringPage.flags?.[MODULE_NAME]?.notes || [];
        const matches = recurringNotes.filter(n => this._checkRecurrence(n, date));
        matches.forEach(n => n.isRecurringInstance = true);
        notes = notes.concat(matches);
    }
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
    if ( !this.hasFrame ) return frame;
    
    if (!game.user.isGM) return frame;

    const weatherEnabled = game.settings.get(MODULE_NAME, "enableWeatherEffects");
    const weatherTooltip = weatherEnabled ? "Disable Weather FX" : "Enable Weather FX";
    const currentState = game.settings.get(MODULE_NAME, "enableWeatherEffects");
    const soundEnabled = game.settings.get(MODULE_NAME, "enableWeatherSound");
    
    const soundTooltip = soundEnabled ? "Disable Weather Sounds" : "Enable Weather Sounds";
    const soundIcon = soundEnabled ? "fa-volume-high" : "fa-volume-xmark";

    const copyId = `
        <button type="button" class="header-control fa-solid fa-calendar-plus icon" data-action="add-note-header" 
                data-tooltip="Create Note" aria-label="Create Note"></button>
        <button type="button" class="header-control fa-solid ${soundIcon} icon" data-action="toggle-weather-sound"
                data-tooltip="Stop Sound Effects" aria-label="Stop Sound Effects"></button>        
        <button type="button" class="header-control fa-solid fa-cloud-sun-rain icon ${currentState}" data-action="toggle-weather-fx"
                data-tooltip="${weatherTooltip}" aria-label="Toggle Weather"></button>
      `;
      this.window.close.insertAdjacentHTML("beforebegin", copyId);
    return frame;
  }

  static async #_toggleWeatherFX(event, target) {
      const currentState = game.settings.get(MODULE_NAME, "enableWeatherEffects");
      const newState = !currentState;
      
      await game.settings.set(MODULE_NAME, "enableWeatherEffects", newState);
      target.classList.toggle('true', newState);      
      if (newState) {
          ui.notifications.info("Weather Effects Enabled");
      } else {
          ui.notifications.info("Weather Effects Disabled");
      }
      this.render();

  }

static async #_toggleWeatherSound(event, target) {
      const currentState = game.settings.get(MODULE_NAME, "enableWeatherSound");
      const newState = !currentState;

      target.classList.toggle('fa-volume-high', newState);      
      target.classList.toggle('fa-volume-xmark', !newState);
      await game.settings.set(MODULE_NAME, "enableWeatherSound", newState);
      
      if (newState) {
          ui.notifications.info("Weather Sounds Enabled");
          await WeatherEngine.refreshWeather();
      } else {
          ui.notifications.info("Weather Sounds Disabled");
          // Stop immediately
          await WeatherEngine.stopWeatherSounds();
      }

      if (game.wgtngmMiniCalender.calendarInstance) {
          game.wgtngmMiniCalender.calendarInstance.render();
      }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const calendar = game.time.calendar;

    if (!calendar) {
      return { ...context, error: "Calendar not available." };
    }

    this._initializeViewState();

    let weatherHistory = {};
        const showWeather = game.settings.get(MODULE_NAME, "enableWeatherForecast");
         const page = game.journal.getName(calendarJournal)?.pages.getName("Weather History");
         weatherHistory = page?.flags?.[MODULE_NAME]?.history || {};

    if (this.#viewMonth < 0 || this.#viewMonth >= calendar.months.values.length) {
      console.warn(`Mini Calendar | Invalid view month index (${this.#viewMonth}). Resetting.`);
      const currentComps = calendar.timeToComponents(game.time.worldTime);
      this.#viewMonth = currentComps.month;
      this.#viewYear = currentComps.year;
    }

    const currentMonth = calendar.months.values[this.#viewMonth];
    const nowComponents = calendar.timeToComponents(game.time.worldTime);
    const isCurrentGameMonthAndYear = this.#viewYear === nowComponents.year && this.#viewMonth === nowComponents.month;
    const mph = calendar.days.minutesPerHour;
    const spm = calendar.days.secondsPerMinute;
    const hpd = calendar.days.hoursPerDay;
    
    // Calculate current seconds elapsed in the day
    const currentSeconds = (nowComponents.hour * mph * spm) + (nowComponents.minute * spm) + nowComponents.second;
    
    // Calculate total seconds in a day for the slider max
    // const maxSeconds = (hpd * mph * spm) - 1;
    // const stepSeconds = (mph / 2) * spm;
    const validHpd = Number.isFinite(hpd) ? hpd : 24;
    const validMph = Number.isFinite(mph) ? mph : 60;
    const validSpm = Number.isFinite(spm) ? spm : 60;

    // Calculate total seconds in a day for the slider max
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
        const dayOfMonth = i; // 0-indexed

        const dayTimestamp = firstDayTimestamp + i * 86400;

        let moonPhases = this._getMoonPhasesForDay(dayTimestamp, moons, calendar);

        const date = {
          year: this.#viewYear,
          month: this.#viewMonth,
          day: dayOfMonth,
        };

        const notes = await this._getNotesForDay(date, journal, pageMap);
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
          date: date, // Pass the date object
          isCurrentDay: isCurrentGameMonthAndYear && dayOfMonth === nowComponents.dayOfMonth,
          hasEvent: hasEvent,
          noteIcon: noteIcon,
          hasVisible: hasVisible,
          noteTooltip: noteTooltip,
          noteTooltipPlayerVisible:noteTooltipPlayerVisible,
          moonPhases: moonPhases,
          hasRecurring: hasRecurring,
          weatherIcon: weatherIcon,
          weatherTooltip: weatherTooltip,
          showWeather:showWeather
        });
      }
    }

    const weekdayNames = calendar.days.values.map((d) => game.i18n.localize(d.abbreviation) || game.i18n.localize (d.name).substring(0, 3));

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
      currentNoteTooltipPlayerVisible:currentNoteTooltipPlayerVisible,
      currentDate: currentDateObj,
      currentSeconds: currentSeconds,
      maxSeconds: maxSeconds,
      stepSeconds:stepSeconds,
      hasRecurring: currentHasRecurring,
      currentWeatherIcon:currentWeatherIcon,
      currentWeatherTooltip:currentWeatherTooltip,
      showWeather:showWeather
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._cachedTimeDisplays = this.element.querySelectorAll(".time-display");
    this._updateTimeOfDayClass(game.time.worldTime);
    this._updateWindowTitle();
    const header = this.element.querySelector(".window-header");
    if (header) {
      header.removeEventListener("dblclick", this._boundToggleMinimize);
      this._boundToggleMinimize = this._toggleCustomMinimize.bind(this);
      header.addEventListener("dblclick", this._boundToggleMinimize);
    }
    const calendar = game.time.calendar;
    if (calendar && this.element) {
      const daysInWeek = calendar.days.values.length;
      const gridElement = this.element.querySelector(".wgtngm-calendar-grid");
      if (gridElement) {
        gridElement.style.gridTemplateColumns = `repeat(${daysInWeek}, 1fr)`;
      }
    }

    const slider = this.element.querySelector(".mini-time-slider");
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
          await game.time.set(newTimeComps);
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
    
    this._positionObserver.disconnect(); // Prevent duplicates
    this._positionObserver.observe(this.element, { attributes: true, attributeFilter: ["style"] });

    this._activateListeners(this.element);
  }

  async _onFirstRender(context, options) {
    game.settings.set(MODULE_NAME, "calSheetOpened", true);
      this._createContextMenus();

    this.#isRunning = game.settings.get(MODULE_NAME, "timeIsRunning");
    this.#timeMultiplier = game.settings.get(MODULE_NAME, "timeMultiplier");

    this._initializeViewState();

    if (!this.#clockInterval) {
      let lastProcessedTime = null;

      this.#clockInterval = setInterval(() => {
        const currentWorldTime = game.time.worldTime;
        const slider = this.element.querySelector(".mini-time-slider");

        if (slider && document.activeElement === slider) return;

        if (currentWorldTime === lastProcessedTime) return;
        lastProcessedTime = currentWorldTime;

        const timeString = this._formatTime(currentWorldTime);
        if (this._cachedTimeDisplays) {
          this._cachedTimeDisplays.forEach((el) => {
            if (el.textContent !== timeString) el.textContent = timeString;
          });
        }
        this._updateTimeOfDayClass(currentWorldTime);
        
        const calendar = game.time.calendar;
        if (!calendar) return;
        const currentComps = calendar.timeToComponents(currentWorldTime);
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

    if (this.#isRunning && game.user.isGM) {
      this._startTime();
    }

    Hooks.on("updateWorldTime", this._onUpdateWorldTime);
    Hooks.on("updateJournalEntryPage", this._onJournalUpdate);
    Hooks.on("deleteJournalEntry", this._onJournalUpdate);
    Hooks.on("deleteJournalEntryPage", this._onJournalUpdate);


    const startMinimized = game.settings.get(MODULE_NAME, "startMinimized");
    const closedMinimized = game.settings.get(MODULE_NAME, "minimized");
    if (startMinimized || closedMinimized) {
      this.#isCustomMinimized = true;
      this.element.classList.toggle("minimized", this.#isCustomMinimized);
      this.setPosition({ height: "auto", width: "auto" });
    }
  }

  _onJournalUpdate = (page, changes, options, userId) => {
    const journalName = calendarJournal;
    const journal = game.journal.getName(journalName);
    if (!journal){
        this._debouncedRender();
        return;
    }
    if (page.parent?.name !== journalName) return;
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
  };

_onUpdateWorldTime = async (worldTime, dt) => {
    await this._checkDailyEvents();
    
    if (game.user.isGM && game.settings.get(MODULE_NAME, "enableDarknessControl")) {
    this._throttledDarknessUpdate(worldTime)
    }
    if (game.user.isGM) {
        await WeatherEngine.updateForecasts();
    }
    const slider = this.element.querySelector(".mini-time-slider");
    if (slider && document.activeElement !== slider) {
        const calendar = game.time.calendar;
        const c = calendar.timeToComponents(worldTime);
        const mph = calendar.days.minutesPerHour;
        const spm = calendar.days.secondsPerMinute;
        
        const seconds = (c.hour * mph * spm) + (c.minute * spm) + c.second;
        slider.value = seconds;
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


  /**
   * Checks the current game date for any unwhispered events and sends them to chat.
   */
  async _checkDailyEvents() {
    if (!game.users.activeGM?.isSelf) return;

    const calendar = game.time.calendar;
    const currentComps = calendar.timeToComponents(game.time.worldTime);

    const dateKey = `${currentComps.year}-${currentComps.month}-${currentComps.dayOfMonth}`;
    if (this.#lastCheckedDate === dateKey) return;

    this.#lastCheckedDate = dateKey;

    const date = {
      year: currentComps.year,
      month: currentComps.month,
      day: currentComps.dayOfMonth,
    };

    const notes = await this._getNotesForDay(date);
    if (!notes || notes.length === 0) return;

    const newNotes = notes.filter((n) => !n.whispered);
    if (newNotes.length === 0) return;

    const monthName = game.i18n.localize(calendar.months.values[date.month].name);
    const dayNum = date.day + 1;
    let content = `<h4>Events for ${monthName} ${dayNum}, ${date.year}</h4>`;

    newNotes.forEach((n) => {
      content += `<p><strong>${n.title}</strong><br/>${n.content}</p>`;
      n.whispered = true; // Mark as sent
    });

    whisperChat(content);

    await this._saveNotesForDay(date, notes);
  }

  _activateListeners(html) {
    if (!html) return;
    const mainGrid = html.querySelector(".wgtngm-calendar-grid");
    if (!mainGrid) return;
  }

  static #_weatherConfig(event){
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
    // Noon is half the day's length
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
    this._advanceTime(-3600);
  }
  static #_subminute(event) {
    this._advanceTime(-600);
  }
  static #_addhour(event) {
    this._advanceTime(3600);
  }
  static #_addminute(event) {
    this._advanceTime(600);
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
    const journalName = calendarJournal;
    let journal = game.journal.getName(journalName);

    if (!journal) {
      if (!game.user.isGM) {
        ui.notifications.warn(`The ${journalName} journal doesn't exist.`);
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
            if (idx > -1) existingRecNotes[idx] = newNote; // Update existing
            else existingRecNotes.push(newNote); // Add new
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
   * Helper to perform a safe Read-Modify-Write operation on notes.
   * This minimizes race conditions by applying changes to the latest data immediately before saving.
   * @param {object} date - {year, month, day}
   * @param {Function} mutationFn - A function that takes the current notes array and modifies it.
   */
  async _transactionalNoteUpdate(date, mutationFn) {
    const currentNotes = await this._getNotesForDay(date);
    const notesCopy = foundry.utils.deepClone(currentNotes);
    const updatedNotes = mutationFn(notesCopy);
    await this._saveNotesForDay(date, updatedNotes);
    return updatedNotes;
  }

  /**
   * Shows the dialog to ADD or EDIT a single note.
   * @param {object} date - The date object {year, month, day}
   * @param {object | null} noteToEdit - If editing, the note object to pre-fill.
   */
  async _showAddNoteDialog(date, noteToEdit = null, position = null, openViewNote = false) {
    const isEditing = noteToEdit !== null;
    const title = isEditing ? "Edit Note" : "Add Note";

    const pinTypes = [
      { key: "fas fa-book", label: "Note" },
      { key: "fas fa-map-pin", label: "Pin" },
      { key: "fas fa-scroll", label: "Quest" },
      { key: "fas fa-skull-crossbones", label: "Danger" },
      { key: "fas fa-gem", label: "Treasure" },
      { key: "fas fa-beer", label: "Tavern" },
      { key: "fas fa-home", label: "Village" },
      { key: "fas fa-user", label: "NPC" },
      { key: "fas fa-store", label: "Shop" },
    ];

    const currentIcon = noteToEdit?.icon || "fas fa-book";

    const pinTypeOptions = pinTypes
      .map(
        (type) =>
          `<option value="${type.key}" ${type.key === currentIcon ? "selected" : ""}>
                <i class="${type.key}"></i> ${type.label}
            </option>`,
      )
      .join("");

  const content = `
        <div class="form-group">
            <label>Title:</label>
            <input type="text" name="title" value="${foundry.utils.escapeHTML(noteToEdit?.title || "")}" autofocus/>
        </div>
        <div class="form-group">
            <label>Icon:</label>
            <select name="icon">${pinTypeOptions}</select>
        </div>
        <div class="form-group repeat-input">
            <label style="flex:0;">Repeat:</label>
            <input type="number" name="repeatCount" value="${noteToEdit?.repeatCount || 0}" min="0" style="" placeholder="∞" title="0 = Infinite">
            <label style="flex:1; margin-left: 5px;"> every </label>
            <input type="number" name="repeatInterval" value="${noteToEdit?.repeatInterval || 1}" min="1">
            <select name="repeatUnit" style="flex: 1;">
                <option value="none" ${!noteToEdit?.repeatUnit || noteToEdit.repeatUnit === 'none' ? 'selected' : ''}>Never</option>
                <option value="days" ${noteToEdit?.repeatUnit === 'days' ? 'selected' : ''}>Days</option>
                <option value="months" ${noteToEdit?.repeatUnit === 'months' ? 'selected' : ''}>Months</option>
                <option value="years" ${noteToEdit?.repeatUnit === 'years' ? 'selected' : ''}>Years</option>
            </select>

        </div>
        <div class="form-group">
            <label>Note:</label>
            <textarea name="content" placeholder="Enter note content..." style="width: 100%; height: 100px; resize: vertical;">${foundry.utils.escapeHTML(noteToEdit?.content || "")}</textarea>
        </div>
        <div class="form-group" style="display: flex; align-items: center; gap: 5px;">
             <label style="flex:none; white-space:nowrap;">Player Visible:</label>
             <input type="checkbox" name="playerVisible" style="flex:1;" ${noteToEdit?.playerVisible ? "checked" : ""} />
        </div>
    `;

    const result = await foundry.applications.api.DialogV2.prompt({
      title: title,
      content: content,
      classes: ["wgtngmMiniCalender-dialog", "dialog", "edit-note"],
      modal: false,
      ok: {
        label: "Save",
        icon: "fas fa-check",
        callback: (event, button, dialog) => {
          const form = button.form;
          const newTitle = form.title.value.trim();
          if (!newTitle) {
            ui.notifications.warn("Title is required.");
            return false;
          }
          return {
             title: newTitle,
              icon: form.icon.value,
              content: form.content.value,
              repeatInterval: parseInt(form.repeatInterval.value),
              repeatUnit: form.repeatUnit.value,
              repeatCount: parseInt(form.repeatCount.value),
              startDate: date,
              playerVisible: form.playerVisible.checked 
          };
        },
      },
    });

if (!result) return;
if (isEditing) {
        const wasRecurring = noteToEdit.repeatUnit && noteToEdit.repeatUnit !== 'none';
        const isNowRecurring = result.repeatUnit && result.repeatUnit !== 'none';

        if (wasRecurring && !isNowRecurring) {
            await this._removeRecurringNote(noteToEdit.id);
        }
    }

    const freshNotes = await this._transactionalNoteUpdate(date, (notes) => {
      if (isEditing) {
        let index = notes.findIndex((n) => n.id === noteToEdit.id);
        
        if (index === -1) {
             const restoredNote = {
                 id: noteToEdit.id,
                 ...noteToEdit
             };
             notes.push(restoredNote);
             index = notes.length - 1;
        }

        if (index > -1) {
          notes[index].title = result.title;
          notes[index].icon = result.icon;
          notes[index].content = result.content;
          notes[index].repeatInterval = result.repeatInterval;
          notes[index].repeatUnit = result.repeatUnit;
          notes[index].repeatCount = result.repeatCount;
          notes[index].startDate = result.startDate;
          notes[index].playerVisible = result.playerVisible;
          delete notes[index].isRecurringInstance; 
        }
      } else {
        const newNote = {
          id: foundry.utils.randomID(),
          title: result.title,
          icon: result.icon,
          content: result.content,
          repeatInterval: result.repeatInterval,
          repeatUnit: result.repeatUnit,
          repeatCount: result.repeatCount,
          startDate: result.startDate, 
          playerVisible: result.playerVisible,
        };
        notes.push(newNote);
      }
      return notes;
    });

    this.render();
    
    if (openViewNote) {
      this._showViewNotesDialog(date, freshNotes, position);
    }
}
  /**
   * Shows the "List" dialog for all notes on a given day.
   * @param {object} date - The date object {year, month, day}
   * @param {Array} notes - The array of note objects for that day.
   */
  async _showViewNotesDialog(date, notes, openPosition = null) {
    if (!notes) {
        notes = await this._getNotesForDay(date);
    }
    let position = {};
    if (openPosition) {
      position = openPosition;
    }

  let notesHTML = notes
      .map(
        (note) => {
            const isRepeating = note.repeatUnit && note.repeatUnit !== 'none';
            const repeatIcon = isRepeating ? '<i class="fas fa-repeat" title="Repeating Event" style="margin-right: 5px; font-size: 0.8em; opacity: 0.7;"></i>' : '<span></span>';
            const isHidden = note?.playerVisible ? '':'-slash';
            const isVisibleIcon = `<i class="fas fa-eye${isHidden} note-control" title="playerVisible" data-action="visible-toggle" data-note-id="${note.id}" style="margin-right: 5px; font-size: 0.8em; opacity: 0.7;"></i>`;
            return `
            <div class="calendar-note-item" data-note-id="${note.id}" data-action="edit-note">
                <span class="note-title">
                    <i class="${note.icon || "fas fa-book"}"></i>
                    ${foundry.utils.escapeHTML(note.title)}
                    ${repeatIcon}
                    ${isVisibleIcon}
                    <i class="fas fa-trash note-control" data-action="delete-note" title="Delete Note"></i>
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
      buttons: [
        {
          action: "cancel",
          label: "Close",
          callback: () => null,
        },
        {
          action: "export",
          label: "Add Note",
          icon: "fas fa-calendar-plus",
          default: true,
          callback: (event, button, data) => {
            this._showAddNoteDialog(date, null, data?.position, true);
          },
        },
      ],
      close: () => {
        this.render();
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
        // Delete Note
        dialog.target.element.querySelectorAll('[data-action="delete-note"]').forEach((btn) => {
          btn.addEventListener("click", (event) => {
            event.stopPropagation();
            const noteId = event.target.closest("[data-note-id]")?.dataset.noteId;
            if (noteId) {
              this._handleDeleteNote(dialog.target?.position, date, notes, noteId);
            }
          });
        });
      // Visibility
       dialog.target.element.querySelectorAll('[data-action="visible-toggle"]').forEach((btn) => {
          btn.addEventListener("click", (event) => {
            event.stopPropagation();
            const noteId = event.target.closest("[data-note-id]")?.dataset.noteId;
            if (noteId) {
              this._toggleVisibility(dialog.target?.position, date, notes, noteId);
            }
          });
        });
      // 
      },
    }).catch(() => null);
  }


  /**
   * Shows the "List" dialog for all notes on a given day.
   * @param {object} date - The date object {year, month, day}
   * @param {Array} notes - The array of note objects for that day.
   */
  async _showViewNotesDialogPlayer (date, notes, openPosition = null) {
    if (!notes) {
        notes = await this._getNotesForDay(date);
    }
    let position = {};
    if (openPosition) {
      position = openPosition;
    }
    
  let notesHTML = notes
      .map(
        (note) => {
            const isRepeating = note.repeatUnit && note.repeatUnit !== 'none';
            const repeatIcon = isRepeating ? '<i class="fas fa-repeat" title="Repeating Event" style="margin-right: 5px; font-size: 0.8em; opacity: 0.7;"></i>' : '<span></span>';
            const playerVisible = note?.playerVisible; 
            const isHidden = note?.playerVisible ? '':'-slash';
            return playerVisible ? `
            <div class="calendar-note-item" data-note-id="${note.id}">
                <span class="note-title">
                    <i class="${note.icon || "fas fa-book"}"></i>
                    ${foundry.utils.escapeHTML(note.title)}
                    <span></span><span></span>
                    ${repeatIcon}
                  </span>
                <div class="note-content">
                    ${foundry.utils.escapeHTML(note.content) || "<em>No content.</em>"}
                </div>
            </div>
        `:'';
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
      buttons: [
        {
          action: "cancel",
          label: "Close",
          callback: () => null,
        },
      ],
      close: () => {
        this.render();
      },
      render: (dialog) => {
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
      const journal = game.journal.getName(calendarJournal);
      if (!journal) return;
      
      const recPage = journal.pages.getName("0000-Recurring");
      if (!recPage) return;

      let recNotes = recPage.flags[MODULE_NAME]?.notes || [];
      const initialLength = recNotes.length;
      
      recNotes = recNotes.filter(n => n.id !== noteId);

      if (recNotes.length !== initialLength) {
          await recPage.update({
              flags: { [MODULE_NAME]: { notes: recNotes } }
          });
          console.log(`Mini Calendar | Removed recurring note ${noteId}`);
      }
  }


async _handleDeleteNote(parentDialog, date, notes, noteId) {
    const noteToDelete = notes.find(n => n.id === noteId);
    
    if (noteToDelete && noteToDelete.repeatUnit && noteToDelete.repeatUnit !== 'none') {
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


  _checkRecurrence(note, targetDate) {
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
                year: d.year,
                day: dayOfYear, 
                hour: 0, minute: 0, second: 0
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

    if (isMatch && count > 0 && occurrenceIndex >= count) {
        return false;
    }

    return isMatch;
}

  async close(options= {}) {
     if ( options.closeKey ) {
      return;
    }

    this.#lastTimeState = null;
    if (this.#clockInterval) clearInterval(this.#clockInterval);
    if (this.#gameClockInterval) clearTimeout(this.#gameClockInterval);
    this.#clockInterval = null;
    this.#gameClockInterval = null;
    if (this.position) {
      const { width, height, left, top } = this.position;
      const saved = game.settings.get(MODULE_NAME, "calSheetDimensions");
      if (saved.width !== width || saved.height !== height || saved.left !== left || saved.top !== top) {
        await game.settings.set(MODULE_NAME, "calSheetDimensions", { width, height, left, top });
      }
    }
    game.settings.set(MODULE_NAME, "calSheetOpened", false);
    Hooks.off("deleteJournalEntry", this._onJournalUpdate);
    Hooks.off("updateJournalEntryPage", this._onJournalUpdate);
    Hooks.off("updateWorldTime", this._onUpdateWorldTime);
    this._cachedTimeDisplays = null;
    if (this._positionObserver) {
        this._positionObserver.disconnect();
        this._positionObserver = null;
    }
        return super.close(options);
  }

  async _onDayClick_ViewNote(event, date) {
    const notes = await this._getNotesForDay(date);
    if (!game.user.isGM){
      if (notes.length > 0 && notes.some(n => n.playerVisible)) {
        this._showViewNotesDialogPlayer(date, notes);
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
      const systemYear = date.year - yearZero;
      
      const newTimeComps = {
        year: systemYear,
        day: dayOfYear,
        hour: 12,
        minute: 0,
        second: 0,
      };

      await game.time.set(newTimeComps);

      this.#viewYear = date.year;
      this.#viewMonth = date.month;

      const monthName = calendar.months.values[date.month].name;
      const dayNum = date.day + 1;
      ui.notifications.info(`World time set to ${monthName} ${dayNum}, ${date.year} (Noon).`);
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
        const systemYear = newYear - yearZero;
        const newTimeComps = {
          year: systemYear,
          month: currentTimeComps.month,
          dayOfMonth: currentTimeComps.dayOfMonth,
          hour: currentTimeComps.hour,
          minute: currentTimeComps.minute,
          second: currentTimeComps.second,
        };

        // Clamp dayOfMonth if necessary
        const monthData = calendar.months.values[newTimeComps.month];
        const daysInMonth = calendar.isLeapYear(newYear) ? (monthData.leapDays ?? monthData.days) : monthData.days;

        newTimeComps.dayOfMonth = Math.min(newTimeComps.dayOfMonth, Math.max(0, daysInMonth - 1));

        await game.time.set(newTimeComps);

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

    try {
      const yearZero = CONFIG.time.worldCalendarConfig?.years?.yearZero || 0;
      const systemYear = currentComps.year - yearZero;
      const newTimeComps = {
        year: systemYear,
        day: currentComps.day,
        hour: Math.max(0, Math.min(maxHour, hour)),
        minute: Math.max(0, Math.min(maxMinute, minute)),
        second: Math.max(0, Math.min(maxSecond, second)),
      };

      await game.time.set(newTimeComps);

      const timeString = `${String(newTimeComps.hour).padStart(2, "0")}:${String(newTimeComps.minute).padStart(2, "0")}:${String(newTimeComps.second).padStart(2, "0")}`;

      ui.notifications.info(`World time set to ${timeString}`);

      if (this.render) {
        this.render();
      } else if (game.wgtngmMiniCalender?.calendarInstance) {
        game.wgtngmMiniCalender.calendarInstance.render();
      }
    } catch (e) {
      console.error("Mini Calendar | Error setting world time:", e);
      ui.notifications.error("Failed to set world time.");
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
      const systemYear = comps.year - yearZero;
      const newComps = {
        year: systemYear,
        month: comps.month,
        day: comps.day + dayDelta,
        dayOfMonth: comps.dayOfMonth + dayDelta,
        hour: hour,
        minute: 0,
        second: 0,
      };

      await game.time.set(newComps);

      const updatedComps = calendar.timeToComponents(game.time.worldTime);
      this.#viewYear = updatedComps.year;
      this.#viewMonth = updatedComps.month;

      this.render();
    } catch (e) {
      console.error("Mini Calendar | Error setting time:", e);
      ui.notifications.error("Failed to set the time.");
    }
  }

  /** Toggle automatic time advancement */
  static #_togglePlay() {
    if (!game.user.isGM) return;
    this.#isRunning = !this.#isRunning;
    game.settings.set(MODULE_NAME, "timeIsRunning", this.#isRunning);

    if (this.#isRunning) {
      this._startTime();
    } else {
      this._stopTime();
    }
    this.render();
  }

  /** Start the loop for automatic time advancement (Recursive Timeout Pattern) */
  _startTime() {
    if (!game.user.isGM) return;

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
          await game.time.set(newTime);
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
      clearTimeout(this.#gameClockInterval); // CHANGED: clearInterval -> clearTimeout
      this.#gameClockInterval = null;
    }
  }

  /** Advance game time manually by seconds */
  async _advanceTime(seconds) {
    if (!game.user.isGM) return;
    try {
      const currentTime = game.time.worldTime;
     
      if (typeof seconds !== "number" || isNaN(seconds)) {
        console.warn("Mini Calendar | Invalid time advancement amount:", seconds);
        return;
      }
     
      const newTime = currentTime + seconds;

      if (isNaN(newTime)) {
        console.error("Mini Calendar | Resulting time would be NaN. Aborting.");
        return;
      }

      await game.time.set(newTime);
      const calendar = game.time.calendar;
      const comps = calendar.timeToComponents(game.time.worldTime);
      this.#viewYear = comps.year;
      this.#viewMonth = comps.month;

      this.render();
    } catch (e) {
      console.error("Mini Calendar | Error manually advancing time:", e);
      ui.notifications.error("Failed to advance time.");
    }
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
  _getSunTimes(worldTime = game.time.worldTime) {
    const calendar = game.time.calendar;
    let dawn = 6;
    let dusk = 18;

    if (!calendar) return { dawn, dusk };

    const comps = calendar.timeToComponents(worldTime);
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
    return { dawn, dusk };
  }

  _updateTimeOfDayClass(worldTime) {
    if (!this.element) return;

    const calendar = game.time.calendar;
    if (!calendar) return;

    try {
      const comps = calendar.timeToComponents(worldTime);
      const hour = comps.hour;

      const { dawn, dusk } = this._getSunTimes(worldTime);

      let newState = "midnight";

      if (hour >= dawn && hour < dawn + 1) {
        newState = "dawn";
      } else if (hour >= dawn + 1 && hour < dusk) {
        newState = "midday";
      } else if (hour >= dusk && hour < dusk + 1) {
        newState = "dusk";
      } else {
        newState = "midnight"; // Covers hours before dawn and after dusk ends
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
      const comps = calendar.timeToComponents(worldTime);
      const mph = calendar.days.minutesPerHour;
      const spm = calendar.days.secondsPerMinute;
      const currentHour = comps.hour + (comps.minute / mph) + (comps.second / (mph * spm));
      const { dawn, dusk } = this._getSunTimes(worldTime);

      const levelHigh = game.settings.get(MODULE_NAME, "darknessLevelHigh"); // Night
      const levelLow = game.settings.get(MODULE_NAME, "darknessLevelLow");   // Day
      const currentDarkness = canvas.scene.environment.darknessLevel;
      const transitionHalf = 1.0; 

      let targetDarkness;

      if (currentHour < (dawn - transitionHalf) || currentHour > (dusk + transitionHalf)) {
          if (Math.abs(currentDarkness - levelHigh) < 0.01) return;
          targetDarkness = levelHigh;
      } 
      else if (currentHour > (dawn + transitionHalf) && currentHour < (dusk - transitionHalf)) {
          if (Math.abs(currentDarkness - levelLow) < 0.01) return;
          targetDarkness = levelLow;
      } 
      else {
          if (currentHour <= (dawn + transitionHalf)) {
              const pct = (currentHour - (dawn - transitionHalf)) / (transitionHalf * 2);
              targetDarkness = levelHigh - (pct * (levelHigh - levelLow));
          } else {
              const pct = (currentHour - (dusk - transitionHalf)) / (transitionHalf * 2);
              targetDarkness = levelLow + (pct * (levelHigh - levelLow));
          }
      }

      targetDarkness = Math.min(Math.max(targetDarkness, 0), 1);

      if (Math.abs(currentDarkness - targetDarkness) > 0.05) {
          const isToDarkness = targetDarkness > currentDarkness;
          const transitionBaseMS = isToDarkness ? CONFIG.Canvas.daylightToDarknessAnimationMS : CONFIG.Canvas.darknessToDaylightAnimationMS;
          const transitionMS = Math.floor(Math.abs(currentDarkness - targetDarkness) * transitionBaseMS);

          await canvas.scene.update(
              { environment: { darknessLevel: targetDarkness } },
              { animateDarkness: 1200 }
          );
      }
  }

  /**
   * Gets the season name for the currently viewed month.
   * @returns {string} The localized season name or the default title.
   */
  _getViewingSeason() {
    const calendar = game.time.calendar;
    // Use the default title from options as a fallback
    const defaultTitle = game.i18n.localize(this.constructor.DEFAULT_OPTIONS.window.title) || "Mini Calendar";

    // Check if calendar has seasons defined
    if (!calendar || !calendar.seasons?.values?.length) {
      return defaultTitle;
    }

    const currentMonth = calendar.months.values[this.#viewMonth];
    if (!currentMonth || typeof currentMonth.ordinal !== "number") {
      console.warn(`Mini Calendar | Could not find ordinal for month index ${this.#viewMonth}.`);
      return defaultTitle; // Fallback
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
}

Hooks.on("closeCalendarConfig", () => {
  const calendarApp =
    game.wgtngmMiniCalender?.calendarInstance ??
    Object.values(ui.windows).find((win) => win instanceof wgtngmMiniCalender);

  if (calendarApp instanceof wgtngmMiniCalender) {
    console.log("Mini Calendar | Handling config close, re-rendering calendar.");
    calendarApp._resetMoonCache();
    calendarApp.render();
  }
});

Hooks.on("combatStart", (combat, updateData) => {
  if (!game.user.isGM) return;
  const pauseOnCombat = game.settings.get(MODULE_NAME, "pauseOnCombat");
  const calendarApp =
    game.wgtngmMiniCalender?.calendarInstance ??
    Object.values(ui.windows).find((win) => win instanceof wgtngmMiniCalender);

  if (pauseOnCombat && calendarApp instanceof wgtngmMiniCalender && calendarApp.isRunning) {
    calendarApp._stopTime();
    calendarApp.wasPausedForCombat = true;
    console.log("Mini Calendar | Time advancement paused due to combat.");
    if (calendarApp.rendered) calendarApp.render();
  }
});

Hooks.on("deleteCombat", (combat, options, userId) => {
  if (!game.user.isGM) return;
  const resumeAfterCombat = game.settings.get(MODULE_NAME, "resumeAfterCombat");
  const calendarApp =
    game.wgtngmMiniCalender?.calendarInstance ??
    Object.values(ui.windows).find((win) => win instanceof wgtngmMiniCalender);

  if (resumeAfterCombat && calendarApp instanceof wgtngmMiniCalender && calendarApp.wasPausedForCombat) {
    calendarApp._startTime();
    calendarApp.wasPausedForCombat = false;
    console.log("Mini Calendar | Time advancement resumed after combat.");
    if (calendarApp.rendered) calendarApp.render();
  }
});


Hooks.on("updateScene", async (scene, changes, options, userId) => {
    if (foundry.utils.hasProperty(changes, "flags.wgtgm-mini-calendar")) {
        const myFlags = changes.flags["wgtgm-mini-calendar"];
        console.log("Mini Calendar flags were updated:", myFlags);
        if (myFlags.enableDarkness !== undefined){ 
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
          if (!myFlags.enableWeather) WeatherEngine.applyWeatherEffect("none");
                else WeatherEngine.refreshWeather(); 
          }
    }
});

Hooks.on("canvasReady", async (canvas) => {
      WeatherEngine.refreshWeather(); 
      // await WeatherEngine.playWeatherSound(canvas.scene.weather);
  });


Hooks.on("pauseGame", (paused) => {
  if (!game.user.isGM) return;
  
  const calendarApp =
    game.wgtngmMiniCalender?.calendarInstance ??
    Object.values(ui.windows).find((win) => win instanceof wgtngmMiniCalender);

  if (calendarApp instanceof wgtngmMiniCalender) {
    if (paused) {
      if (calendarApp.isRunning && !calendarApp.wasPausedForCombat) {
        calendarApp._stopTime();
        calendarApp.wasPausedForGame = true;
        console.log("Mini Calendar | Time advancement paused due to game pause.");
      }
    } else {
      if (calendarApp.wasPausedForGame) {
        // Double check we aren't in combat before resuming
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