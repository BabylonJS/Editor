import * as os from "os";
import { ipcRenderer } from "electron";

import { IPCRequests } from "../../../shared/ipc";
import { IStringDictionary } from "../../../shared/types";

import { IPCTools } from "./ipc";
import { Tools } from "babylonjs";

export interface ITouchBarButton {
    /**
     * Defines the label drawn on the touch bar button.
     */
    label?: string;
    /**
     * Defines the of the button as a string (path or base64).
     */
    icon?: string;
    /**
     * Defines wether or not the element is a separator.
     */
    separator?: boolean;
    /**
     * Defines the position of the icon on the button.
     */
    iconPosition?: "left" | "overlay" | "right";
    /**
     * Defines the callback called on the touch bar button is pressed.
     */
    click?: string | (() =>  void);
}

export class TouchBarHelper {
    private static _Listeners: IStringDictionary<any> = { };

    /**
     * Gets wether or not the touch bar is supported.
     * Means that the editor is running on a Mac OS device.
     */
    public static get IsSupported(): boolean {
        return os.platform() === "darwin";
    }

    /**
     * Sets the new touch bar elements (buttons, icons, etc.).
     * @param elements defines the array of elements to draw in the touch bar.
     */
    public static SetTouchBarElements(elements: ITouchBarButton[]): void {
        if (!this.IsSupported) { return; }

        // Remove existing ipc renderer listeners.
        for (const event in this._Listeners) {
            ipcRenderer.removeListener(event, this._Listeners[event]);
        }

        this._Listeners = { };

        // Add all events
        const finalElements = elements.map((e) => {
            const eventName = typeof(e.click) === "string" ? e.click : `touch-bar-event-${Tools.RandomId()}`;
            ipcRenderer.addListener(eventName, this._Listeners[eventName] = () => {
                if (typeof(e.click) === "string") { return; }
                if (e.click) { e.click(); }
            });

            return {
                eventName,
                icon: e.icon,
                label: e.label,
                separator: e.separator,
                iconPosition: e.iconPosition,
            };
        });

        IPCTools.Send(IPCRequests.SetTouchBar, finalElements);
    }
}
