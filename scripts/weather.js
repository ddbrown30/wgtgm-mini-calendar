import { MODULE_NAME } from "./settings.js";
import { calendarJournal } from "./helper.js"; 
import { WEATHER_PLAYLIST_NAME, formatTrackName } from "./playlist-importer.js";
import {HailWeatherEffect} from './hail.js'
export const weatherEffects = {
lightSnow: {
    id: "lightSnow",
    label: "Light Snow",
    filter: {
      enabled: false
    },
    effects: [{
      id: "snowShader",
      effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
      shaderClass: foundry.canvas.rendering.shaders.SnowShader,
      blendMode: PIXI.BLEND_MODES.SCREEN,
      config: {
        tint: [0.85, 0.95, 1],
        direction: 0.0,
        speed: 1,
        scale: 10
      }
    },
{
      id: "fogShader",
      effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
      shaderClass: foundry.canvas.rendering.shaders.FogShader,
      blendMode: PIXI.BLEND_MODES.SCREEN,
      config: { opacity: 0.2, slope: 0.2, intensity: 0.25, speed: 0.2, scale: 3.0 }
    }]
  },
hail: {
    id: "hail",
    label: "Hail",
    filter: { enabled: false },
    effects: [{
      id: "fogShader",
      effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
      shaderClass: foundry.canvas.rendering.shaders.FogShader,
      blendMode: PIXI.BLEND_MODES.SCREEN,
      performanceLevel: 2,
      config: {
        slope: 1.5,
        intensity: 0.050,
        speed: 5,
        scale: 25
      }
    },{
      id: "hailShader",
      effectClass: HailWeatherEffect,
      blendMode: PIXI.BLEND_MODES.SCREEN,
      performanceLevel: 2,
    },
{
      id: "fogShader",
      effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
      shaderClass: foundry.canvas.rendering.shaders.FogShader,
      blendMode: PIXI.BLEND_MODES.SCREEN,
      performanceLevel: 2,
      config: {
        slope: 0.5,
        intensity: 0.25,
        speed: -1,
        scale: 2
      }
    }]
},
heavyRain: {
    id: "heavyRain",
    label: "Heavy Rain",
    filter: { enabled: false },
    effects: [{
      id: "fogShader",
      effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
      shaderClass: foundry.canvas.rendering.shaders.FogShader,
      blendMode: PIXI.BLEND_MODES.SCREEN,
      performanceLevel: 2,
      config: {
        slope: 0.5,
        intensity: 0.25,
        speed: -1,
        scale: 2
      }
    },
{      id: "fogShader",
      effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
      shaderClass: foundry.canvas.rendering.shaders.FogShader,
      blendMode: PIXI.BLEND_MODES.SCREEN,
      performanceLevel: 2,
      config: {
        slope: 1.5,
        intensity: 0.050,
        speed: 1,
        scale: 25
      }
    },
    {
      id: "rainShader",
      effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
      shaderClass: foundry.canvas.rendering.shaders.RainShader,
      blendMode: PIXI.BLEND_MODES.SCREEN,
      config: {
        opacity: 0.45,
        tint: [0.7, 0.9, 1.0],
        intensity: 1.5,
        strength: 1.5,
        rotation: 0.5236,
        speed: 0.20
      }
    }]
  },
lightRain: {
    id: "lightRain",
    label: "Light Rain",
    filter: { enabled: false },
    effects: [{
      id: "rainShader",
      effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
      shaderClass: foundry.canvas.rendering.shaders.RainShader,
      blendMode: PIXI.BLEND_MODES.SCREEN,
      config: { opacity: 0.35, tint: [0.8, 0.9, 1.0], intensity: 0.4, strength: 0.5, rotation: 0.2618, speed: 0.15 }
    },{
      id: "fogShader",
      effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
      shaderClass: foundry.canvas.rendering.shaders.FogShader,
      blendMode: PIXI.BLEND_MODES.SCREEN,
      performanceLevel: 2,
      config: {
        slope: 1.5,
        intensity: 0.050,
        speed: 2,
        scale: 50
      }
    },]
  },
  clouds: {
    id: "clouds",
    label: "Clouds",
    filter: { enabled: false },
    effects: [{
      id: "fogShader",
      effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
      shaderClass: foundry.canvas.rendering.shaders.FogShader,
      blendMode: PIXI.BLEND_MODES.SCREEN,
      config: { opacity: 0.2, slope: 0.2, intensity: 0.25, speed: 0.2, scale: 3.0 }
    }]  
  },
  partlyCloudy: {
    id: "partlyCloudy",
    label: "Partly Cloudy",
    filter: { enabled: false },
    effects: [{
      id: "fogShader",
      effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
      shaderClass: foundry.canvas.rendering.shaders.FogShader,
      blendMode: PIXI.BLEND_MODES.SCREEN,
      config: { opacity: 0.2, slope: 0.8, intensity: 0.2, speed: 0.1, scale: 1.5 }
    }]
  },
  sandstorm: {
    id: "sandstorm",
    label: "Sandstorm",
    filter: { enabled: false },
    effects: [{
      id: "fogShader",
      effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
      shaderClass: foundry.canvas.rendering.shaders.FogShader,
      blendMode: PIXI.BLEND_MODES.NORMAL, 
      config: { 
        opacity: 0.15,
          slope: 0.8, 
          intensity: 0.5, 
          speed: -2.5, 
          scale: 2.0,
          tint: [0.8, 0.6, 0.3] 
      }
    },{
      id: "snowShader",
      effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
      shaderClass: foundry.canvas.rendering.shaders.SnowShader,
      blendMode: PIXI.BLEND_MODES.SCREEN,
      config: {
        tint: [0.8, 0.6, 0.3],
        direction: 2.5,
        speed: 5,
        scale: 7.5
      }
    },]
  }
};

