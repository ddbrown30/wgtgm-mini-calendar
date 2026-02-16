import { MODULE_NAME } from "./settings.js";
import { WeatherEngine } from "./weather.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class BiomeConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "wgtngm-biome-config",
        classes: ["wgtngmBiomeConfig"],
        window: { 
      icon: 'fas fa-hexagon',
        title: "Custom Biome Editor",
        resizable: false
        },
        position: { width: 800, height: 650 },
        form: { handler: this.#onSubmit, closeOnSubmit: false, submitOnChange: false },
        actions: {
            selectHex: this.#onSelectHex,
            setWeather: this.#onSetWeather,
            resetCustom: this.#onReset,
            saveAndClose: this.#onSaveAndClose,
            importTrigger: function(event, target) {
                this.element.querySelector("#wgtgm-import-file").click();
                },
            exportBiomes: this.#exportJSON
        },
    };

    static PARTS = {
        form: { template: `modules/wgtgm-mini-calendar/templates/biome-config.hbs`, scrollable: [".config-panel"] },
    };

    constructor(options) {
        super(options);
        
        const savedMap = game.settings.get(MODULE_NAME, "customBiomeMap");
        this.hexMap = !foundry.utils.isEmpty(savedMap) 
            ? foundry.utils.deepClone(savedMap) 
            : foundry.utils.deepClone(WeatherEngine.DEFAULT_HEX_MAP);

        const savedConfig = game.settings.get(MODULE_NAME, "customBiomeConfig");
        
        this.customBiome = savedConfig?.custom 
            ? foundry.utils.deepClone(savedConfig.custom) 
            : foundry.utils.deepClone(WeatherEngine.DEFAULT_BIOMES["temperate"]);

        this.selectedProfile = savedConfig?.profile || "temperate";

        this.selectedHex = 0;
    }

    async _prepareContext(options) {
        const weatherTypes = [
            { id: "none",         label: "Clear",              icon: "fas fa-sun" },
            { id: "partlyCloudy", label: "Partly Cloudy",      icon: "fas fa-cloud-sun" },
            { id: "clouds",       label: "Overcast",           icon: "fas fa-cloud" },
            { id: "lightRain",    label: "Light Rain",         icon: "fas fa-cloud-rain" },
            { id: "rain",         label: "Rain",               icon: "fas fa-cloud-showers-heavy" },
            { id: "heavyRain",    label: "Heavy Rain",         icon: "fas fa-cloud-showers-heavy" },
            { id: "rainStorm",    label: "Storm",              icon: "fas fa-bolt" },
            { id: "fog",          label: "Fog",                icon: "fas fa-smog" },
            { id: "lightWind",    label: "Windy",              icon: "fas fa-wind" },
            { id: "sandstorm",    label: "Sandstorm",          icon: "fas fa-wind" },
            { id: "heatWave",     label: "Heatwave",           icon: "fas fa-sun-haze" },
            { id: "lightSnow",    label: "Snow",               icon: "fas fa-snowflake" },
            { id: "snow",         label: "Heavy Snow",         icon: "fas fa-snowflake" },
            { id: "blizzard",     label: "Blizzard",           icon: "fas fa-snow-blowing" },
            { id: "hail",         label: "Hail",               icon: "fas fa-cloud-hail" },
            { id: "aurora",       label: "Aurora",             icon: "fas fa-moon-over-sun" }
        ];

        const hexData = [];
        const coords = [
            {id:0, q:0, r:0}, 
            {id:1, q:0, r:-1}, {id:2, q:1, r:-1}, {id:3, q:1, r:0}, {id:4, q:0, r:1}, {id:5, q:-1, r:1}, {id:6, q:-1, r:0},
            {id:7, q:0, r:-2}, {id:8, q:1, r:-2}, {id:9, q:2, r:-2}, {id:10, q:2, r:-1}, {id:11, q:2, r:0}, {id:12, q:1, r:1},
            {id:13, q:0, r:2}, {id:14, q:-1, r:2}, {id:15, q:-2, r:2}, {id:16, q:-2, r:1}, {id:17, q:-2, r:0}, {id:18, q:-1, r:-1}
        ];

        const size = 58; 
        const xOffset = 190; 
        const yOffset = 230; 
        
        for(let c of coords) {
            const x = size * (3/2 * c.q) + xOffset;
            const y = size * (Math.sqrt(3)/2 * c.q  +  Math.sqrt(3) * c.r) + yOffset;
            const cell = this.hexMap[c.id] || { type: "none", icon: "fas fa-question" };
            
            hexData.push({
                id: c.id,
                style: `left: ${x}px; top: ${y}px;`,
                icon: cell.icon,
                type: cell.type,
                active: c.id == this.selectedHex ? "active" : ""
            });
        }

        const useCelsius = game.settings.get(MODULE_NAME, "useCelsius");
        const tempUnit = useCelsius ? "°C" : "°F";
        
        let displayOffset = this.customBiome.tempOffset || 0;
        if (useCelsius) {
            displayOffset = Math.round(displayOffset / 1.8);
        }

        const profiles = [
            { value: "temperate", label: "Mild (Temperate)" },
            { value: "tropical",  label: "Chaotic (Tropical)" },
            { value: "desert",    label: "Monoclimate (Desert)" },
            { value: "polar",     label: "Monoclimate (Polar)" }
        ];

        return {
            hexes: hexData,
            weatherTypes,
            selectedHexId: this.selectedHex,
            weatherTypesWithActive: weatherTypes.map(w => ({
                ...w,
                isActive: w.id === (this.hexMap[this.selectedHex]?.type) ? "active" : ""
            })),
            profiles,
            selectedProfile: this.selectedProfile,
            tempOffset: displayOffset,
            tempUnit,
        };
    }

    /**
     * Tries to parse a JSON string.
     * @param {string} jsonString
     * @returns {object|null} The parsed object or null if invalid.
     */
    _tryParseJson(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
                return parsed;
            }
            return null;
        } catch (e) {
            console.warn("Mini Calendar | JSON Parse Error:", e);
            return null;
        }
    }

    static #exportJSON() {
        const data = {
            hexMap: this.hexMap,
            customBiome: this.customBiome,
            meta: {
                version: 1,
                date: new Date().toISOString()
            }
        };
        
        const filename = `mini-calendar-biome-export.json`;
        foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), "text/json", filename);
        ui.notifications.info("Mini Calendar: Biome configuration exported.");
    }

    /** @override */
    async _onRender(context, options) {
        await super._onRender(context, options);
        const fileInput = this.element.querySelector("#wgtgm-import-file");
        if (fileInput) {
            fileInput.addEventListener("change", (event) => this._handleFileSelect(event));
        }
    }


    async _handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonString = e.target.result;
                const json = JSON.parse(jsonString);

                if (json && json.hexMap && json.customBiome) {
                    // Update the local instance data
                    this.hexMap = json.hexMap;
                    this.customBiome = json.customBiome;
                    
                    ui.notifications.info("Biome JSON imported. Review settings and click 'Save'.");
                    
                    this.render();
                } else {
                    ui.notifications.warn("Invalid Biome Configuration file. Missing hexMap or customBiome data.");
                }

            } catch (err) {
                console.error("Mini Calendar | Import Error:", err);
                ui.notifications.error("Failed to parse JSON file.");
            }
            event.target.value = "";
        };
        reader.readAsText(file);
    }
    /* --- ACTIONS --- */


    static async #onSelectHex(event, target) {
        this.selectedHex = parseInt(target.dataset.id);

        const allHexes = this.element.querySelectorAll(".hex-cell");
        allHexes.forEach(h => h.classList.remove("active"));
        target.classList.add("active");

        const currentType = this.hexMap[this.selectedHex]?.type || "none";
        const allButtons = this.element.querySelectorAll(".weather-btn");
        
        allButtons.forEach(btn => {
            if (btn.dataset.type === currentType) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }




      static async #onSetWeather(event, target) {
        const type = target.dataset.type;
        const icon = target.dataset.icon;
        
        if (!this.hexMap[this.selectedHex]) this.hexMap[this.selectedHex] = {};
        this.hexMap[this.selectedHex].type = type;
        this.hexMap[this.selectedHex].icon = icon;

        const activeHex = this.element.querySelector(`.hex-cell[data-id="${this.selectedHex}"]`);
        if (activeHex) {
            const iconElement = activeHex.querySelector("i");
            if (iconElement) {
                iconElement.className = icon;
            }
        }

        const allButtons = this.element.querySelectorAll(".weather-btn");
        allButtons.forEach(btn => btn.classList.remove("active"));
        target.classList.add("active");
    }

    static async #onReset(event, target) {
        const confirm = await foundry.applications.api.DialogV2.confirm({
            content: "Reset Custom biome to default Temperate settings?"
        });
        if (!confirm) return;

        this.hexMap = foundry.utils.deepClone(WeatherEngine.DEFAULT_HEX_MAP);
        this.customBiome = foundry.utils.deepClone(WeatherEngine.DEFAULT_BIOMES["temperate"]);
        this.render();
     }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    if ( !this.hasFrame ) return frame;
    const copyId = `
        <button type="button" class="header-control fa-solid fa-file-import icon" data-action="importTrigger"
                data-tooltip="Import Biomes JSON" aria-label="Import Biomes from JSON"></button>
        <button type="button" class="header-control fa-solid fa-file-export icon" data-action="exportBiomes"
                data-tooltip="Export Biomes to JSON" aria-label="Export Biomes to JSON"></button>
      `;
      this.window.close.insertAdjacentHTML("beforebegin", copyId);
    
    return frame;
  }

