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
    if (game.wgtngmMiniCalender.calendarInstance && game.wgtngmMiniCalender.calendarInstance.rendered) {
        game.wgtngmMiniCalender.calendarInstance.close();
        return;
    }

    let savedDimensions = game.settings.get(MODULE_NAME, "calSheetDimensions");


    if (!game.wgtngmMiniCalender.calendarInstance) {
        game.wgtngmMiniCalender.calendarInstance = new wgtngmMiniCalender( {
        position: {
            left: savedDimensions?.left ?? 40,
            top: savedDimensions?.top ?? 40
        }
       });
    }
   
    game.wgtngmMiniCalender.calendarInstance.render(true);

}


export async function openwgtngmMiniCalendarAPI(toggle=true) {
    if (toggle){
        if (game.wgtngmMiniCalender.calendarInstance && game.wgtngmMiniCalender.calendarInstance.rendered) {
            game.wgtngmMiniCalender.calendarInstance.close();
            return;
        }
    }
    let savedDimensions = game.settings.get(MODULE_NAME, "calSheetDimensions");


    if (!game.wgtngmMiniCalender.calendarInstance) {
        game.wgtngmMiniCalender.calendarInstance = new wgtngmMiniCalender( {
        position: {
            left: savedDimensions?.left ?? 40,
            top: savedDimensions?.top ?? 40
        }
       });
    }
   
    game.wgtngmMiniCalender.calendarInstance.render(true);

}


export async function renderCalendarIfOpen() {
    if (game.wgtngmMiniCalender.calendarInstance && game.wgtngmMiniCalender.calendarInstance.rendered) {
        game.wgtngmMiniCalender.calendarInstance.render(true);
    }

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