export class WeatherEngine {
    static HEX_MAP = {
        0:  { type: "none",      label: "Clear",             icon: "fas fa-sun",                 neighbors: [0, 0, 2, 1, 1, 0] },
        1:  { type: "partlyCloudy",    label: "Scattered Clouds",  icon: "fas fa-cloud-sun",           neighbors: [0, 2, 4, 3, 3, 0] },
        2:  { type: "none",      label: "Fair",              icon: "fas fa-sun",                 neighbors: [0, 2, 4, 4, 1, 0] },
        3:  { type: "lightRain", label: "Light Rain",        icon: "fas fa-cloud-rain",          neighbors: [1, 4, 6, 5, 5, 1] },
        4:  { type: "clouds",    label: "Overcast",          icon: "fas fa-cloud",               neighbors: [1, 2, 2, 6, 3, 1] },
        5:  { type: "rainStorm", label: "Storm",             icon: "fas fa-bolt",                neighbors: [3, 6, 6, 5, 5, 3] },
        6:  { type: "heavyRain",      label: "Heavy Rain",        icon: "fas fa-cloud-showers-heavy", neighbors: [3, 4, 4, 6, 5, 3] }
    };

    // Biome Configurations
    // Directions: 0=N, 1=NE, 2=SE, 3=S, 4=SW, 5=NW, 6=Stay
    // Concept: N/NE = Drier/Sunnier, S/SW = Wetter/Stormier
    static BIOMES = {
        "temperate": {
            tempOffset: 0,
            seasons: {
                "Winter": [3, 3, 4, 2, 6, 6],
                "Spring": [0, 1, 2, 3, 4, 5],
                "Summer": [0, 0, 1, 5, 6, 6],
                "Autumn": [2, 2, 3, 3, 4, 6] 
            }
        },
        "desert": {
            tempOffset: 20,
            seasons: {
                "Winter": [0, 0, 6, 6, 2, 1], 
                "Spring": [0, 0, 0, 6, 1, 2],
                "Summer": [0, 0, 0, 0, 0, 6], 
                "Autumn": [0, 0, 6, 6, 2, 1]
            }
        },
        "polar": {
            tempOffset: -30, // It is colder
            seasons: {
                // Strong push South (3,4,5) for Snow/Blizzards
                "Winter": [3, 4, 4, 5, 5, 6], 
                "Spring": [3, 4, 6, 0, 1, 6],
                "Summer": [0, 1, 6, 6, 3, 4], 
                "Autumn": [3, 3, 4, 5, 6, 6]
            }
        },
        "tropical": {
            tempOffset: 15,
            seasons: {
                // Wet season vs Dry season instead of Winter/Summer?
                // For now, we map Summer -> Wet, Winter -> Dry-ish
                "Winter": [0, 1, 2, 6, 6, 6], // Drier
                "Spring": [2, 3, 4, 6, 6, 6], 
                "Summer": [3, 4, 5, 5, 6, 6], // Storms!
                "Autumn": [3, 4, 2, 2, 6, 6]
            }
        }
    };

