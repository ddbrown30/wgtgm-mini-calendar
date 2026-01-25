import { MODULE_NAME } from "./settings.js";
import { BiomeConfig } from "./biome-config.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class WeatherConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "wgtgm-weather-config",
        classes: ["wgtngmWeatherConfig"],
        window: {
            icon: 'fas fa-cloud-sun',
            title: "Weather Configuration",
            resizable: false
        },
        position: { width: 440, height: "auto" },
        actions: {
            openBiomeEditor: () => new BiomeConfig().render(true)
        },
        form: { handler: this.#onSubmit, closeOnSubmit: true }
    };

    static PARTS = {
        form: { template: `modules/wgtgm-mini-calendar/templates/weather-config.hbs`, },
        footer: { template: "modules/wgtgm-mini-calendar/templates/weather-config-footer.hbs" },
    };


    async _prepareContext(options) {
        this.useHistoricalData ??= game.settings.get(MODULE_NAME, "useHistoricalData");

        return {
            useHistoricalData: this.useHistoricalData,
            historicalDataLat: game.settings.get(MODULE_NAME, "historicalDataLat"),
            historicalDataLong: game.settings.get(MODULE_NAME, "historicalDataLong"),
            historicalDataYear: game.settings.get(MODULE_NAME, "historicalDataYear"),
            hideWeatherPlayer: game.settings.get(MODULE_NAME, "hideWeatherPlayer"),
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

    _onRender(context, options) {
        //Add the listener to the engine dropdown
        const weatherEngineSelector = this.element.querySelector('select[name="weatherEngine"]');
        weatherEngineSelector.addEventListener("change", async event => {
            const selection = $(event.target).find("option:selected");
            this.useHistoricalData = selection[0].value == "historical";
            this.render(true);
        });
    }

    static async #onSubmit(event, form, formData) {
        await game.settings.set(MODULE_NAME, "hideWeatherPlayer", formData.object.hideWeatherPlayer);
        await game.settings.set(MODULE_NAME, "broadcastWeather", formData.object.broadcastWeather);
        await game.settings.set(MODULE_NAME, "useCelsius", formData.object.useCelsius);
        await game.settings.set(MODULE_NAME, "enableWeatherEffects", formData.object.enableWeatherEffects);
        await game.settings.set(MODULE_NAME, "enableWeatherSound", formData.object.enableWeatherSound);
        await game.settings.set(MODULE_NAME, "enableWeatherForecast", formData.object.enableWeatherForecast);

        const oldUseHistorical = game.settings.get(MODULE_NAME, "useHistoricalData");
        await game.settings.set(MODULE_NAME, "useHistoricalData", this.useHistoricalData);
        if (this.useHistoricalData) {
            await game.settings.set(MODULE_NAME, "historicalDataLat", formData.object.historicalDataLat);
            await game.settings.set(MODULE_NAME, "historicalDataLong", formData.object.historicalDataLong);
            await game.settings.set(MODULE_NAME, "historicalDataYear", formData.object.historicalDataYear);
        } else {
            await game.settings.set(MODULE_NAME, "biome", formData.object.biome);
            await game.settings.set(MODULE_NAME, "allAurora", formData.object.allAurora);
            await game.settings.set(MODULE_NAME, "auroraChance", formData.object.auroraChance);
        }

        ui.notifications.info("Weather Settings Saved.");

        if (oldUseHistorical != this.useHistoricalData) {
            const reload = await foundry.applications.api.DialogV2.confirm({
                window: { title: "SETTINGS.ReloadPromptTitle" },
                position: { width: 400 },
                content: `<p>${game.i18n.localize("SETTINGS.ReloadPromptBody")}</p>`,
            });

            if (reload) {
                game.socket.emit("reload");
                foundry.utils.debouncedReload();
                return;
            }
        }

        if (game.wgtngmMiniCalender.calendarInstance && game.wgtngmMiniCalender.calendarInstance.rendered) {
            game.wgtngmMiniCalender.calendarInstance.render();
            return;
        }
    }
}

