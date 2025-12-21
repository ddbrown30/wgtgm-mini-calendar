export function createMiniCalendarClass() {
    return class MiniCalendarClass extends CONFIG.time.worldCalendarClass {
        
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

        _isLeap(year, conf) {
            if (conf.id === "gregorian-preset") {
                return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
            }
            if (conf.leapInterval > 0) {
                return year % conf.leapInterval === 0;
            }
            return false;
        }

        // WRITER: Date -> Seconds
        componentsToTime(components) {
            const conf = this._getConf();
            let totalSeconds = 0;

            for (let y = conf.yearZero; y < components.year; y++) {
                const isLeap = this._isLeap(y, conf);
                let daysInYear = 0;
                for (const m of conf.months) {
                    daysInYear += (isLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
                }
                totalSeconds += daysInYear * conf.sPerDay;
            }

            const isCurrentLeap = this._isLeap(components.year, conf);
            for (let m = 0; m < components.month; m++) {
                const month = conf.months[m];
                const days = (isCurrentLeap && month.leapDays !== undefined) ? month.leapDays : month.days;
                totalSeconds += days * conf.sPerDay;
            }

            totalSeconds += (components.day || 0) * conf.sPerDay;
            totalSeconds += (components.hour || 0) * (conf.sPerMin * conf.mPerHour);
            totalSeconds += (components.minute || 0) * conf.sPerMin;
            totalSeconds += (components.second || 0);

            return totalSeconds;
        }

        // READER: Seconds -> Date
        timeToComponents(time) {
            const conf = this._getConf();
            let seconds = time || 0;
            
            let intercalaryDaysSkipped = 0; 
            
            let currentYear = conf.yearZero;
            while (true) {
                const isLeap = this._isLeap(currentYear, conf);
                
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

            const isCurrentLeap = this._isLeap(currentYear, conf);
            let monthIndex = 0;
            
            for (let i = 0; i < conf.months.length; i++) {
                const m = conf.months[i];
                const days = (isCurrentLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
                const secInMonth = days * conf.sPerDay;

                if (seconds >= secInMonth) {
                    seconds -= secInMonth;
                    if (m.intercalary) intercalaryDaysSkipped += days; // Add full month of intercalary days
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