    static generate(date, previousWeather = null) {
        const calendarConfig = CONFIG.time.worldCalendarConfig;
        const season = this.getWeatherSeason(date, calendarConfig);
        const biomeKey = game.settings.get(MODULE_NAME, "biome") || "temperate";
        const biomeData = this.BIOMES[biomeKey] || this.BIOMES["temperate"];
        // console.log(season);
        let newCellId;

        if (!previousWeather) {
            newCellId = 4; 
            if (biomeKey === "desert") newCellId = 0;
        } else {
            const moves = biomeData.seasons[season.name] || biomeData.seasons["Spring"];
            
            const roll = Math.floor(Math.random() * 6);
            const direction = moves[roll];

            if (direction === 6) {
                newCellId = previousWeather.cell;
            } else {
                const currentHex = this.HEX_MAP[previousWeather.cell];
                newCellId = currentHex.neighbors[direction];
                if (newCellId === undefined) newCellId = previousWeather.cell;
            }
        }

        let weatherDef = this.HEX_MAP[newCellId];
        let label = weatherDef.label;
        let icon = weatherDef.icon;
        let type = weatherDef.type;

        if (season.name === "Winter" || biomeKey === "polar") {
             if (type === "rain") { type = "snow"; icon = "fas fa-snowflake"; label = "Snow"; }
             if (type === "rainStorm") { type = "blizzard"; icon = "fas fa-snow-blowing"; label = "Blizzard"; }
             if (type === "lightRain") { type = "hail"; icon = "fas fa-cloud-hail"; label = "Hail"; }
        }
        
        if (biomeKey === "desert") {
             if (type === "rainStorm" || type === "rain") { 
                 type = "sandstorm"; 
                 icon = "fas fa-wind"; 
                 label = "Sandstorm"; 
             }
             if (type === "lightRain") { 
                 type = "none"; 
                 icon = "fas fa-sun"; 
                 label = "Heat Haze"; 
             }
        }

        return {
            cell: newCellId,
            icon: icon,
            label: label,
            type: type,
            temp: this.calculateTemp(season, newCellId, biomeData.tempOffset), 
            date: date
        };
    }
    
    static getWeatherSeason(date, config) {
        const ordinal = date.ordinal
        if (config.weather?.values?.length > 0) {
            return config.weather.values.find(s => ordinal >= s.monthStart && ordinal <= s.monthEnd) 
                || { name: "Spring", tempOffset: 0 };
        }

        if (config.seasons?.values?.length > 0) {


            const currentSeason = config.seasons.values.find(s => {
                if (s.monthStart <= s.monthEnd) {
                    return ordinal >= s.monthStart && ordinal <= s.monthEnd;
                } else {
                    return ordinal >= s.monthStart || ordinal <= s.monthEnd;
                }
            });

            if (currentSeason) {
                const name = currentSeason.name.toLowerCase();
                // console.log(name);
                if (name.includes("winter")) return { name: "Winter", tempOffset: -10 };
                if (name.includes("spring")) return { name: "Spring", tempOffset: 0 };
                if (name.includes("summer")) return { name: "Summer", tempOffset: 15 };
                if (name.includes("autumn") || name.includes("fall")) return { name: "Autumn", tempOffset: 5 };
            }
        }

        const totalMonths = config.months?.values?.length || 12;
        const monthIndex = date.month; // 0-based
        const seasonLength = totalMonths / 4;
        
        const seasonIndex = Math.floor(monthIndex / seasonLength) % 4;
        
        switch (seasonIndex) {
            case 0: return { name: "Winter", tempOffset: -10 };
            case 1: return { name: "Spring", tempOffset: 0 };
            case 2: return { name: "Summer", tempOffset: 15 };
            case 3: return { name: "Autumn", tempOffset: 5 };
        }
        
        return { name: "Spring", tempOffset: 0 };
    }


    static calculateTemp(season, cellId, biomeOffset = 0) {
        const base = 50; 
        const variance = Math.floor(Math.random() * 10) - 5;
        
        let weatherOffset = 0;
        if (cellId === 0) weatherOffset = 10; // Sunny
        if (cellId === 6) weatherOffset = -5; // Rain
        if (cellId === 5) weatherOffset = -8; // Storm
        
        return base + (season.tempOffset || 0) + biomeOffset + weatherOffset + variance;
    }
    
