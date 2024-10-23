/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra } from "@workadventure/scripting-api-extra";
import { ActionMessage } from "@workadventure/iframe-api-typings";

console.log('Script started successfully');

let currentPopup: any = undefined;

/**
 * Display the correct door image depending on the state of the door.
 */
function displayDoor(state: unknown) {
    if (state === true) {
        WA.room.showLayer('door/door_opened');
        WA.room.hideLayer('door/door_closed');
    } else {
        WA.room.hideLayer('door/door_opened');
        WA.room.showLayer('door/door_closed');
    }
}

// Waiting for the API to be ready
WA.onInit().then(async () => {
    console.log('Scripting API ready');
    console.log('Player tags: ', WA.player.tags);

    // Clock popup functionality
    WA.room.area.onEnter('clock').subscribe(() => {
        const today = new Date();
        const time = today.getHours() + ":" + today.getMinutes();
        currentPopup = WA.ui.openPopup("clockPopup", "It's " + time, []);
    });

    WA.room.area.onLeave('clock').subscribe(closePopup);

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra().then(() => {
        console.log('Scripting API Extra ready');
    }).catch(e => console.error(e));

    await WA.players.configureTracking({
        players: true,
        movement: false,
    });

    // Door state management
    WA.state.onVariableChange('doorState').subscribe((doorState) => {
        displayDoor(doorState);
    });

    displayDoor(WA.state.doorState);

    let openCloseMessage: ActionMessage | undefined;

    // Inside doorstep: show open/close message
    WA.room.onEnterLayer('doorsteps/inside_doorstep').subscribe(() => {
        openCloseMessage = WA.ui.displayActionMessage({
            message: "Press 'space' to open/close the door",
            callback: () => {
                WA.state.doorState = !WA.state.doorState;
            }
        });
    });

    // Remove message when leaving inside doorstep
    WA.room.onLeaveLayer('doorsteps/inside_doorstep').subscribe(() => {
        if (openCloseMessage !== undefined) {
            openCloseMessage.remove();
        }
    });

    // Update player's room state on entering/leaving the meeting room
    WA.room.onEnterLayer('meetingRoom').subscribe(() => {
        WA.player.state.saveVariable("currentRoom", "meetingRoom", {
            public: true,
            persist: false
        });
    });

    WA.room.onLeaveLayer('meetingRoom').subscribe(() => {
        WA.player.state.saveVariable("currentRoom", undefined, {
            public: true,
            persist: false
        });
    });

    // Outside doorstep: auto-open the door if no one is inside
    WA.room.onEnterLayer('doorsteps/outside_doorstep').subscribe(() => {
        if (WA.state.doorState === false) {
            const players = WA.players.list();
            for (const player of players) {
                if (player.state.currentRoom === "meetingRoom") {
                    // Someone is in the room, don't open the door
                    return;
                }
            }
            // If no one is in the room and the door is closed, open it automatically
            WA.state.doorState = true;
        }
    });

}).catch(e => console.error(e));

function closePopup() {
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}

export {};
