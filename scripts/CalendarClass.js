
export function createMiniCalendarClass() {
    return class MiniCalendarClass extends CONFIG.time.worldCalendarClass {
        /**
         * @override
         * Overrides timeToComponents to apply Year Zero, First Weekday, and Month Start offsets.
         */
        timeToComponents(...args) {
            let components;

            try {
                components = super.timeToComponents(...args);
            } catch (e) {
                console.error("Mini Calendar | Critical Error in timeToComponents. Your Calendar Configuration (Seasons/Months) may be invalid.", e);
                return {
                    year: 0,
                    month: 0,
                    day: 0,
                    dayOfMonth: 0,
                    dayOfWeek: 0,
                    hour: 0,
                    minute: 0,
                    second: 0
                };
            }

            const config = CONFIG.time.worldCalendarConfig;
            if (config) {
                if (config.years?.yearZero) {
                    components.year += config.years.yearZero;
                }

                const daysInWeek = this.days?.values?.length || 7;

                if (config.years?.resetWeekdays) {
                    components.dayOfWeek = components.dayOfMonth % daysInWeek;
                } 
                else {
                    if (Number.isFinite(config.years?.firstWeekday)) {
                        components.dayOfWeek = (components.dayOfWeek + config.years.firstWeekday) % daysInWeek;
                    }

                    const monthConfig = config.months?.values?.[components.month];
                    const startingWeekday = monthConfig?.startingWeekday ?? null;

                    if (Number.isFinite(startingWeekday)) {
                        components.dayOfWeek = (components.dayOfMonth + startingWeekday) % daysInWeek;
                    }
                }
            }
            // if (config) {
            //     if (config.years?.yearZero) {
            //         components.year += config.years.yearZero;
            //     }

            //     if (Number.isFinite(config.years?.firstWeekday)) {
            //         const daysInWeek = this.days?.values?.length || 7;
            //         components.dayOfWeek = (components.dayOfWeek + config.years.firstWeekday) % daysInWeek;
            //     }

            //     const monthConfig = config.months?.values?.[components.month];
            //     const startingWeekday = monthConfig?.startingWeekday ?? null;

            //     if (Number.isFinite(startingWeekday)) {
            //         const daysInWeek = this.days?.values?.length || 7;
            //         components.dayOfWeek = (components.dayOfMonth + startingWeekday) % daysInWeek;
            //     }
            // }
            
            return components;
        }
    }
}