    static async getForecastPage() {
        const journal = game.journal.getName(calendarJournal);
        if (!journal) return null;

        const pageName = "Weather History"; 
        let page = journal.pages.getName(pageName);

        if (!page) {
            const pageData = {
                name: pageName,
                text: { content: "<h1>Weather History</h1><p>Delete this page to reset weather history.</p>" },
                flags: { [MODULE_NAME]: { history: {} } } 
            };
            [page] = await journal.createEmbeddedDocuments("JournalEntryPage", [pageData]);
        }
        return page;
    }

    static async playWeatherSound(type) {
        if (!game.settings.get(MODULE_NAME, "enableWeatherSound")) return;

        const playlist = game.playlists.contents.find(
            p => p.getFlag(MODULE_NAME, "isWeatherPlaylist") === true || p.name === WEATHER_PLAYLIST_NAME
        );
        
        if (!playlist) return;

        if (type === "none") {
            await playlist.stopAll();
            return;
        }

        const search = type.toLowerCase();

        const currentlyPlaying = playlist.sounds.contents.find(s => s.playing);
        if (currentlyPlaying) {
            const currentName = currentlyPlaying.name.toLowerCase().replace(/\s/g, "");
            if (currentName.startsWith(search)) {
                return; 
            }
        }


        const candidates = playlist.sounds.contents.filter(s => {
            const name = s.name.toLowerCase().replace(/\s/g, "");
            return name.startsWith(search);
        });

        if (candidates.length === 0) {
            return;
        }

        const sound = candidates[Math.floor(Math.random() * candidates.length)];
        
        if (!sound.playing) {
            await playlist.stopAll(); 
            await playlist.playSound(sound);
        }
    }

    static async stopWeatherSounds() {
        const playlist = game.playlists.contents.find(
            p => p.getFlag(MODULE_NAME, "isWeatherPlaylist") === true || p.name === WEATHER_PLAYLIST_NAME
        );
        if (playlist) await playlist.stopAll();
    }


static async applyWeatherEffect(type) {
        if (!canvas.scene) return;
        
        const sceneFlag = canvas.scene.getFlag(MODULE_NAME, "enableWeather");
        const visualsEnabled = game.settings.get(MODULE_NAME, "enableWeatherEffects");
        const isEnabled = sceneFlag !== undefined ? sceneFlag : visualsEnabled;

        let targetWeatherId = "";
        if (visualsEnabled && isEnabled) {
             if (type && type !== "none" && CONFIG.weatherEffects[type]) {
                 targetWeatherId = CONFIG.weatherEffects[type].id;
             }
        }

        if (canvas.scene.weather === targetWeatherId) {
             await this.playWeatherSound(type);
             return;
        }

        await canvas.scene.update({ weather: targetWeatherId });
        await this.playWeatherSound(type);
    }



    /**
     * Refreshes the current weather display based on settings and date.
     * Called by the toggle button and settings changes.
     */
    static async refreshWeather() {
        if (!game.user.isGM) return;
        const sceneFlag = canvas.scene.getFlag(MODULE_NAME, "enableWeather");
        const isEnabled = sceneFlag !== undefined ? sceneFlag : defaultEnabled;

        const enabled = game.settings.get(MODULE_NAME, "enableWeatherEffects");
        
        if (!enabled || !isEnabled) {
             await this.applyWeatherEffect("none");
             return;
        }

        const currentTimestamp = game.time.worldTime;
        const calendar = game.time.calendar;
        const currentComps = calendar.timeToComponents(currentTimestamp);
        
        const weather = await this.getWeatherForDate(currentComps.year, currentComps.month, currentComps.dayOfMonth);
        
        if (weather) {
            await this.applyWeatherEffect(weather.type);
        } else {
            await this.updateForecasts();
        }
    }


    static async getHistory() {
        const page = await this.getForecastPage();
        if (!page) return {};
        return page.flags[MODULE_NAME]?.history || {};
    }

    static async saveHistory(history) {
        const page = await this.getForecastPage();
        if (!page) return;
        
        await page.update({
            [`flags.${MODULE_NAME}.history`]: history
        });
    }
    
