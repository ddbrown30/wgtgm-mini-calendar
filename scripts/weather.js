import { MODULE_NAME } from "./settings.js";
import { calendarJournal, renderHelper } from "./helper.js";
import { WEATHER_PLAYLIST_NAME, formatTrackName } from "./playlist-importer.js";
import { HailWeatherEffect } from './hail.js';
import { AuroraShader } from './aurora.js';
import { AuroraSolidShader } from './aurora-solid.js';
import { HeatWaveShader } from './heatwave.js';
export const weatherEffects = {
    lightWind: {
        id: "lightWind",
        label: "Light Wind",
        filter: { enabled: false },
        effects: [
            {
                id: "windHaze",
                effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
                shaderClass: HeatWaveShader,
                blendMode: PIXI.BLEND_MODES.ADD,
                config: {
                    opacity: 0.5,
                    slope: 0.9,
                    intensity: 0.6,
                    speed: 0.2,
                    scale: 1.0,
                    tint: [0.1, 0.2, 0.3],
                    offset: 0.0
                }
            },
        ]
    },
    heatWave: {
        id: "heatWave",
        label: "Heat Wave",
        filter: { enabled: false },
        effects: [
            {
                id: "heatHaze",
                effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
                shaderClass: HeatWaveShader,
                blendMode: PIXI.BLEND_MODES.ADD,
                config: {
                    opacity: 0.2,
                    slope: 0.4,
                    intensity: 0.2,
                    speed: 0.2,
                    scale: 1.0,
                    tint: [1.0, 0.8, 0.6],
                    offset: 0.0
                }
            },
            {
                id: "heatShimmer",
                effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
                shaderClass: HeatWaveShader,
                blendMode: PIXI.BLEND_MODES.SCREEN,
                config: {
                    opacity: 0.15,
                    slope: 0.6,
                    intensity: 0.3,
                    speed: 0.4,
                    scale: 2.0,
                    tint: [0.5, 0.5, 0.1],
                    offset: 10.0
                }
            },
            {
                id: "heatPulse",
                effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
                shaderClass: HeatWaveShader,
                blendMode: PIXI.BLEND_MODES.SCREEN,
                config: {
                    opacity: 0.1,
                    slope: 0.9,
                    intensity: 0.2,
                    speed: 0.1,
                    scale: 0.5,
                    tint: [0.1, 0.2, 1.0],
                    offset: 50.0
                }
            }
        ]
    },
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
        {
            id: "fogShader",
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
            config: { opacity: 0.45, tint: [0.8, 0.9, 1.0], intensity: 0.5, strength: 0.5, rotation: 0.2618, speed: 0.15 }
        }, {
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
    aurora: {
        id: "aurora",
        label: "Aurora",
        filter: { enabled: false },
        effects: [
        //     {
        //     id: "auroraGreen",
        //     effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
        //     shaderClass: AuroraShader,
        //     blendMode: PIXI.BLEND_MODES.OVERLAY,
        //     config: {
        //         opacity: 0.3,
        //         slope: 0.9,
        //         intensity: 0.3,
        //         speed: 0.075,
        //         scale: 3,
        //         tint: [0.1, 1.0, 0.4],
        //         offset: 125.0
        //     }
        // }, 
        //     {
        //     id: "auroraPurple",
        //     effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
        //     shaderClass: AuroraShader,
        //     blendMode: PIXI.BLEND_MODES.OVERLAY,
        //     config: {
        //         opacity: 0.4,
        //         slope: 1,
        //         intensity: 0.4,
        //         speed: 0.1,
        //         rotation: 2.356,
        //         scale: 5.5,
        //         tint: [0.6, 0.0, 1.0],
        //         offset: 33.0
        //     }
        // },

        {
            id: "auroraBase",
            effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
            shaderClass: AuroraSolidShader,
            blendMode: PIXI.BLEND_MODES.OVERLAY,
            config: {
                intensity: 0.5,
                rotation: 0.85,
                slope: 10.0,
                speed: 0.2,
                scale: 5.0,  // Lower scale for broader curtains
                opacity: 0.7,
                offset: 66.0,
                color1: [0.7, 0.2, 1.0],
                color2: [0.1, 1.0, 0.4]
            }
        },
        {
            id: "auroraBased",
            effectClass: foundry.canvas.rendering.shaders.WeatherShaderEffect,
            shaderClass: AuroraSolidShader,
            blendMode: PIXI.BLEND_MODES.OVERLAY,
            config: {
                intensity: 0.75,
                rotation: 0.785,
                slope: 5.0,
                speed: 0.3,
                scale: 7.0,  // Lower scale for broader curtains
                opacity: 0.7,
                offset: 0.0,
            }
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
        }, {
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
    static _soundQueue = Promise.resolve();

    static DEFAULT_HEX_MAP = {
        0: { type: "clouds", label: "Overcast", icon: "fas fa-cloud", neighbors: [1, 2, 3, 4, 5, 6] },
        1: { type: "partlyCloudy", label: "Mostly Cloudy", icon: "fas fa-cloud-sun", neighbors: [7, 8, 2, 0, 6, 18] },
        2: { type: "partlyCloudy", label: "Partly Cloudy", icon: "fas fa-cloud-sun", neighbors: [8, 9, 10, 3, 0, 1] },
        3: { type: "lightRain", label: "Drizzle", icon: "fas fa-cloud-rain", neighbors: [0, 2, 10, 11, 12, 4] },
        4: { type: "lightRain", label: "Light Rain", icon: "fas fa-cloud-rain", neighbors: [0, 3, 12, 13, 14, 5] },
        5: { type: "fog", label: "Fog", icon: "fas fa-smog", neighbors: [6, 0, 4, 14, 15, 16] },
        6: { type: "none", label: "Fair", icon: "fas fa-sun", neighbors: [18, 1, 0, 5, 16, 17] },
        7: { type: "none", label: "Clear", icon: "fas fa-sun", neighbors: [7, 7, 8, 1, 18, 7] },
        8: { type: "none", label: "Clear", icon: "fas fa-sun", neighbors: [7, 8, 9, 2, 1, 7] },
        9: { type: "none", label: "Hot/Bright", icon: "fas fa-sun", neighbors: [8, 9, 10, 10, 2, 8] },
        10: { type: "rain", label: "Rain", icon: "fas fa-cloud-showers-heavy", neighbors: [9, 9, 10, 11, 3, 2] },
        11: { type: "heavyRain", label: "Heavy Rain", icon: "fas fa-cloud-showers-heavy", neighbors: [3, 10, 11, 12, 12, 3] },
        12: { type: "rainStorm", label: "Thunderstorm", icon: "fas fa-cloud-bolt", neighbors: [3, 11, 11, 12, 13, 4] },
        13: { type: "heavyRain", label: "Showers Heavy", icon: "fas fa-cloud-showers", neighbors: [4, 12, 12, 13, 14, 14] },
        14: { type: "rain", label: "Showers", icon: "fas fa-cloud-showers-heavy", neighbors: [5, 4, 13, 13, 14, 15] },
        15: { type: "lightWind", label: "Gale Winds", icon: "fas fa-wind", neighbors: [16, 5, 14, 14, 15, 15] },
        16: { type: "partlyCloudy", label: "Windy", icon: "fas fa-wind", neighbors: [17, 6, 5, 15, 15, 16] },
        17: { type: "none", label: "Breezy", icon: "fas fa-wind", neighbors: [18, 18, 6, 16, 16, 17] },
        18: { type: "none", label: "Dry", icon: "fas fa-sun", neighbors: [7, 7, 1, 6, 17, 18] }
    };

    static DESERT_OVERRIDES = {
        0: { type: "heatWave", label: "Haze", icon: "fas fa-sun-haze" },
        1: { type: "heatWave", label: "Haze", icon: "fas fa-sun-haze" },
        2: { type: "lightWind", label: "Light Winds", icon: "fas fa-wind" },
        3: { type: "partlyCloudy", label: "Partly Cloudy", icon: "fas fa-cloud-sun" },
        4: { type: "none", label: "Dry", icon: "fas fa-sun" },
        5: { type: "sandstorm", label: "Dust Storm", icon: "fas fa-smog" },
        6: { type: "heatWave", label: "Heatwave", icon: "fas fa-smog" },
        10: { type: "rain", label: "Rain", icon: "fas fa-cloud-showers-heavy" },
        11: { type: "sandstorm", label: "Sandstorm", icon: "fas fa-wind" },
        12: { type: "none", label: "Dry Storm", icon: "fas fa-bolt" },
        13: { type: "sandstorm", label: "Sandstorm", icon: "fas fa-wind" },
        14: { type: "lightWind", label: "Light Winds", icon: "fas fa-wind" },
        15: { type: "lightWind", label: "Gale Winds", icon: "fas fa-wind" },
        16: { type: "heatWave", label: "Heatwave", icon: "fas fa-sun-haze" },
        17: { type: "lightWind", label: "Light Winds", icon: "fas fa-wind" },
        18: { type: "none", label: "Dry", icon: "fas fa-sun" }
    };


    // UPDATED
    static DEFAULT_BIOMES = {
        "temperate": { tempOffset: 0, seasons: { "Winter": [1, 3, 4, 2, 6, 6], "Spring": [0, 0, 2, 3, 4, 5], "Summer": [0, 2, 5, 5, 6, 6], "Autumn": [0, 2, 3, 3, 4, 6] } },
        "desert": { tempOffset: 35, seasons: { "Winter": [5, 3, 2, 5, 1, 5], "Spring": [0, 0, 0, 3, 4, 5], "Summer": [0, 2, 1, 4, 0, 0], "Autumn": [5, 3, 2, 1, 1, 6] } },
        "polar": { tempOffset: -30, seasons: { "Winter": [3, 4, 5, 2, 3, 3], "Spring": [3, 1, 5, 3, 4, 5], "Summer": [5, 1, 6, 6, 3, 4], "Autumn": [3, 4, 1, 3, 2, 1] } },
        "tropical": { tempOffset: 25, seasons: { "Winter": [0, 1, 5, 2, 6, 3], "Spring": [0, 1, 2, 3, 4, 5], "Summer": [2, 2, 3, 4, 5, 0], "Autumn": [3, 3, 4, 2, 0, 1] } }
    };




    static getHexMap(biomeKey) {
        if (biomeKey === "custom") {
            const customMap = game.settings.get(MODULE_NAME, "customBiomeMap");
            return (!foundry.utils.isEmpty(customMap)) ? customMap : this.DEFAULT_HEX_MAP;
        }
        return this.DEFAULT_HEX_MAP;
    }

    static get BIOMES() {
        const custom = game.settings.get(MODULE_NAME, "customBiomeConfig");
        return (!foundry.utils.isEmpty(custom)) ? foundry.utils.mergeObject(this.DEFAULT_BIOMES, custom) : this.DEFAULT_BIOMES;
    }

    static generate(date, previousWeather = null) {
        const calendarConfig = CONFIG.time.worldCalendarConfig;
        const season = this.getWeatherSeason(date, calendarConfig);
        const biomeKey = game.settings.get(MODULE_NAME, "biome") || "temperate";

        const biomeData = this.BIOMES[biomeKey] || this.BIOMES["temperate"];
        const currentHexMap = this.getHexMap(biomeKey);
        // console.log(currentHexMap);
        // console.log(biomeData);

        let newCellId;
        if (!previousWeather) {
            newCellId = 0;
            if (biomeKey === "desert") newCellId = 7;
        } else {
            const moves = biomeData.seasons[season.name] || biomeData.seasons["Spring"];
            const direction = moves[Math.floor(Math.random() * 6)];

            if (direction === 6) newCellId = previousWeather.cell;
            else {
                const currentHex = currentHexMap[previousWeather.cell];
                if (currentHex) {
                    newCellId = currentHex.neighbors[direction];
                } else {
                    newCellId = previousWeather.cell;
                }
                if (newCellId === undefined) newCellId = previousWeather.cell;
            }
        }

        let weatherDef = currentHexMap[newCellId];

        if (biomeKey === "desert" && this.DESERT_OVERRIDES[newCellId]) {
            weatherDef = { ...weatherDef, ...this.DESERT_OVERRIDES[newCellId] };
        }
        let { type, icon, label } = weatherDef;
        const temp = this.calculateTemp(season, newCellId, biomeData.tempOffset);

        const freezingPoint = 32;
        const isFreezing = temp <= freezingPoint;
        if (isFreezing) {
            if (type === "rain") {
                type = "lightSnow"; icon = "fas fa-snowflake"; label = "Snow";
            }
            else if (type === "lightRain") {
                type = "hail"; icon = "fas fa-cloud-hail"; label = "Hail";;
            }
            else if (type === "heavyRain") {
                type = "snow"; icon = "fas fa-snowflake"; label = "Heavy Snow";
            }
            else if (type === "rainStorm") {
                type = "blizzard"; icon = "fas fa-snow-blowing"; label = "Blizzard";
            }
        }

        const auroraChance = game.settings.get(MODULE_NAME, "auroraChance");
        const allAurora = game.settings.get(MODULE_NAME, "allAurora");
        const aChance = auroraChance ? auroraChance : 0.25;

        if (type === "none" && (biomeKey === "polar" || season.name === "Winter" || allAurora)) {
            if (Math.random() < aChance || aChance === 1) {
                type = "aurora"; icon = "fas fa-moon-over-sun"; label = "Aurora";
            }
        }


        const baseCellDef = currentHexMap[newCellId];

        const getVariant = () => {
            if (!baseCellDef || !baseCellDef.neighbors) return { type, label, icon };
            const randIdx = Math.floor(Math.random() * baseCellDef.neighbors.length);
            const neighborId = baseCellDef.neighbors[randIdx];
            const neighborDef = currentHexMap[neighborId] || baseCellDef;
            return { type: neighborDef.type, label: neighborDef.label, icon: neighborDef.icon };
        };

        const middayVar = getVariant();
        const eveningVar = getVariant();

        const variations = {
            midday: middayVar,
            evening: eveningVar
        };
        // ---------------------------





        return { cell: newCellId, icon, label, type, temp, date, variations };
    }

    static calculateTemp(season, cellId, biomeOffset = 0) {
        const base = 50;
        const variance = Math.floor(Math.random() * 10) - 5;
        let weatherOffset = 0;

        if ([7, 8, 9, 18].includes(cellId)) weatherOffset = 20;   // Sunny/Dry
        if ([1, 2, 6].includes(cellId)) weatherOffset = 10;    // Fair
        if ([0].includes(cellId)) weatherOffset = 0;    // Neutral
        if ([3, 4, 5, 15, 16, 17].includes(cellId)) weatherOffset = -7; // Wet/Windy
        if ([10, 11, 12, 13, 14].includes(cellId)) weatherOffset = -14; // Stormy

        return base + (season.tempOffset || 0) + biomeOffset + weatherOffset + variance;
    }



    static getWeatherSeason(date, config) {
        const ordinal = date.ordinal;

        if (config.weather?.values?.length > 0) {
            return config.weather.values.find(s => {
                if (s.monthStart <= s.monthEnd) {
                    return ordinal >= s.monthStart && ordinal <= s.monthEnd;
                } else {
                    return ordinal >= s.monthStart || ordinal <= s.monthEnd;
                }
            }) || { name: "Spring", tempOffset: 0 };
        }

        if (config.seasons?.values?.length > 0) {
            let currentSeason = null;

            const isDayBased = config.seasons.values.some(s => s.dayStart !== null && s.dayStart !== undefined);

            if (isDayBased) {
                const calendar = game.time.calendar;
                let dayOfYear = date.day + 1;

                for (let i = 0; i < date.month; i++) {
                    const m = calendar.months.values[i];
                    const isLeap = calendar.isLeapYear(date.year);
                    dayOfYear += (isLeap && m.leapDays !== undefined) ? m.leapDays : m.days;
                }
                currentSeason = config.seasons.values.find(s => {
                    if (s.dayStart == null || s.dayEnd == null) return false;

                    if (s.dayStart <= s.dayEnd) {
                        return dayOfYear >= s.dayStart && dayOfYear <= s.dayEnd;
                    } else {
                        return dayOfYear >= s.dayStart || dayOfYear <= s.dayEnd;
                    }
                });

            } else {
                currentSeason = config.seasons.values.find(s => {
                    if (s.monthStart == null || s.monthEnd == null) return false; // Skip invalid configs

                    if (s.monthStart <= s.monthEnd) {
                        return ordinal >= s.monthStart && ordinal <= s.monthEnd;
                    } else {
                        return ordinal >= s.monthStart || ordinal <= s.monthEnd;
                    }
                });
            }

            if (currentSeason) {
                const name = currentSeason.name.toLowerCase();
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


    static async getForecastPage() {
        if (this._forecastPageLock) {
            await this._forecastPageLock;
        }

        // Double-check after lock
        const journalName = calendarJournal;
        let journal = game.journal.getName(journalName);

        let promiseResolver;
        this._forecastPageLock = new Promise(resolve => promiseResolver = resolve);

        try {
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
        } finally {
            if (promiseResolver) promiseResolver();
            this._forecastPageLock = null;
        }
    }


    static async playWeatherSound(type) {
        if (!game.settings.get(MODULE_NAME, "enableWeatherSound")) return;

        this._soundQueue = this._soundQueue.then(async () => {
            const playlist = game.playlists.contents.find(
                p => p.getFlag(MODULE_NAME, "isWeatherPlaylist") === true || p.name === WEATHER_PLAYLIST_NAME
            );

            if (!playlist) return;

            if (type === "none" || type === "heatWave" || type === "aurora") {
                await playlist.stopAll();
                return;
            }

            const search = type.toLowerCase();

            const playingSounds = playlist.sounds.contents.filter(s => s.playing);

            const match = playingSounds.find(s => {
                const currentName = s.name.toLowerCase().replace(/\s/g, "");
                return currentName.startsWith(search);
            });

            if (match) {
                if (playingSounds.length > 1) {
                    for (const s of playingSounds) {
                        if (s.id !== match.id) await playlist.stopSound(s);
                    }
                }
                return;
            }

            const candidates = playlist.sounds.contents.filter(s => {
                const name = s.name.toLowerCase().replace(/\s/g, "");
                return name.startsWith(search);
            });

            if (candidates.length === 0) return;

            const sound = candidates[Math.floor(Math.random() * candidates.length)];

            if (!sound.playing) {
                await playlist.stopAll();
                await playlist.playSound(sound);
            }
        }).catch(err => {
            console.error("Mini Calendar | Error playing weather sound:", err);
        });

        return this._soundQueue;
    }

    static async stopWeatherSounds() {
        const playlist = game.playlists.contents.find(
            p => p.getFlag(MODULE_NAME, "isWeatherPlaylist") === true || p.name === WEATHER_PLAYLIST_NAME
        );
        if (playlist && game.user.isGM) await playlist.stopAll();
    }


    static async disableWeatherEffect() {
        if (!canvas.scene || !game.user.isGM) return;
        await canvas.scene.update({ weather: "" });
        await this.playWeatherSound("none");
    }


    static async applyWeatherEffect(type) {
        if (!canvas.scene || !game.user.isGM) return;
        const sceneFlag = canvas.scene.getFlag(MODULE_NAME, "enableWeather");
        const visualsEnabled = game.settings.get(MODULE_NAME, "enableWeatherEffects");
        const sceneDefaultWeather = game.settings.get(MODULE_NAME, "sceneDefaultWeather");

        const isEnabled = sceneFlag !== undefined ? sceneFlag : sceneDefaultWeather;

        if (!isEnabled) {
            await this.playWeatherSound("none");
            return;
        }
        // if (!visualsEnabled || !isEnabled) return;

        let targetWeatherId = "";
        if (visualsEnabled && isEnabled) {
            if (type && type !== "none") {
                if (type === "aurora") {
                    if (this.isNightTime()) {
                        targetWeatherId = CONFIG.weatherEffects[type]?.id || "";
                    } else {
                        targetWeatherId = "";
                    }
                }
                else if (CONFIG.weatherEffects[type]) {
                    targetWeatherId = CONFIG.weatherEffects[type].id;
                }
            }
        }

        if (canvas.scene.weather === targetWeatherId) {
            await this.playWeatherSound(type);
            return;
        }

        await canvas.scene.update({ weather: targetWeatherId });
        await this.playWeatherSound(type);
    }

    static isNightTime() {
        if (game.wgtngmMiniCalender?.constructor?.isNightTime) {
            return game.wgtngmMiniCalender.constructor.isNightTime();
        }
        if (canvas.scene && canvas.scene.environment.darknessLevel > 0.4) {
            return true;
        }
        return false;
    }


    static async refreshWeather() {
        if (game.wgtngmMiniCalender?.hud.rendered) game.wgtngmMiniCalender.hud.updateWeatherIcon();
        if (!game.user.isGM) return;

        const defaultWeatherEnabled = game.settings.get(MODULE_NAME, "enableWeatherEffects");
        const sceneFlag = canvas?.scene?.getFlag(MODULE_NAME, "enableWeather") || false;

        if (sceneFlag === false) {
            await this.playWeatherSound("none");
            return;
        }

        if (!defaultWeatherEnabled) {
            await this.disableWeatherEffect();
            return;
        }

        const currentTimestamp = game.time.worldTime;
        const calendar = game.time.calendar;
        const currentComps = calendar.timeToComponents(currentTimestamp);

        const weather = await this.getWeatherForDate(currentComps.year, currentComps.month, currentComps.dayOfMonth);

        if (weather) {
            let weatherTypeToUse = weather.type;

            if (currentComps.hour >= 12 && currentComps.hour < 18) {
                if (weather.variations?.midday?.type) {
                    weatherTypeToUse = weather.variations.midday.type;
                }
            } else if (currentComps.hour >= 18) {
                if (weather.variations?.evening?.type) {
                    weatherTypeToUse = weather.variations.evening.type;
                }
            }
            await this.applyWeatherEffect(weatherTypeToUse);

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

    static async createForecasts(date) {
        if (!game.user.isGM) return;
        if (!date) return;
        let forecasts = await this.getHistory();
        const calendar = game.time.calendar;

        const getKey = (y, m, d) => `${y}-${m}-${d}`;
        const todayKey = date;
        let lastWeather = this.generate({
            year: date.year,
            month: date.month,
            day: date.day,
        });
        forecasts[date] = lastWeather;


        let cursor = { ...date };
        cursor.day = date.day;

        for (let i = 0; i < 5; i++) {
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
            const cursorCurrentMonth = calendar.months.values[cursor.month];
            const newWeather = this.generate({
                year: cursor.year,
                month: cursor.month,
                day: cursor.day,
            }, lastWeather);
            forecasts[nextKey] = newWeather;
            lastWeather = forecasts[nextKey];
            cursor.day++;

        }
        await this.saveHistory(forecasts);
        this.refreshWeather();
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
        let hasChanged = false;

        if (!lastWeather) {
            lastWeather = this.generate({
                year: currentComps.year,
                month: currentComps.month,
                day: currentComps.dayOfMonth,
                ordinal: calendar.months.values[currentComps.month].ordinal
            });
            forecasts[todayKey] = lastWeather;
            hasChanged = true;
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
                hasChanged = true;
            }
            lastWeather = forecasts[nextKey];
        }

        if (hasChanged) {
            await this.saveHistory(forecasts);
        }

        this.refreshWeather();
        // this.applyWeatherEffect(forecasts[todayKey].type);
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
         * Manually overrides the weather for the current day or a specific date.
         * @param {string} type - The weather ID.
         * @param {number} temp - The temperature.
         * @param {number} dayDelta - (Optional) Days from now (ignored if contextDate is set).
         * @param {object} contextDate - (Optional) {year, month, day} to force specific date.
         */
    static async setWeatherOverride(type, temp, dayDelta = 0, contextDate = null, variations = null) {
        if (!game.user.isGM) {
            ui.notifications.warn("Only the GM can override weather.");
            return;
        }

        let yearLookup, monthLookup, dayLookup;

        if (contextDate) {
            yearLookup = contextDate.year;
            monthLookup = contextDate.month;
            dayLookup = contextDate.day;
        }
        else {
            let delta = parseInt(dayDelta);
            if (isNaN(delta) || delta < 0) delta = 0;

            const calendar = game.time.calendar;
            const comps = calendar.timeToComponents(game.time.worldTime);
            const months = calendar.months.values;

            dayLookup = comps.dayOfMonth + delta;
            monthLookup = comps.month;
            yearLookup = comps.year;

            while (true) {
                const monthData = months[monthLookup];

                let maxDaysInMonth = monthData.days;
                if (calendar.isLeapYear(yearLookup) && monthData.leapDays !== undefined) {
                    maxDaysInMonth = monthData.leapDays;
                }

                if (dayLookup < maxDaysInMonth) {
                    break;
                }

                dayLookup -= maxDaysInMonth;
                monthLookup++;

                if (monthLookup >= months.length) {
                    monthLookup = 0;
                    yearLookup++;
                }
            }
        }

        const key = `${yearLookup}-${monthLookup}-${dayLookup}`;

        const uiMap = {
            "none": { label: "Clear", icon: "fas fa-sun", cell: 7 },
            "partlyCloudy": { label: "Scattered Clouds", icon: "fas fa-cloud-sun", cell: 1 },
            "clouds": { label: "Overcast", icon: "fas fa-cloud", cell: 0 },
            "lightRain": { label: "Light Rain", icon: "fas fa-cloud-rain", cell: 3 },
            "rain": { label: "Rain", icon: "fas fa-cloud-showers-heavy", cell: 10 },
            "heavyRain": { label: "Heavy Rain", icon: "fas fa-cloud-showers-heavy", cell: 11 },
            "rainStorm": { label: "Storm", icon: "fas fa-bolt", cell: 12 },
            "fog": { label: "Fog", icon: "fas fa-smog", cell: 5 },
            "lightSnow": { label: "Snow", icon: "fas fa-snowflake", cell: 4 },
            "snow": { label: "Heavy Snow", icon: "fas fa-snowflake", cell: 11 },
            "blizzard": { label: "Blizzard", icon: "fas fa-snow-blowing", cell: 12 },
            "leaves": { label: "Windy", icon: "fas fa-wind", cell: 16 },
            "sandstorm": { label: "Sandstorm", icon: "fas fa-wind", cell: 13 },
            "hail": { label: "Hail", icon: "fas fa-cloud-hail", cell: 3 },
            "aurora": { label: "Aurora", icon: "fas fa-moon-over-sun", cell: 5 },
            "heatWave": { label: "Heatwave", icon: "fas fa-sun-haze", cell: 1 },
            "lightWind": { label: "Light Wind", icon: "fas fa-wind", cell: 15 }
        };

        const info = uiMap[type] || { label: type, icon: type };

        const finalVariations = {};
        if (variations) {
            if (variations.midday) {
                const mInfo = uiMap[variations.midday] || { label: variations.midday, icon: "" };
                finalVariations.midday = { type: variations.midday, label: mInfo.label, icon: mInfo.icon };
            }
            if (variations.evening) {
                const eInfo = uiMap[variations.evening] || { label: variations.evening, icon: "" };
                finalVariations.evening = { type: variations.evening, label: eInfo.label, icon: eInfo.icon };
            }
        }

        const history = await this.getHistory();

        history[key] = {
            ...history[key],
            type: type,
            temp: temp,
            label: info.label,
            icon: info.icon,
            cell: info.cell || 0,
            date: { year: yearLookup, month: monthLookup, day: dayLookup },
            variations: finalVariations,
            isManual: true
        };
        await this.saveHistory(history);

        const calendar = game.time.calendar;
        const currentComps = calendar.timeToComponents(game.time.worldTime);
        if (currentComps.year === yearLookup && currentComps.month === monthLookup && currentComps.dayOfMonth === dayLookup) {
            await this.refreshWeather();
        }
        renderHelper();
        // if (game.wgtngmMiniCalender?.rendered) {
        //     game.wgtngmMiniCalender.render();
        // }
        // if (game.wgtngmMiniCalender.hud) game.wgtngmMiniCalender.hud.render();


        console.log(`Mini Calendar | Weather overridden for ${dayLookup}/${monthLookup}/${yearLookup} to ${info.label} (${temp}°).`);
    }



}