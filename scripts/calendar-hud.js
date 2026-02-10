import { MODULE_NAME } from "./settings.js";
import { openwgtngmMiniCalendarSheet, localize, renderHelper, calendarJournal } from "./helper.js";
import { WeatherEngine } from "./weather.js";
import { CalendarConfig } from "./calendar-config.js";
import { WeatherConfig } from "./weather-config.js";

const ApplicationV2 = foundry.applications.api.ApplicationV2;
const HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;

export class CalendarHUD extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);
        this._cachedElements = {};

    }


    async _onFirstRender(context, options) {
        game.settings.set(MODULE_NAME, "calHudOpened", true);
        const fadedUI = game.settings.get(MODULE_NAME, "fadedUI");
        if (fadedUI) { this.element.classList.toggle("faded-ui", fadedUI); }


        if (!this._clockInterval) {
            let lastProcessedTime = null;
            this._clockInterval = setInterval(() => {
                if (!this.element) return;

                const currentWorldTime = game.time.worldTime;
                if (currentWorldTime === lastProcessedTime) return;
                lastProcessedTime = currentWorldTime;

                this._updateTimeDisplay();
            }, 1000);
        }
    }

    close(options) {
        if (this._clockInterval) {
            clearInterval(this._clockInterval);
            this._clockInterval = null;
        }
        return super.close(options);
    }


    _updateTimeDisplay() {
        const calendar = game.time.calendar;
        if (!calendar) return;

        const timestamp = game.time.worldTime;
        const comps = game.wgtngmMiniCalender.getCachedDateComponents(timestamp) || calendar.timeToComponents(timestamp);

        const timeText = this._formatTime(timestamp);

        let timeEl = this._cachedElements.timeText;
        if (!timeEl || !document.body.contains(timeEl)) {
            timeEl = this.element.querySelector(".time-text-overlay");
            this._cachedElements.timeText = timeEl;
        }


        if (timeEl && (this._lastTimeText !== timeText)) {
            timeEl.innerText = timeText;
            this._lastTimeText = timeText;
        }

        const monthName = calendar.months.values[comps.month].name;
        const dateText = `${comps.dayOfMonth + 1} ${game.i18n.localize(monthName)}, ${comps.year}`;


        let dateEl = this._cachedElements.dateText;
        if (!dateEl || !document.body.contains(dateEl)) {
            dateEl = this.element.querySelector(".date-text");
            this._cachedElements.dateText = dateEl;
        }


        if (dateEl && (this._lastDateText !== dateText)) {
            if (dateEl.firstChild && dateEl.firstChild.nodeType === Node.TEXT_NODE) {
                dateEl.firstChild.nodeValue = dateText + " ";
                this._lastDateText = dateText;
            }
        }

        const mph = calendar.days.minutesPerHour || 60;
        const spm = calendar.days.secondsPerMinute || 60;
        const currentHour = comps.hour + (comps.minute / mph) + (comps.second / (mph * spm));

        const sunTimes = game.wgtngmMiniCalender._getSunTimes();

        let timeBlock = this._cachedElements.timeBlock;
        if (!timeBlock || !document.body.contains(timeBlock)) {
            timeBlock = this.element.querySelector(".hud-time-block");
            this._cachedElements.timeBlock = timeBlock;
        }

        let sunEl = this._cachedElements.sun;
        if (!sunEl || !document.body.contains(sunEl)) {
            sunEl = this.element.querySelector(".celestial-body.sun");
            this._cachedElements.sun = sunEl;
        }

        let moonEl = this._cachedElements.moon;
        if (!moonEl || !document.body.contains(moonEl)) {
            moonEl = this.element.querySelector(".celestial-body.moon");
            this._cachedElements.moon = moonEl;
        }

        if (timeBlock && sunEl && moonEl) {
            if (this._dragContext) return;
            this._updateVisualsForTime(currentHour, sunTimes, sunEl, moonEl, timeBlock);
        }

        const isRunning = game.wgtngmMiniCalender ? game.wgtngmMiniCalender.isRunning : false;
        if (this._lastIsRunning !== isRunning) {
            let playBtnIcon = this._cachedElements.playBtn;
            if (!playBtnIcon || !document.body.contains(playBtnIcon)) {
                playBtnIcon = this.element.querySelector(".play-pause-btn i");
                this._cachedElements.playBtn = playBtnIcon;
            }

            if (playBtnIcon) {
                playBtnIcon.classList.remove("fa-play", "fa-pause");
                playBtnIcon.classList.add(isRunning ? "fa-pause" : "fa-play");
                this._lastIsRunning = isRunning;
            }
        }
    }

    static DEFAULT_OPTIONS = {
        id: "calendar-hud-wgtgm",
        tag: "div",
        window: {
            title: "Calendar HUD",
            icon: "fas fa-calendar-alt",
            controls: [],
            resizable: false,
            frame: false
        },
        position: {
            width: "100%",
            height: "auto",
            top: 0,
            left: 0
        },
        classes: ["calendar-hud-app", "wgtngm-hud"],
        actions: {
            "open-calendar": CalendarHUD.openCalendar,
            "open-settings": CalendarHUD.openSettings,
            "add-note": CalendarHUD.addNote,
            "set-weather": CalendarHUD.setWeather,
            "weather-config": CalendarHUD.weatherConfig,
            "refresh-weather": CalendarHUD.refreshWeather,


            "advance-hour": CalendarHUD.advanceHour,
            "advance-hour-neg": CalendarHUD.advanceHourNeg,
            "advance-day": CalendarHUD.advanceDay,
            "advance-day-neg": CalendarHUD.advanceDayNeg,
            "advance-10m": CalendarHUD.advance10m,
            "advance-10m-neg": CalendarHUD.advance10mNeg,
            "jump-dusk": CalendarHUD.jumpDusk,
            "jump-dawn": CalendarHUD.jumpDawn,


            "toggle-weather": CalendarHUD.toggleWeather,
            "toggle-scene-weather": CalendarHUD.toggleSceneWeather,
            "toggle-sfx": CalendarHUD.toggleSFX,
            "toggle-play-pause": CalendarHUD.togglePlayPause,
        }
    };

    static PARTS = {
        main: {
            template: "modules/wgtgm-mini-calendar/templates/calendar-hud.hbs",
        }
    };

    /** @inheritDoc */
    async _prepareContext(options) {
        const calendar = game.time.calendar;
        if (!calendar) return {};
        const playerNotes = game.settings.get(MODULE_NAME, "allowPlayerNotes");
        const timestamp = game.time.worldTime;
        const comps = calendar.timeToComponents(timestamp);
        const monthName = calendar.months.values[comps.month].name;

        const date = `${comps.dayOfMonth + 1} ${game.i18n.localize(monthName)}, ${comps.year}`;
        const time = this._formatTime(timestamp);


        let seasonName = "Unknown";
        if (calendar.seasons?.values?.length) {
            const currentMonth = calendar.months.values[comps.month];
            if (currentMonth && typeof currentMonth.ordinal === "number") {
                const viewMonthOrdinal = currentMonth.ordinal;
                for (const season of calendar.seasons.values) {
                    const start = season.monthStart;
                    const end = season.monthEnd;
                    if (start <= end) {
                        if (viewMonthOrdinal >= start && viewMonthOrdinal <= end) {
                            seasonName = game.i18n.localize(season.name);
                            break;
                        }
                    } else {
                        if (viewMonthOrdinal >= start || viewMonthOrdinal <= end) {
                            seasonName = game.i18n.localize(season.name);
                            break;
                        }
                    }
                }
            }
        }


        const sunTimes = game.wgtngmMiniCalender._getSunTimes();
        const currentHour = comps.hour + (comps.minute / 60) + (comps.second / 3600);


        const dawn = sunTimes.dawn;
        const dusk = sunTimes.dusk;

        let timeClass = "night";
        let isDay = false;
        let isNight = true;

        const hoursPerDay = calendar.days.hoursPerDay || 24;
        const progress = currentHour / hoursPerDay;
        const displayPosition = Math.max(0, Math.min(100, progress * 100));

        const y = 4 * progress * (1 - progress);
        const heightPercent = 85 - (y * 65);

        if (currentHour >= dawn && currentHour < dusk) {
            isDay = true;
            isNight = false;
            timeClass = "day";
            if (currentHour < dawn + 1) timeClass = "dawn";
            else if (currentHour > dusk - 1) timeClass = "dusk";
        } else {
            isDay = false;
            isNight = true;
            timeClass = "night";
        }

        const sunPosition = displayPosition;
        const moonPosition = displayPosition;
        const sunHeight = heightPercent;
        const moonHeight = heightPercent;

        let moonImage = "";
        let moonPhase = "Full Moon";
        let moonColor = "#fff";

        if (calendar.moons && calendar.moons.length > 0) {
            const moonConfig = CONFIG.time.worldCalendarConfig.moons?.values?.[0];
            if (moonConfig) {
                const calApp = game.wgtngmMiniCalender;
                if (calApp && calApp._calculateMoonPhase) {
                    const phaseData = calApp._calculateMoonPhase(timestamp, moonConfig, calendar);
                    if (phaseData) {
                        moonImage = phaseData.image;
                        moonPhase = phaseData.phaseDisplayName;
                        moonColor = phaseData.color || "#fff";
                    }
                }
            }
        }

        let weatherIcon = "";
        let weatherLabel = "Clear";
        let tempDisplay = "";


        const enableWeather = game.settings.get(MODULE_NAME, "enableWeatherEffects");
        const enableForecast = game.settings.get(MODULE_NAME, "enableWeatherForecast");
        const enableSound = game.settings.get(MODULE_NAME, "enableWeatherSound");
        const sceneFlag = canvas.scene?.getFlag(MODULE_NAME, "enableWeather");

        const hideWeatherPlayer = game.settings.get(MODULE_NAME, "hideWeatherPlayer");
        let showWeatherStats = enableForecast && (game.user.isGM || !hideWeatherPlayer) ? true : false;


        if (showWeatherStats) {
            const forecast = await WeatherEngine.getWeatherForDate(comps.year, comps.month, comps.dayOfMonth);
            let weatherTypeToUse = forecast;
            if (comps.hour >= 12 && comps.hour < 18) {
                if (forecast.variations?.midday) {
                    weatherTypeToUse = forecast.variations.midday;
                }
            } else if (comps.hour >= 18) {
                if (forecast.variations?.evening) {
                    weatherTypeToUse = forecast.variations.evening;
                }
            }
            if (enableForecast && forecast) {
                tempDisplay = WeatherEngine.getTempDisplay(forecast.temp) || "";
                weatherIcon = weatherTypeToUse.icon || "";
                weatherLabel = weatherTypeToUse.label || "";
            } else {
                showWeatherStats = false;
            }
        }

        return {
            playerNotes,
            date,
            time,
            seasonName,
            timeClass,
            isDay,
            isNight,
            sunPosition,
            sunHeight,
            moonPosition,
            moonHeight,
            moonImage,
            moonPhase,
            moonColor,
            weatherIcon,
            weatherLabel,
            tempDisplay,
            showWeatherStats,
            toggles: {
                weather: enableWeather,
                sceneWeather: sceneFlag !== false,
                sfx: enableSound
            },
            isGM: game.user.isGM,
            isRunning: game.wgtngmMiniCalender ? game.wgtngmMiniCalender.isRunning : false,
        };
    }


    _getWeatherIcon(type) {
        const icons = {
            "none": "fas fa-sun", "clouds": "fas fa-cloud", "partlyCloudy": "fas fa-cloud-sun",
            "rain": "fas fa-cloud-rain", "lightRain": "fas fa-cloud-rain", "heavyRain": "fas fa-cloud-showers-heavy",
            "rainStorm": "fas fa-cloud-bolt", "snow": "fas fa-snowflake", "lightSnow": "fas fa-snowflake",
            "blizzard": "fas fa-wind", "fog": "fas fa-smog", "hail": "fas fa-cloud-hail",
            "lightWind": "fas fa-wind", "sandstorm": "fas fa-wind", "aurora": "fas fa-moon-over-sun",
            "heatWave": "fas fa-temperature-hot"
        };
        return icons[type] || "fas fa-cloud";
    }

    _formatTime(seconds) {
        const calendar = game.time.calendar;
        if (!calendar) return "";
        try {

            const comps = game.wgtngmMiniCalender.getCachedDateComponents(seconds) || calendar.timeToComponents(seconds);
            let h = comps.hour;
            const m = String(comps.minute).padStart(2, "0");
            const s = String(comps.second).padStart(2, "0");
            if (game.settings.get(MODULE_NAME, "use12hour")) {
                const ampm = h >= 12 ? "PM" : "AM";
                h = h % 12;
                h = h ? h : 12;
                return `${h}:${m}:${s} ${ampm}`;
            }
            return `${String(h).padStart(2, "0")}:${m}:${s}`;
        } catch (e) { return "--:--:--"; }
    }

    async _onRender(context, options) {
        super._onRender(context, options);

        this._cachedElements = {
            timeText: this.element.querySelector(".time-text-overlay"),
            dateText: this.element.querySelector(".date-text"),
            timeBlock: this.element.querySelector(".hud-time-block"),
            sun: this.element.querySelector(".celestial-body.sun"),
            moon: this.element.querySelector(".celestial-body.moon"),
            playBtn: this.element.querySelector(".play-pause-btn i")
        };

        if (game.user.isGM) {

            const timeBlock = this._cachedElements.timeBlock;

            if (timeBlock) {
                timeBlock.addEventListener("pointerdown", this._onTimeBlockPointerDown.bind(this));
            }
        }
    }



    async close(options = {}) {
        game.settings.set(MODULE_NAME, "calHudOpened", false);
        this._cachedElements = {};
        return super.close(options);
    }




    async _onTimeBlockPointerDown(event) {
        event.preventDefault();
        const timeBlock = event.currentTarget.closest(".hud-time-block");
        if (!timeBlock) return;

        const rect = timeBlock.getBoundingClientRect();

        const calendar = game.time.calendar;
        if (!calendar) return;

        const currentTimestamp = game.time.worldTime;
        const currentComps = calendar.timeToComponents(currentTimestamp);

        const mph = calendar.days.minutesPerHour || 60;
        const spm = calendar.days.secondsPerMinute || 60;
        const hpd = calendar.days.hoursPerDay || 24;
        const totalSecondsInDay = hpd * mph * spm;

        const secondsPassedToday = (currentComps.hour * mph * spm) +
            (currentComps.minute * spm) +
            currentComps.second;

        const startOfDayTimestamp = currentTimestamp - secondsPassedToday;

        this._dragContext = {
            rect: rect,
            startOfDayTimestamp: startOfDayTimestamp,
            totalSecondsInDay: totalSecondsInDay,
            mph: mph,
            spm: spm,
            sunTimes: game.wgtngmMiniCalender._getSunTimes(),
            timeBlock: timeBlock,
            sunEl: timeBlock.querySelector(".celestial-body.sun"),
            moonEl: timeBlock.querySelector(".celestial-body.moon"),
            textEl: this.element.querySelector(".time-text-overlay"),

            currentX: event.clientX,
            pendingTimestamp: currentTimestamp,
            isRunning: true
        };

        this._dragMoveHandler = this._onTimeBlockPointerMoveNew.bind(this);
        this._dragUpHandler = this._onTimeBlockPointerUp.bind(this);

        window.addEventListener("pointermove", this._dragMoveHandler, { passive: false });
        window.addEventListener("pointerup", this._dragUpHandler, { passive: false });

        this._renderDragLoop();
    }

    _onTimeBlockPointerMove(event) {
    }

    async _onTimeBlockPointerUp(event) {
        window.removeEventListener("pointermove", this._dragMoveHandler);
        window.removeEventListener("pointerup", this._dragUpHandler);

        if (this._dragContext) {
            this._dragContext.isRunning = false;

            if (this._dragContext.pendingTimestamp !== undefined) {
                const calendar = game.time.calendar;
                const comps = calendar.timeToComponents(this._dragContext.pendingTimestamp);

                const setConfig = {
                    year: comps.year,
                    month: comps.month,
                    day: comps.dayOfMonth,
                    hour: comps.hour,
                    minute: comps.minute,
                    second: comps.second
                };
                game.time.set(setConfig);

            }
        }

        this._dragContext = null;
    }

    _formatTimeFromComps(comps) {
        let h = comps.hour;
        const m = String(comps.minute).padStart(2, "0");
        const s = String(comps.second || 0).padStart(2, "0");
        if (game.settings.get(MODULE_NAME, "use12hour")) {
            const ampm = h >= 12 ? "PM" : "AM";
            h = h % 12;
            h = h ? h : 12;
            return `${h}:${m}:${s} ${ampm}`;
        }
        return `${String(h).padStart(2, "0")}:${m}:${s}`;
    }

    _updateVisualsForTime(currentHour, sunTimes, sunEl, moonEl, container) {
        const calendar = game.time.calendar;
        const hoursPerDay = calendar.days.hoursPerDay || 24;
        const progress = currentHour / hoursPerDay;
        const percent = Math.max(0, Math.min(100, progress * 100));

        this._updateVisualsDirectly(percent, currentHour, sunTimes, sunEl, moonEl, container);
    }

    _updateVisualsDirectly(percent, currentHour, sunTimes, sunEl, moonEl, container) {
        if (!sunEl || !moonEl) return;


        if (this._lastPercent !== undefined && Math.abs(this._lastPercent - percent) < 0.1) {

            const dawn = sunTimes.dawn;
            const dusk = sunTimes.dusk;

            if ((currentHour < dawn - 2) || (currentHour > dawn + 2 && currentHour < dusk - 2) || (currentHour > dusk + 2)) {
                return;
            }
        }
        this._lastPercent = percent;

        const p = percent / 100;
        const y = 4 * p * (1 - p);
        const top = 85 - (y * 65);

        sunEl.style.left = `${percent}%`;
        sunEl.style.top = `${top}%`;
        moonEl.style.left = `${percent}%`;
        moonEl.style.top = `${top}%`;
        const dawn = sunTimes.dawn;
        const dusk = sunTimes.dusk;
        const transitionDuration = 1;

        const getSunOpacity = (hour) => {
            if (hour >= dawn + transitionDuration && hour <= dusk - transitionDuration) return 1;
            if (hour < dawn - transitionDuration || hour > dusk + transitionDuration) return 0;


            if (hour >= dawn - transitionDuration && hour < dawn + transitionDuration) {
                return (hour - (dawn - transitionDuration)) / (2 * transitionDuration);
            }


            if (hour >= dusk - transitionDuration && hour < dusk + transitionDuration) {
                return 1 - ((hour - (dusk - transitionDuration)) / (2 * transitionDuration));
            }
            return 0;
        };

        const sunOpacity = getSunOpacity(currentHour);
        const moonOpacity = 1 - sunOpacity;

        sunEl.style.opacity = Math.max(0, Math.min(1, sunOpacity));
        moonEl.style.opacity = Math.max(0, Math.min(1, moonOpacity));

        sunEl.classList.remove("hidden");
        moonEl.classList.remove("hidden");

        container.classList.remove("dawn", "day", "dusk", "night");
        let bgClass = "night";
        if (currentHour >= dawn && currentHour < dusk) {
            bgClass = "day";
            if (currentHour < dawn + 1) bgClass = "dawn";
            else if (currentHour > dusk - 1) bgClass = "dusk";
        }
        else {
        }


        if (!container.classList.contains(bgClass)) {
            container.classList.add(bgClass);
        }
    }

    _onTimeBlockPointerMoveNew(event) {
        if (!this._dragContext) return;
        event.preventDefault();
        this._dragContext.currentX = event.clientX;
    }

    _renderDragLoop() {
        if (!this._dragContext || !this._dragContext.isRunning) return;

        const { rect, startOfDayTimestamp, totalSecondsInDay, timeBlock, sunEl, moonEl, textEl, mph, spm, sunTimes, currentX } = this._dragContext;

        const relativeX = currentX - rect.left;
        const clampedX = Math.max(0, Math.min(rect.width, relativeX));

        const percent = clampedX / rect.width;

        const daySeconds = Math.floor(percent * totalSecondsInDay);

        const newTimestamp = startOfDayTimestamp + daySeconds;


        if (this._dragContext.pendingTimestamp !== newTimestamp) {
            const calendar = game.time.calendar;
            const newComps = calendar.timeToComponents(newTimestamp);

            if (textEl) {
                textEl.innerText = this._formatTimeFromComps(newComps);
            }

            const sliderPercent = percent * 100;
            const currentHour = newComps.hour + (newComps.minute / mph) + (newComps.second / (mph * spm));

            this._updateVisualsDirectly(sliderPercent, currentHour, sunTimes, sunEl, moonEl, timeBlock);
            this._dragContext.pendingTimestamp = newTimestamp;
        }
        requestAnimationFrame(this._renderDragLoop.bind(this));
    }



    /* ACTIONS */
    static openCalendar() { openwgtngmMiniCalendarSheet(); }
    static openSettings() { new CalendarConfig().render(true); }

    static addNote() {
        if (game.wgtngmMiniCalender) {
            const nowComponents = game.time.calendar.timeToComponents(game.time.worldTime);
            const currentDateObj = {
                year: nowComponents.year,
                month: nowComponents.month,
                day: nowComponents.dayOfMonth,
                hour: nowComponents.hour,
                minute: nowComponents.minute
            };
            game.wgtngmMiniCalender._showAddNoteDialog(currentDateObj, null, null, false);
        }
    }

    static setWeather() {
        if (game.wgtngmMiniCalender) {
            const nowComponents = game.time.calendar.timeToComponents(game.time.worldTime);
            const currentDateObj = {
                year: nowComponents.year,
                month: nowComponents.month,
                day: nowComponents.dayOfMonth,
            };
            game.wgtngmMiniCalender._showWeatherOverrideDialog(currentDateObj);
        }
    }

    static weatherConfig() { new WeatherConfig().render(true); }

    async updateWeatherIcon(){
        const enableForecast = game.settings.get(MODULE_NAME, "enableWeatherForecast");
        const hideWeatherPlayer = game.settings.get(MODULE_NAME, "hideWeatherPlayer");
        const showWeatherStats = enableForecast && (game.user.isGM || !hideWeatherPlayer) ? true : false;
        if (!showWeatherStats) return;

        const comps = game.time.calendar.timeToComponents(game.time.worldTime);
        const forecast = await WeatherEngine.getWeatherForDate(comps.year, comps.month, comps.dayOfMonth);
        if (!forecast) return;

        let weatherTypeToUse = forecast;
        if (comps.hour >= 12 && comps.hour < 18) {
            if (forecast.variations?.midday) {
                weatherTypeToUse = forecast.variations.midday;
            }
        } else if (comps.hour >= 18) {
            if (forecast.variations?.evening) {
                weatherTypeToUse = forecast.variations.evening;
            }
        }
        const html = this.element;
        const weatherBlock = html.querySelector(".hud-group.weather-forecast");
        if (!weatherBlock) return;
        const iconElement = weatherBlock.querySelector("i");
        const tempElement = weatherBlock.querySelector("span");
        if (iconElement && weatherTypeToUse.icon) {
            iconElement.className = weatherTypeToUse.icon; 
            if (weatherTypeToUse.label) {
                iconElement.setAttribute("data-tooltip", weatherTypeToUse.label);
            }
        }
        if (tempElement) {
            const tempDisplay = WeatherEngine.getTempDisplay(forecast.temp) || "";
            tempElement.innerText = tempDisplay;
        }
    }

    static async refreshWeather() {
        const calendar = game.time.calendar;
        if (!calendar) return;

        const timestamp = game.time.worldTime;
        const comps = calendar.timeToComponents(timestamp);

        const date = {
            year: comps.year,
            month: comps.month,
            day: comps.dayOfMonth
        };

        await WeatherEngine.createForecasts(date);
        ui.notifications.info("Weather Regenerated");
        if (game.wgtngmMiniCalender?.hud.rendered) game.wgtngmMiniCalender.hud.updateWeatherIcon();
        // if (game.wgtngmMiniCalender.hud) game.wgtngmMiniCalender.hud.render();
    }




    minuteInSeconds() {
        const calendar = game.time.calendar;
        if (!calendar) return;
        const spm = calendar.days.secondsPerMinute || 60;
        return spm;
    }

    hourInSeconds() {
        const calendar = game.time.calendar;
        if (!calendar) return;
        const mph = calendar.days.minutesPerHour || 60;
        const spm = calendar.days.secondsPerMinute || 60;
        const secondsPerHour = mph * spm;
        return secondsPerHour;
    }

    dayInSeconds() {
        const calendar = game.time.calendar;
        if (!calendar) return;
        const hpd = calendar.days.hoursPerDay || 24;
        const mph = calendar.days.minutesPerHour || 60;
        const spm = calendar.days.secondsPerMinute || 60;
        const secondsPerDay = hpd * mph * spm;
        return secondsPerDay;
    }


    static advanceHourNeg(event) {
        if (!game.user.isGM) return;
        game.time.set(game.time.worldTime - this.hourInSeconds());
    }
    static advance10mNeg(event) {
        if (!game.user.isGM) return;
        game.time.set(game.time.worldTime - (this.minuteInSeconds() * 10));
    }
    static advanceHour(event) {
        if (!game.user.isGM) return;
        game.time.set(game.time.worldTime + this.hourInSeconds());
    }
    static advance10m(event) {
        if (!game.user.isGM) return;
        game.time.set(game.time.worldTime + (this.minuteInSeconds() * 10));
    }
    static async advanceDay() {
        if (!game.user.isGM) return;
        game.time.set(game.time.worldTime + this.dayInSeconds());
    }

    static async advanceDayNeg() {
        if (!game.user.isGM) return;
        game.time.set(game.time.worldTime - this.dayInSeconds());

    }

    static async jumpDusk() {
        const { dusk } = game.wgtngmMiniCalender._getSunTimes();
        game.wgtngmMiniCalender._onSetTimeOfDay(dusk, 0);
    }

    static async jumpDawn() {
        const { dawn } = game.wgtngmMiniCalender._getSunTimes();
        game.wgtngmMiniCalender._onSetTimeOfDay(dawn, 1);
    }

    static async toggleWeather(event) {
        await game.wgtngmMiniCalender.weatherFX()
        this.render();
    }

    static async toggleSceneWeather(event) {
        if (!canvas.scene || !game.user.isGM) return;
        await game.wgtngmMiniCalender.sceneFX()
        this.render();
    }



    static async toggleSFX(event) {
        game.wgtngmMiniCalender.weatherSound()

    }

    static async togglePlayPause() {
        if (game.wgtngmMiniCalender) {
            game.wgtngmMiniCalender.togglePlayback();
        }
    }
}

