    static async updateForecasts() {
        if (!game.user.isGM) return;

        let forecasts = await this.getHistory();
        
        const currentTimestamp = game.time.worldTime;
        const calendar = game.time.calendar;
        
        const currentComps = calendar.timeToComponents(currentTimestamp);
        const getKey = (y, m, d) => `${y}-${m}-${d}`;
        const todayKey = getKey(currentComps.year, currentComps.month, currentComps.dayOfMonth);

        let lastWeather = forecasts[todayKey];
        
        if (!lastWeather) {
            lastWeather = this.generate({ 
                year: currentComps.year, 
                month: currentComps.month, 
                day: currentComps.dayOfMonth,
                ordinal: calendar.months.values[currentComps.month].ordinal
            });
            forecasts[todayKey] = lastWeather;
        }

        let cursor = { ...currentComps };
        cursor.day = cursor.dayOfMonth; 

        for (let i = 0; i < 5; i++) {
            cursor.day++;
            const monthIdx = cursor.month;
            const monthData = calendar.months.values[monthIdx];
            const isLeap = calendar.isLeapYear(cursor.year);
            const maxDays = isLeap && monthData.leapDays !== undefined ? monthData.leapDays : monthData.days;

            if (cursor.day >= maxDays) {
                cursor.day = 0;
                cursor.month++;
                if (cursor.month >= calendar.months.values.length) {
                    cursor.month = 0;
                    cursor.year++;
                }
            }

            const nextKey = getKey(cursor.year, cursor.month, cursor.day);
            
            if (!forecasts[nextKey]) {
                const cursorCurrentMonth = calendar.months.values[cursor.month];
                
                const newWeather = this.generate({ 
                    year: cursor.year, 
                    month: cursor.month, 
                    day: cursor.day,
                    ordinal: cursorCurrentMonth.ordinal
                }, lastWeather); 
                
                forecasts[nextKey] = newWeather;
            }
            lastWeather = forecasts[nextKey];
        }
        await this.saveHistory(forecasts);
        
        this.applyWeatherEffect(forecasts[todayKey].type);
    }    


    static async getWeatherForDate(year, month, day) {
        const page = game.journal.getName(calendarJournal)?.pages.getName("Weather History");
        if (!page) return null;

        const history = page.flags[MODULE_NAME]?.history || {};
        const key = `${year}-${month}-${day}`;
        return history[key] || null;
    }
    static getTempDisplay(tempF) {
        if (game.settings.get(MODULE_NAME, "useCelsius")) {
            return Math.floor((tempF - 32) * 5 / 9) + "°C";
        }
        return tempF + "°F";
    }

/**
     * Manually overrides the weather for the current day.
     * @param {string} type - The weather ID (e.g., "rain", "blizzard", "none").
     * @param {number} temp - The temperature in degrees (Fahrenheit by default).
     */
    static async setWeatherOverride(type, temp) {
        if (!game.user.isGM) {
            ui.notifications.warn("Only the GM can override weather.");
            return;
        }

        const calendar = game.time.calendar;
        const comps = calendar.timeToComponents(game.time.worldTime);
        const key = `${comps.year}-${comps.month}-${comps.dayOfMonth}`;
        
        const uiMap = {
            "none":         { label: "Clear",            icon: "fas fa-sun" },
            "partlyCloudy": { label: "Scattered Clouds", icon: "fas fa-cloud-sun" },
            "clouds":       { label: "Overcast",         icon: "fas fa-cloud" },
            "lightRain":    { label: "Light Rain",       icon: "fas fa-cloud-rain" },
            "rain":         { label: "Rain",             icon: "fas fa-cloud-showers-heavy" },
            "heavyRain":    { label: "Heavy Rain",       icon: "fas fa-cloud-showers-heavy" },
            "rainStorm":    { label: "Storm",            icon: "fas fa-bolt" },
            "fog":          { label: "Fog",              icon: "fas fa-smog" },
            "snow":         { label: "Snow",             icon: "fas fa-snowflake" },
            "blizzard":     { label: "Blizzard",         icon: "fas fa-snow-blowing" },
            "leaves":       { label: "Windy",            icon: "fas fa-wind" },
            "sandstorm":    { label: "Sandstorm",        icon: "fas fa-wind" },
            "hail":         { label: "Hail",             icon: "fas fa-cloud-hail" }
        };

        const info = uiMap[type] || { label: type, icon: "fas fa-question" };

        const history = await this.getHistory();
        
        history[key] = {
            ...history[key], 
            type: type,
            temp: temp,
            label: info.label,
            icon: info.icon,
            date: { year: comps.year, month: comps.month, day: comps.dayOfMonth },
            isManual: true 
        };

        await this.saveHistory(history);
        await this.applyWeatherEffect(type);

        if (game.wgtngmMiniCalender?.calendarInstance?.rendered) {
            game.wgtngmMiniCalender.calendarInstance.render();
        }

        console.log(`Mini Calendar | Weather overridden to ${info.label} (${temp}°).`);
    }



}