export function createMiniCalendarClass() {
    return class MiniCalendarClass extends CONFIG.time.worldCalendarClass {
        /**
         * @override
         * Overrides timeToComponents to apply Year Zero, First Weekday, and Month Start offsets.
         */
        timeToComponents(...args) {
            const components = super.timeToComponents(...args);
            const config = CONFIG.time.worldCalendarConfig;

            if (config) {
                if (config.years?.yearZero) {
                    components.year += config.years.yearZero;
                }

                if (Number.isFinite(config.years?.firstWeekday)) {
                    const daysInWeek = this.days?.values?.length || 7;
                    components.dayOfWeek = (components.dayOfWeek + config.years.firstWeekday) % daysInWeek;
                }

                const monthConfig = config.months?.values?.[components.month];
                const startingWeekday = monthConfig?.startingWeekday ?? null;

                if (Number.isFinite(startingWeekday)) {
                    const daysInWeek = this.days?.values?.length || 7;
                    components.dayOfWeek = (components.dayOfMonth + startingWeekday) % daysInWeek;
                }
            }
            
            return components;
        }
    }
}

