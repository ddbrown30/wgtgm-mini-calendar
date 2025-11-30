
/**
 * Generates the MiniCalendarClass extending the current worldCalendarClass.
 * This ensures we inherit from any system-specific calendar logic (like DnD5e's formatters).
 */
export function createMiniCalendarClass() {
    return class MiniCalendarClass extends CONFIG.time.worldCalendarClass {
        /**
         * @override
         * Overrides timeToComponents to inject custom month starting weekdays.
         */
        timeToComponents(...args) {
            const components = super.timeToComponents(...args);
            
            // Get the configuration for the current month
            // Note: CONFIG.time.worldCalendarConfig is set in main.js
            const monthConfig = CONFIG.time.worldCalendarConfig?.months?.values?.[components.month];
            
            const startingWeekday = monthConfig?.startingWeekday ?? null;

            // If this month defines a specific starting weekday, recalculate dayOfWeek
            if (Number.isFinite(startingWeekday)) {
                /**
                 * Calculate the day of the week based on:
                 * (day of month (0-indexed) + configured starting weekday) % number of weekdays
                 */
                components.dayOfWeek = (components.dayOfMonth + startingWeekday) % this.days.values.length;
            }
            
            return components;
        }
    }
}