static async #onSaveAndClose(event, target) {
        const html = this.element;

        const biomeProfile = html.querySelector("select[name='biomeProfile']");
        const profileKey = biomeProfile?.value || "temperate";
        if (profileKey && WeatherEngine.DEFAULT_BIOMES[profileKey]) {
            const profileData = WeatherEngine.DEFAULT_BIOMES[profileKey];
            this.customBiome.seasons = foundry.utils.deepClone(profileData.seasons);
        }

        const tempInput = html.querySelector("input[name='tempOffset']");
        const useCelsius = game.settings.get(MODULE_NAME, "useCelsius");
        const val = parseFloat(tempInput?.value) || 0;
        
        this.customBiome.tempOffset = useCelsius ? Math.round(val * 1.8) : val;
        
        await game.settings.set(MODULE_NAME, "customBiomeMap", this.hexMap);

        const currentConfig = game.settings.get(MODULE_NAME, "customBiomeConfig") || {};
        currentConfig.profile = profileKey;
        currentConfig.custom = this.customBiome;
        await game.settings.set(MODULE_NAME, "customBiomeConfig", currentConfig);

        ui.notifications.info("Custom Biome Saved & Activated.");
        this.close();
    }

    static async #onSubmit(event, form, formData) {
        // Handled via listeners and Save button
    }

    }