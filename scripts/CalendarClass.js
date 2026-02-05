
export function createMiniCalendarClass() {
    return class MiniCalendarClass extends CONFIG.time.worldCalendarClass {

        static #epochOffset = 0;
        static #correctFirstWeekday = null;

        /**
         * Whether PF2e sync is currently active.
         * @returns {boolean} Is calendar golarian and pf2e system in play
         */
        static get usePF2eSync() {
            const enableSync = game.settings.get("wgtgm-mini-calendar", "enableSystemPF2e");
            if (!enableSync) return false;

            if (!(game.system.id === "pf2e" && CONFIG.PF2E && game.pf2e && game.pf2e.worldClock)) return false;
            const dateTheme = game.pf2e.worldClock.dateTheme;
            // if (dateTheme !== 'AR' && dateTheme !== 'IC') return false;
            const conf = CONFIG.time.worldCalendarConfig;
            return true;
        }

        /**
         * Initialize epoch offset for PF2e sync.
         * Calculates offset by matching PF2e's Luxon date to our internal time.
         * Also adjusts firstWeekday to align weekdays with Luxon.
         * Only applies when using PF2e with AR/IC theme AND Golarion calendar.
         */
        static initializeEpochOffset() {
            this.#epochOffset = 0;
            if (!this.usePF2eSync) return;

            const wc = game.pf2e.worldClock;
            const dt = wc.worldCreatedOn.plus({ seconds: game.time.worldTime });

            const c = CONFIG.time.worldCalendarConfig;
            const conf = {
                id: c?.id || "",
                yearZero: c?.years?.yearZero ?? 0,
                leapInterval: c?.years?.leapYear?.leapInterval ?? 0,
                months: c?.months?.values ?? [],
                sPerDay: (c?.days?.secondsPerMinute || 60) * (c?.days?.minutesPerHour || 60) * (c?.days?.hoursPerDay || 24),
                sPerMin: c?.days?.secondsPerMinute || 60,
                mPerHour: c?.days?.minutesPerHour || 60,
                resetWeekdays: c?.years?.resetWeekdays || false
            };

            const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);

            const dateTheme = game.pf2e.worldClock.dateTheme;
            const yearOffset = CONFIG.PF2E.worldClock[dateTheme]?.yearOffset || 0;
            const targetYear = dt.year + yearOffset;
            const targetMonthIndex = dt.month - 1;
            const targetDayIndex = dt.day - 1;

            
            let daysInStandard = 0;
            let daysInLeap = 0;
            if (conf.months.length > 0) {
                for (const m of conf.months) {
                    daysInStandard += m.days;
                    daysInLeap += (m.leapDays !== undefined) ? m.leapDays : m.days;
                }
            } else {
                daysInStandard = 365;
                daysInLeap = 366;
            }

            
            let totalDays = 0;
            const yearDiff = targetYear - conf.yearZero;
            let currentYear = conf.yearZero;

            if (yearDiff > 0) {
                
                const daysPer400 = (303 * daysInStandard) + (97 * daysInLeap);
                const cycles400 = Math.floor(yearDiff / 400);
                totalDays += cycles400 * daysPer400;
                currentYear += cycles400 * 400;

                
                while (currentYear < targetYear) {
                    totalDays += isLeap(currentYear) ? daysInLeap : daysInStandard;
                    currentYear++;
                }
            }

            const currentYearLeap = isLeap(targetYear);
            for (let m = 0; m < targetMonthIndex; m++) {
                const month = conf.months[m];
                if (month) {
                    totalDays += (currentYearLeap && month.leapDays !== undefined) ? month.leapDays : month.days;
                }
            }

            totalDays += targetDayIndex;

            const internalTime = totalDays * conf.sPerDay + dt.hour * (conf.mPerHour * conf.sPerMin) + dt.minute * conf.sPerMin + dt.second;
            this.#epochOffset = internalTime - game.time.worldTime;

            const numWeekdays = c?.days?.values?.length ?? 7;
            const calendarTotalDays = totalDays;


            let totalNonCounting = 0;

            const countingDays = totalDays - totalNonCounting;
            const expectedWeekday = dt.weekday - 1;

            const correctFirstWeekday = (((expectedWeekday - (countingDays % numWeekdays)) % numWeekdays) + numWeekdays) % numWeekdays;

            if (c.years && c.years.firstWeekday !== correctFirstWeekday) {
                c.years.firstWeekday = correctFirstWeekday;
            }
            this.#correctFirstWeekday = correctFirstWeekday;
        }

        _getConf() {
            const c = CONFIG.time.worldCalendarConfig;
            return {
                id: c?.id || "",
                yearZero: c?.years?.yearZero ?? 0,
                leapInterval: c?.years?.leapYear?.leapInterval ?? 0,
                months: c?.months?.values ?? [],
                sPerDay: (c?.days?.secondsPerMinute || 60) * (c?.days?.minutesPerHour || 60) * (c?.days?.hoursPerDay || 24),
                sPerMin: c?.days?.secondsPerMinute || 60,
                mPerHour: c?.days?.minutesPerHour || 60,
                resetWeekdays: c?.years?.resetWeekdays || false
            };
        }

        isLeapYear(year) {
            const conf = this._getConf();
            return this._isLeapWithConf(year, conf, MiniCalendarClass.usePF2eSync, conf.id === "gregorian-preset");
        }

        
        
        _isLeapWithConf(year, conf, usePF2e, constructorRule) {
            
            if (usePF2e || constructorRule) {
                
                return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
            }
            if (conf.leapInterval > 0) {
                return year % conf.leapInterval === 0;
            }
            return false;
        }

        _isLeap(year, conf) {
            if (this.constructor.usePF2eSync || conf.id === "gregorian-preset") {
                return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
            }
            if (conf.leapInterval > 0) {
                return year % conf.leapInterval === 0;
            }
            return false;
        }

        
        
        componentsToTime(components) {
            const conf = this._getConf();
            
            const usePF2e = MiniCalendarClass.usePF2eSync;
            const isGregorianPreset = conf.id === "gregorian-preset";

            let totalSeconds = 0;

            const targetYear = components.year;
            let currentYear = conf.yearZero;

            
            const diff = targetYear - currentYear;

            if (diff > 0) {
                if (usePF2e || isGregorianPreset) {


                    let daysInStandard = 0;
                    let daysInLeap = 0;
                    for (const m of conf.months) {
                        daysInStandard += m.days;
                        daysInLeap += (m.leapDays !== undefined) ? m.leapDays : m.days;
                    }

                    const daysPer400 = (303 * daysInStandard) + (97 * daysInLeap);
                    const secondsPer400 = daysPer400 * conf.sPerDay;

                    const cycles400 = Math.floor(diff / 400);
                    totalSeconds += cycles400 * secondsPer400;

                    currentYear += cycles400 * 400;
                }
                else if (conf.leapInterval > 0) {
                    let daysInStandard = 0;
                    let daysInLeap = 0;
                    for (const m of conf.months) {
                        daysInStandard += m.days;
                        daysInLeap += (m.leapDays !== undefined) ? m.leapDays : m.days;
                    }

                    const daysPerCycle = ((conf.leapInterval - 1) * daysInStandard) + daysInLeap;
                    const secondsPerCycle = daysPerCycle * conf.sPerDay;

                    const cycles = Math.floor(diff / conf.leapInterval);
                    totalSeconds += cycles * secondsPerCycle;

                    currentYear += cycles * conf.leapInterval;
                }
                else {
                    
                    let daysInStandard = 0;
                    for (const m of conf.months) daysInStandard += m.days;

                    totalSeconds += diff * daysInStandard * conf.sPerDay;
                    currentYear = targetYear;
                }
            }

            
            while (currentYear < targetYear) {
                const isLeap = this._isLeapWithConf(currentYear, conf, usePF2e, isGregorianPreset);
                let daysInYear = 0;
                for (const m of conf.months) {
                    daysInYear += (isLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
                }
                totalSeconds += daysInYear * conf.sPerDay;
                currentYear++;
            }

            
            const isCurrentLeap = this._isLeapWithConf(targetYear, conf, usePF2e, isGregorianPreset);
            for (let m = 0; m < components.month; m++) {
                const month = conf.months[m];
                const days = (isCurrentLeap && month.leapDays !== undefined) ? month.leapDays : month.days;
                totalSeconds += days * conf.sPerDay;
            }

            totalSeconds += (components.day || 0) * conf.sPerDay;
            totalSeconds += (components.hour || 0) * (conf.sPerMin * conf.mPerHour);
            totalSeconds += (components.minute || 0) * conf.sPerMin;
            totalSeconds += (components.second || 0);

            if (usePF2e) {
                if (!MiniCalendarClass.#epochOffset) MiniCalendarClass.initializeEpochOffset();
                totalSeconds -= MiniCalendarClass.#epochOffset;
            }

            return totalSeconds;
        }

        
        
        timeToComponents(time) {
            
            const usePF2e = MiniCalendarClass.usePF2eSync;

            if (usePF2e) {
                if (MiniCalendarClass.#epochOffset === 0 && MiniCalendarClass.#correctFirstWeekday === null) {
                    MiniCalendarClass.initializeEpochOffset();
                }
                time += MiniCalendarClass.#epochOffset;
            }

            const conf = this._getConf();
            const isGregorianPreset = conf.id === "gregorian-preset";

            let seconds = time || 0;
            let intercalaryDaysSkipped = 0;
            let currentYear = conf.yearZero;

            
            if (usePF2e || isGregorianPreset) {
                let daysInStandard = 0;
                let daysInLeap = 0;
                let intDaysInStandard = 0;
                let intDaysInLeap = 0;

                for (const m of conf.months) {
                    const dStd = m.days;
                    const dLeap = (m.leapDays !== undefined) ? m.leapDays : m.days;
                    daysInStandard += dStd;
                    daysInLeap += dLeap;

                    if (m.intercalary) {
                        intDaysInStandard += dStd;
                        intDaysInLeap += dLeap;
                    }
                }

                const daysPer400 = (303 * daysInStandard) + (97 * daysInLeap);
                const secondsPer400 = daysPer400 * conf.sPerDay;
                const intercalaryDaysPer400 = (303 * intDaysInStandard) + (97 * intDaysInLeap);

                if (seconds >= secondsPer400) {
                    const cycles = Math.floor(seconds / secondsPer400);
                    seconds -= cycles * secondsPer400;
                    currentYear += cycles * 400;
                    intercalaryDaysSkipped += cycles * intercalaryDaysPer400;
                }
            }
            else if (conf.leapInterval > 0) {
                let daysInStandard = 0;
                let daysInLeap = 0;
                let intDaysInStandard = 0;
                let intDaysInLeap = 0;

                for (const m of conf.months) {
                    const dStd = m.days;
                    const dLeap = (m.leapDays !== undefined) ? m.leapDays : m.days;
                    daysInStandard += dStd;
                    daysInLeap += dLeap;

                    if (m.intercalary) {
                        intDaysInStandard += dStd;
                        intDaysInLeap += dLeap;
                    }
                }

                const daysPerCycle = ((conf.leapInterval - 1) * daysInStandard) + daysInLeap;
                const secondsPerCycle = daysPerCycle * conf.sPerDay;
                const intercalaryDaysPerCycle = ((conf.leapInterval - 1) * intDaysInStandard) + intDaysInLeap;

                if (seconds >= secondsPerCycle) {
                    const cycles = Math.floor(seconds / secondsPerCycle);
                    seconds -= cycles * secondsPerCycle;
                    currentYear += cycles * conf.leapInterval;
                    intercalaryDaysSkipped += cycles * intercalaryDaysPerCycle;
                }
            } else {
                let daysInStandard = 0;
                let intDaysInStandard = 0;
                for (const m of conf.months) {
                    daysInStandard += m.days;
                    if (m.intercalary) intDaysInStandard += m.days;
                }
                const secondsPerYear = daysInStandard * conf.sPerDay;

                if (seconds >= secondsPerYear) {
                    const years = Math.floor(seconds / secondsPerYear);
                    seconds -= years * secondsPerYear;
                    currentYear += years;
                    intercalaryDaysSkipped += years * intDaysInStandard;
                }
            }

            
            while (true) {
                const isLeap = this._isLeapWithConf(currentYear, conf, usePF2e, isGregorianPreset);

                let daysInYear = 0;
                let intDaysInYear = 0;

                for (const m of conf.months) {
                    const d = (isLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
                    daysInYear += d;
                    if (m.intercalary) intDaysInYear += d;
                }

                const secInYear = daysInYear * conf.sPerDay;

                if (seconds >= secInYear) {
                    seconds -= secInYear;
                    intercalaryDaysSkipped += intDaysInYear;
                    currentYear++;
                } else {
                    break;
                }
            }

            const isCurrentLeap = this._isLeapWithConf(currentYear, conf, usePF2e, isGregorianPreset);
            let monthIndex = 0;

            for (let i = 0; i < conf.months.length; i++) {
                const m = conf.months[i];
                const days = (isCurrentLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
                const secInMonth = days * conf.sPerDay;

                if (seconds >= secInMonth) {
                    seconds -= secInMonth;
                    if (m.intercalary) intercalaryDaysSkipped += days;
                } else {
                    monthIndex = i;
                    break;
                }
            }

            const day = Math.floor(seconds / conf.sPerDay);
            seconds -= day * conf.sPerDay;

            const hour = Math.floor(seconds / (conf.sPerMin * conf.mPerHour));
            seconds -= hour * (conf.sPerMin * conf.mPerHour);

            const minute = Math.floor(seconds / conf.sPerMin);
            seconds -= minute * conf.sPerMin;
            const second = Math.round(seconds);

            const daysInWeek = CONFIG.time.worldCalendarConfig?.days?.values?.length || 7;
            const totalDaysPassed = Math.floor((time || 0) / conf.sPerDay);
            let dayOfWeek = 0;

            const currentMonth = conf.months[monthIndex];

            if (currentMonth.intercalary) {
                dayOfWeek = -1;
            }

            if (conf.resetWeekdays) {
                dayOfWeek = day % daysInWeek;
            } else {
                const effectiveDays = totalDaysPassed - intercalaryDaysSkipped;
                const firstWeekday = CONFIG.time.worldCalendarConfig?.years?.firstWeekday || 0;
                dayOfWeek = (effectiveDays + firstWeekday) % daysInWeek;
            }

            const startingWeekday = currentMonth?.startingWeekday ?? null;
            if (Number.isFinite(startingWeekday)) {
                dayOfWeek = (day + startingWeekday) % daysInWeek;
            }

            return {
                year: currentYear,
                month: monthIndex,
                day: day,
                dayOfMonth: day,
                dayOfWeek: dayOfWeek,
                hour: hour,
                minute: minute,
                second: second,
                leapYear: isCurrentLeap,
                isIntercalary: currentMonth.intercalary || false
            };
        }
    }
}
