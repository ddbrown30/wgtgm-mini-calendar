import { MODULE_NAME } from "./settings.js";
import { WeatherEngine } from "./weather.js";

export const openMeteoURL = "https://archive-api.open-meteo.com/v1/archive";

//This engine leverages the Open Meteo API to generate weather based on real world historical data
export class HistoricalDataWeatherEngine extends WeatherEngine {

    getWeatherDef(weatherCode) {
        //WMO Code
        // Code	        Description
        // 0	        Clear sky
        // 1, 2, 3	    Mainly clear, partly cloudy, and overcast
        // 45, 48	    Fog and depositing rime fog
        // 51, 53, 55	Drizzle: Light, moderate, and dense intensity
        // 56, 57	    Freezing Drizzle: Light and dense intensity
        // 61, 63, 65	Rain: Slight, moderate and heavy intensity
        // 66, 67	    Freezing Rain: Light and heavy intensity
        // 71, 73, 75	Snow fall: Slight, moderate, and heavy intensity
        // 77	        Snow grains
        // 80, 81, 82	Rain showers: Slight, moderate, and violent
        // 85, 86	    Snow showers slight and heavy
        // 95	        Thunderstorm: Slight or moderate
        if (weatherCode == 0 || weatherCode == 1) {
            return { label: "Clear", icon: "fas fa-sun" };
        }
        if (weatherCode == 2) {
            return { label: "Partly Cloudy", icon: "fas fa-cloud-sun" };
        }
        if (weatherCode == 3) {
            return { label: "Overcast", icon: "fas fa-cloud" };
        }
        if (weatherCode == 45 || weatherCode == 48) {
            return { label: "Fog", icon: "fas fa-cloud-fog" };
        }
        if (weatherCode >= 51 && weatherCode <= 57) {
            return { label: "Drizzle", icon: "fas fa-cloud-rain" };
        }
        if (weatherCode == 61) {
            return { label: "Light Rain", icon: "fas fa-cloud-rain" };
        }
        if (weatherCode == 63) {
            return { label: "Rain", icon: "fas fa-cloud-showers-heavy" };
        }
        if (weatherCode == 65) {
            return { label: "Heavy Rain", icon: "fas fa-cloud-showers-heavy" };
        }
        if (weatherCode == 71 || weatherCode == 85) {
            return { label: "Snow", icon: "fas fa-snowflake" };
        }
        if (weatherCode == 73 || weatherCode == 77 || weatherCode == 86) {
            return { label: "Heavy Snow", icon: "fas fa-snowflake" };
        }
        if (weatherCode == 75) {
            return { label: "Blizzard", icon: "fas fa-snowflake" };
        }
        if (weatherCode == 80) {
            return { label: "Light Rain Showers", icon: "fas fa-cloud-rain" };
        }
        if (weatherCode == 81) {
            return { label: "Rain Showers", icon: "fas fa-cloud-showers-heavy" };
        }
        if (weatherCode == 82) {
            return { label: "Heavy Rain Showers", icon: "fas fa-cloud-showers-heavy" };
        }
        if (weatherCode == 95) {
            return { label: "Thunder Storm", icon: "fas fa-bolt" };
        }
    }

    validateDate(gregorianDate, year) {
        const currentDate = new Date();

        const currentYear = currentDate.getFullYear();
        if (year > currentYear) {
            ui.notifications.error(`Future year of ${year} being used to generate weather.`);
            return false;
        }

        if (year < 1940) { //Open Mateo only has data back to 1940
            ui.notifications.error(`The year ${year} is too old to be used to generate weather.`);
            return false;
        }

        if (year == currentYear) {
            const currentMonth = currentDate.getMonth() + 1;
            if (gregorianDate.month > currentMonth) {
                ui.notifications.error(`Future month of ${gregorianDate.month} being used to generate weather.`);
                return false;
            }
            if (gregorianDate.month < currentDate.getMonth()) {
                return true;
            }

            const currentDay = currentDate.getDate();
            if (gregorianDate.day > currentDay) {
                ui.notifications.error(`Future day of ${gregorianDate.day} being used to generate weather.`);
                return false;
            }

            return true;
        }

        return true;
    }

