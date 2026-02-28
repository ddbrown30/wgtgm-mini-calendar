import { MODULE_NAME } from "./settings.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Dialog for editing historical weather locations
 */
export class WeatherLocationEditor extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "weather-location-editor",
        tag: "form",
        form: {
            handler: WeatherLocationEditor.formHandler,
            submitOnChange: false,
            closeOnSubmit: true
        },
        classes: ["wgtngmWeatherLocationEditor"],
        window: { title: "Weather Location" },
        position: { width: "400", height: "auto" },
        actions: {
            apply: function (event, button) {
                this.submit();
                this.close();
            },
            cancel: function (event, button) { this.close(); }
        },
    };

    static PARTS = {
        form: {
            template: `modules/wgtgm-mini-calendar/templates/weather-location-editor.hbs`,
        }
    };

    constructor(configWindow, location, options = {}) {
        super(options);

        this.configWindow = configWindow;
        this.editing = !!location;

        if (location) {
            this.location = {
                id: location.id,
                name: location.name,
                latitude: location.latitude,
                longitude: location.longitude,
                year: location.year,
            }
        } else {
            this.location = {
                id: foundry.utils.randomID(8),
                name: "",
                latitude: 0,
                longitude: 0,
                year: 2000,
            }
        }
    }

    async _prepareContext(options) {

        return {
            editing: this.editing,
            name: this.location.name,
            latitude: this.location.latitude,
            longitude: this.location.longitude,
            year: this.location.year,
        };
    }

    _onRender(context, options) {
        this.element.querySelector('input[name="name"').addEventListener("input", async event => {
            this.element.querySelector('[data-action="apply"]').disabled = !event.target.value;
        });
    }

    static async formHandler(event, form, formData) {
        this.location.name = formData.object["name"];
        this.location.latitude = formData.object["latitude"];
        this.location.longitude = formData.object["longitude"];
        this.location.year = formData.object["year"];

        let historicalLocations = game.settings.get(MODULE_NAME, "historicalLocations");
        if (this.editing) {
            const index = historicalLocations.findIndex(h => h.id === this.location.id);
            historicalLocations[index] = this.location;
        } else {
            historicalLocations.push(this.location);
        }

        await game.settings.set(MODULE_NAME, "historicalLocations", historicalLocations);

        if (this.configWindow.state >= ApplicationV2.RENDER_STATES.NONE) {
            this.configWindow.render(true);
        }
    }
}