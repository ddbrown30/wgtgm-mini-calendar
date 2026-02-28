import { MODULE_NAME } from "./settings.js";
import { BiomeConfig } from "./biome-config.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import { renderHelper } from "./helper.js";
import { WeatherLocationEditor } from "./weather-location-editor.js";

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
        position: { width: 440, height: 600 },
        actions: {
            openBiomeEditor: () => new BiomeConfig().render(true),
            addHistLocation: function (event) { new WeatherLocationEditor(this).render(true); },
            editHistLocation: function (event) { new WeatherLocationEditor(this, this.selectedHistoricalLocation).render(true); },
            deleteHistLocation: async function (event, button) {
                let historicalLocations = game.settings.get(MODULE_NAME, "historicalLocations");
                const index = historicalLocations.findIndex(h => h.id === this.selectedHistoricalLocation.id);
                if (index !== -1) {
                    historicalLocations.splice(index, 1);
                }
                await game.settings.set(MODULE_NAME, "historicalLocations", historicalLocations);
                this.selectedHistoricalLocation = undefined;
                this.render(true);
            },
        },
        form: { handler: this.#onSubmit, closeOnSubmit: true }
    };

    static PARTS = {
        form: {
            template: `modules/wgtgm-mini-calendar/templates/weather-config.hbs`,
            scrollable: ["", ".scrollable"],

        }, footer: { template: "modules/wgtgm-mini-calendar/templates/weather-config-footer.hbs" },

    };


    async _prepareContext(options) {
        this.useHistoricalData ??= game.settings.get(MODULE_NAME, "useHistoricalData");
        this.historicalLocations = game.settings.get(MODULE_NAME, "historicalLocations");
        this.selectedHistoricalLocation ??= this.historicalLocations.find(h => h.id == game.settings.get(MODULE_NAME, "historicalLocationId"));

        if (!this.historicalLocations.length) {
            this.historicalLocations = [{ id: 0, name: "" }];
            this.selectedHistoricalLocation = this.historicalLocations[0];
        } else if (this.selectedHistoricalLocation) {
            this.selectedHistoricalLocation = this.historicalLocations.find(h => h.id == this.selectedHistoricalLocation.id);
        }

        if (!this.selectedHistoricalLocation) {
            this.selectedHistoricalLocation = this.historicalLocations[0];
        }

        this.historicalLocations = this.historicalLocations.sort((a, b) => a.name.localeCompare(b.name));

        return {
            useHistoricalData: this.useHistoricalData,
            historicalLocations: this.historicalLocations,
            selectedHistoricalLocation: this.selectedHistoricalLocation,
            hideWeatherPlayer: game.settings.get(MODULE_NAME, "hideWeatherPlayer"),
            showOnlyTodayWeatherPlayer: game.settings.get(MODULE_NAME, "showOnlyTodayWeatherPlayer"),
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

        this.element.querySelector('select[id="hist-location"]').addEventListener("change", async event => {
            this.selectedHistoricalLocation = this.historicalLocations.find(h => h.id == event.target.selectedOptions[0].value);
            this.render();
        });
    }

    static async #onSubmit(event, form, formData) {
        await game.settings.set(MODULE_NAME, "hideWeatherPlayer", formData.object.hideWeatherPlayer);
        await game.settings.set(MODULE_NAME, "showOnlyTodayWeatherPlayer", formData.object.showOnlyTodayWeatherPlayer);
        await game.settings.set(MODULE_NAME, "broadcastWeather", formData.object.broadcastWeather);
        await game.settings.set(MODULE_NAME, "useCelsius", formData.object.useCelsius);
        await game.settings.set(MODULE_NAME, "enableWeatherEffects", formData.object.enableWeatherEffects);
        await game.settings.set(MODULE_NAME, "enableWeatherSound", formData.object.enableWeatherSound);
        await game.settings.set(MODULE_NAME, "enableWeatherForecast", formData.object.enableWeatherForecast);

        const oldUseHistorical = game.settings.get(MODULE_NAME, "useHistoricalData");
        await game.settings.set(MODULE_NAME, "useHistoricalData", this.useHistoricalData);
        if (this.useHistoricalData) {
            await game.settings.set(MODULE_NAME, "historicalLocationId", this.selectedHistoricalLocation.id);
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
        renderHelper();
            return;
    }
}
