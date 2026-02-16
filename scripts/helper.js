import { MODULE_NAME } from "./settings.js";
import { wgtngmMiniCalender } from "./mini-calendar.js";

/**
 * localization.
 * @type {string}
 */
export const localize = (key) => game.i18n.localize(`${MODULE_NAME}.${key}`);

export const format = (key, data) =>
    game.i18n.format(`${MODULE_NAME}.${key}`, data);

export const calendarJournal = "Calendar Events - Mini Calendar";
export const playerJournalName = "Player Notes - Mini Calendar";

export const PIN_TYPES = [
    { key: "fas fa-book", label: "Note" },
    { key: "fas fa-map-pin", label: "Pin" },
    { key: "fas fa-scroll", label: "Quest" },
    { key: "fas fa-skull-crossbones", label: "Danger" },
    { key: "fas fa-gem", label: "Treasure" },
    { key: "fas fa-beer", label: "Tavern" },
    { key: "fas fa-home", label: "Village" },
    { key: "fas fa-user", label: "NPC" },
    { key: "fas fa-store", label: "Shop" },
    { key: "fas fa-sun", label: "Sun" },
    { key: "fas fa-moon", label: "Moon/Eclipse" },
    { key: "fas fa-star", label: "Star" },
    { key: "fas fa-snowflake", label: "Snow" },
    { key: "fas fa-glass-cheers", label: "Festival" },
    { key: "fas fa-tree", label: "Nature" },
    { key: "fas fa-wheat", label: "Harvest" },
    { key: "fas fa-leaf", label: "Leaf" },
    { key: "fas fa-balance-scale", label: "Balance" },
    { key: "fas fa-campground", label: "Camp" },
    { key: "fas fa-chess-rook", label: "Castle" },
    { key: "fas fa-place-of-worship", label: "Temple" },
    { key: "fas fa-dungeon", label: "Dungeon" },
    { key: "fas fa-dragon", label: "Monster" },
    { key: "fas fa-hand-holding-magic", label: "Magic" },
    { key: "fas fa-fist-raised", label: "Battle" },
    { key: "fas fa-shield-alt", label: "Shield" },
    { key: "fas fa-water", label: "Water/Sea" },
    { key: "fas fa-anchor", label: "Port" }
];

export function handleMPClick(event) {
    const target = event.currentTarget;
    const handler = target.dataset.wgtngm;

    if (!handler) return;

    event.preventDefault();

    const parts = handler.split("|");
    const module = parts[0];
    const action = parts[1];
    const args = parts.slice(2);
    if (module !== MODULE_NAME) {
        return;
    }
    // console.log(module);
    switch (action) {
        case "openMenu":
            if (args[0]) {
                game.settings.sheet.render(true, { tab: args[0] });
            }
            break;
        case "openWindow":
            if (args[0]) {
                window.open(args[0], "_blank");
            }
            break;
        default:
            break;
    }
}
export async function openwgtngmMiniCalendarSheet() {
    if (game.wgtngmMiniCalender && game.wgtngmMiniCalender.rendered) {
        game.wgtngmMiniCalender.close();
        return;
    }
    if (game.wgtngmMiniCalender) {
        game.wgtngmMiniCalender.render(true);
    }
}


export async function openwgtngmMiniCalendarAPI(toggle = true) {
    if (toggle) {
        if (game.wgtngmMiniCalender && game.wgtngmMiniCalender.rendered) {
            game.wgtngmMiniCalender.close();
            return;
        }
    }
    if (game.wgtngmMiniCalender) {
        game.wgtngmMiniCalender.render(true);
    }
}


export async function renderCalendarIfOpen() {
    if (game.wgtngmMiniCalender && game.wgtngmMiniCalender.rendered) {
        game.wgtngmMiniCalender.render(true);
    }

}

export function renderHelper() {
    if (game.wgtngmMiniCalender.hud) game.wgtngmMiniCalender.hud.render();
    renderCalendarIfOpen()
}

export async function whisperChat(content = "") {
    ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker(),
        content: content,
        whisper: [game.user.id]
    });
}


export async function broadcastChat(content = "") {
    ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker(),
        content: content,
    });
}

export async function confirmationDialog(message = "Are you sure?") {
    const proceed = await foundry.applications.api.DialogV2.confirm({
        content: message,
        rejectClose: false,
        modal: true,
    });
    return proceed;
}


