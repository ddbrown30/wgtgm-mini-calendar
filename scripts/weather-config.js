import { MODULE_NAME } from "./settings.js";
import { BiomeConfig } from "./biome-config.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class WeatherConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "wgtgm-weather-config",
        classes: ["wgtngmWeatherConfig"],
        title: "Weather Configuration",
        window: { resizable: false },
        position: { width: 400, height: "auto" },
        actions:{
            openBiomeEditor: () => new BiomeConfig().render(true)
        },
        form: { handler: this.#onSubmit, closeOnSubmit: true }
    };

    static PARTS = {
        form: {
            template: `modules/wgtgm-mini-calendar/templates/weather-config.hbs`,

        },            footer: { template: "modules/wgtgm-mini-calendar/templates/weather-config-footer.hbs" },

    };


    async _prepareContext(options) {
        return {
            broadcastWeather: game.settings.get(MODULE_NAME, "broadcastWeather"),
            biome: game.settings.get(MODULE_NAME, "biome"),
            auroraChance: game.settings.get(MODULE_NAME, "auroraChance"),
            allAurora: game.settings.get(MODULE_NAME, "allAurora"),
            useCelsius: game.settings.get(MODULE_NAME, "useCelsius"),
            enableWeatherEffects: game.settings.get(MODULE_NAME, "enableWeatherEffects"),
            enableWeatherSound: game.settings.get(MODULE_NAME, "enableWeatherSound"),
            enableWeatherForecast: game.settings.get(MODULE_NAME, "enableWeatherForecast"),
            biomes: {
                "temperate": "Temperate (Standard)",
                "desert": "Desert (Hot/Dry)",
                "polar": "Polar (Cold/Snow)",
                "tropical": "Tropical (Hot/Wet)",
                "custom": "Custom"
            }
        };
    }

    static async #onSubmit(event, form, formData) {
        await game.settings.set(MODULE_NAME, "broadcastWeather", formData.object.broadcastWeather);
        await game.settings.set(MODULE_NAME, "biome", formData.object.biome);
        await game.settings.set(MODULE_NAME, "auroraChance", formData.object.auroraChance);
        await game.settings.set(MODULE_NAME, "allAurora", formData.object.allAurora);
        await game.settings.set(MODULE_NAME, "useCelsius", formData.object.useCelsius);
        await game.settings.set(MODULE_NAME, "enableWeatherEffects", formData.object.enableWeatherEffects);
        await game.settings.set(MODULE_NAME, "enableWeatherSound", formData.object.enableWeatherSound);
        await game.settings.set(MODULE_NAME, "enableWeatherForecast", formData.object.enableWeatherForecast);
        ui.notifications.info("Weather Settings Saved.");
        if (game.wgtngmMiniCalender.calendarInstance && game.wgtngmMiniCalender.calendarInstance.rendered) {
            game.wgtngmMiniCalender.calendarInstance.render();
        return;
    }
    }
}