    async generate(date, previousWeather = null) {
        const calendarConfig = CONFIG.time.worldCalendarConfig;
        const gregorianDate = this.getGregorianDate(date, calendarConfig);

        let latitude = 0;
        let longitude = 0;
        let year = 2000;

        const historicalLocations = game.settings.get(MODULE_NAME, "historicalLocations");
        const locId = game.settings.get(MODULE_NAME, "historicalLocationId");
        const location = historicalLocations.find(h => h.id == locId);
        if (location) {
            latitude = location.latitude;
            longitude = location.longitude;
            year = location.year;
        }

        if (!this.validateDate(gregorianDate, year)) {
            //Invalid date. Abort
            return;
        }

        //Open Meteo requires a date format of YYYY-MM-DD so we need to add leading zeroes if necessary
        const month = (gregorianDate.month).toString().padStart(2, '0');
        const day = (gregorianDate.day).toString().padStart(2, '0');

        const queryDate = `${year}-${month}-${day}`

        var params = {
            latitude: latitude,
            longitude: longitude,
            start_date: queryDate,
            end_date: queryDate,
            daily: ["weather_code", "temperature_2m_max", "temperature_2m_min"],
            temperature_unit: "fahrenheit", //We always use fahrenheit since we do the Celsius conversion elsewhere
        };

        const url = new URL(openMeteoURL);
        url.search = new URLSearchParams(params).toString();

        try {
            let response = await foundry.utils.fetchWithTimeout(url);
            const result = (await response.json()).daily;
            const weatherDef = this.getWeatherDef(result.weather_code[0]);
            return {
                cell: 0,
                icon: weatherDef.icon,
                label: weatherDef.label,
                type: "none",
                temp: result.temperature_2m_max[0],
                tempLow: result.temperature_2m_min[0],
                date
            };
        } catch (error) {
            ui.notifications.error(error);
        }
    }

    getGregorianDate(date, calendarConfig) {
        if (calendarConfig.seasons?.values?.length > 0) {
            const season = this.getWeatherSeason(date, calendarConfig);
            const index = calendarConfig.seasons.values.findIndex(s => game.i18n.localize(s.name).includes(season.name));

            //Not bothering with leap day calculation for real world dates
            const GREG_SEASONS = [
                { dayStart: 79, dayEnd: 171 }, //Spring, Mar 20 - Jun 20
                { dayStart: 172, dayEnd: 264 }, //Summer, Jun 21 - Sept 21
                { dayStart: 265, dayEnd: 354 }, //Autumn, Sept 22 - Dec 20
                { dayStart: 355, dayEnd: 78, totalDays: 88 }, //Winter, Dec 21 - Mar 19
            ];

            const gregSeasonIdx = Math.floor(4 * (index / calendarConfig.seasons.values.length));
            const gregSeason = GREG_SEASONS[gregSeasonIdx];
            if (gregSeasonIdx == 3) { //Special handling of the year boundary
                let targetDay = Math.round(gregSeason.dayStart + (gregSeason.totalDays * season.seasonProgress));
                targetDay = targetDay > 365 ? targetDay - 365 : targetDay;
                return this.gregorianDayOfYearToMonthDay(targetDay);
            } else {
                const targetDay = Math.round(gregSeason.dayStart + ((gregSeason.dayEnd - gregSeason.dayStart) * season.seasonProgress));
                return this.gregorianDayOfYearToMonthDay(targetDay);
            }
        } else {
            //Our calendar does not have seasons. We'll use the day of the year instead
            const calendar = game.time.calendar;
            const isLeap = calendar.isLeapYear(date.year);

            let dayOfYear = date.day + 1;
            for (let i = 0; i < date.month; i++) {
                const m = calendar.months.values[i];
                dayOfYear += (isLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
            }

            let daysInYear = 0;
            for (const m of calendar.months.values) {
                daysInYear += (isLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
            }

            const targetDay = Math.round(365 * (dayOfYear / daysInYear));
            return this.gregorianDayOfYearToMonthDay(targetDay);
        }
    }

    gregorianDayOfYearToMonthDay(dayOfYear) {
        const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        let month = 1;
        let remainingDays = dayOfYear;

        for (const daysInMonth of daysInMonths) {
          if (remainingDays <= daysInMonth) {
            return { month, day: remainingDays };
          }
          remainingDays -= daysInMonth;
          month++;
        }

        console.error("dayOfYear must be between 1 and 365");
      }
}