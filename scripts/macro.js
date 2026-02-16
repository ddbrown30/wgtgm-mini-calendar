// --- CONFIGURATION ---
const Temp = 75;         // Set the temperature
const Weather = "blizzard";  // Set the weather ID (see list below)

/* VALID WEATHER TYPES:
 * none           - Clear / Sunny
 * partlyCloudy   - Scattered Clouds
 * clouds         - Overcast
 * lightRain      - Light Rain
 * rain           - Rain
 * heavyRain      - Heavy Rain
 * rainStorm      - Storm
 * fog            - Fog
 * snow           - Snow
 * blizzard       - Blizzard
 * leaves         - Windy / Autumn Leaves
 * sandstorm      - Sandstorm
 */

(async () => {
    const MODULE_NAME = "wgtgm-mini-calendar";
    const JOURNAL_NAME = "Calendar Events - Mini Calendar";
    const PAGE_NAME = "Weather History";

    const calendar = game.time.calendar;
    const comps = calendar.timeToComponents(game.time.worldTime);
    const key = `${comps.year}-${comps.month}-${comps.dayOfMonth}`;

    const weatherMap = {
        "none": { label: "Clear", icon: "fas fa-sun" },
        "partlyCloudy": { label: "Scattered Clouds", icon: "fas fa-cloud-sun" },
        "clouds": { label: "Overcast", icon: "fas fa-cloud" },
        "lightRain": { label: "Light Rain", icon: "fas fa-cloud-rain" },
        "rain": { label: "Rain", icon: "fas fa-cloud-showers-heavy" },
        "heavyRain": { label: "Heavy Rain", icon: "fas fa-cloud-showers-heavy" },
        "rainStorm": { label: "Storm", icon: "fas fa-bolt" },
        "fog": { label: "Fog", icon: "fas fa-smog" },
        "snow": { label: "Snow", icon: "fas fa-snowflake" },
        "blizzard": { label: "Blizzard", icon: "fas fa-fa-snow-blowing" },
        "leaves": { label: "Windy", icon: "fas fa-wind" },
        "sandstorm": { label: "Sandstorm", icon: "fas fa-wind" },
        "hail": { label: "Hail", icon: "fas fa-cloud-hail" }
    };

    const info = weatherMap[Weather] || weatherMap["none"];

    const journal = game.journal.getName(JOURNAL_NAME);
    const page = journal?.pages.getName(PAGE_NAME);

    if (!page) return ui.notifications.error("Weather History page not found. Initialize weather first.");

    const history = foundry.utils.deepClone(page.flags[MODULE_NAME]?.history || {});

    history[key] = {
        ...history[key],
        type: Weather,
        temp: Temp,
        label: info.label,
        icon: info.icon,
        date: { year: comps.year, month: comps.month, day: comps.dayOfMonth }
    };

    await page.update({ [`flags.${MODULE_NAME}.history`]: history });

    if (canvas.scene) {
        const weatherId = Weather === "none" ? "" : Weather;
        await canvas.scene.update({ weather: weatherId });
    }

    if (game.wgtngmMiniCalender?.rendered) {
        game.wgtngmMiniCalender.render();
    }

    ui.notifications.info(`Set today's weather to ${info.label} (${Temp}°).`);
})();