import { ipcRenderer, webFrame } from "electron";

import { IPCResponses, IPCRequests } from "../../shared/ipc";
import { Undefinable } from "../../shared/types";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { Tools } from "../editor/tools/tools";
import { IPCTools } from "../editor/tools/ipc";

export interface IWindowedPluginInitialization {
    /**
     * Defines the name of the plugin to require.
     */
    name: string;
    /**
     * Defines the option array of arguments to pass the the ".init" function of the plugin.
     */
    args?: Undefinable<any[]>;
}

export default class WindowedPlugin {
    private _ref: any;
    private _refHandler = {
        getRef: (ref: any) => this._ref = ref,
    }
    /**
     * Constructor.
     */
    public constructor() {
        this._init();
    }

    /**
     * Inits the plugin.
     */
    private async _init(): Promise<void> {
        // Initialize tools
        await Tools.Init();
        
        // Get current window id
        const windowId = await IPCTools.CallWithPromise<number>(IPCRequests.GetWindowId);

        // Bind event on the window is closing
        window.addEventListener("beforeunload", async (e) => {
            const closed = await this._ref?.onClose?.call(this._ref, e);
            if (closed) {
                ipcRenderer.send(IPCRequests.SendWindowMessage, -1, { id: "close-window", windowId });
            }
        });

        // Get plugin name
        const result = await new Promise<any>((resolve) => {
            ipcRenderer.once(IPCResponses.SendWindowMessage, (_, data) => data.id === "pluginName" && resolve(data));
            ipcRenderer.send(IPCRequests.SendWindowMessage, -1, { id: "pluginName", popupId: windowId });
        });

        // Load plugin!
        try {
            const plugin = require(`./${result.data.name}`);
            document.title = plugin.title;

            ReactDOM.render(<plugin.default ref={this._refHandler.getRef} />, document.getElementById("BABYLON-EDITOR-PLUGIN"), () => {
                this._ref?.init?.apply(this._ref, result.data.args ?? []);
            });
            ipcRenderer.send(IPCResponses.SendWindowMessage, -1, { id: "pluginName" });
        } catch (e) {
            /* Catch silently */
        }

        document.getElementById("BABYLON-START-IMAGE")?.remove();

        // Apply preferences
        const preferences = Tools.GetEditorPreferences();
        webFrame.setZoomFactor(parseFloat(preferences.zoom ?? "1"));
    }
}
