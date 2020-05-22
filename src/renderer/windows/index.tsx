import { ipcRenderer, remote } from "electron";

import { IPCResponses, IPCRequests } from "../../shared/ipc";
import { Undefinable } from "../../shared/types";

import * as React from "react";
import * as ReactDOM from "react-dom";

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
        // Bind event on the window is closing
        window.addEventListener("beforeunload", () => {
            this._ref?.onClose?.call(this._ref);
            ipcRenderer.send(IPCRequests.SendWindowMessage, -1, { id: "close-window", windowId: remote.getCurrentWindow().id });
        });

        // Get plugin name
        const data = await new Promise<any>((resolve) => {
            ipcRenderer.once(IPCResponses.SendWindowMessage, (_, data) => data.id === "pluginName" && resolve(data));
        });

        // Load plugin!
        try {
            const plugin = require(`./${data.name}`);
            document.title = plugin.title;

            ReactDOM.render(<plugin.default ref={this._refHandler.getRef} />, document.getElementById("BABYLON-EDITOR-PLUGIN"), () => {
                this._ref?.init?.apply(this._ref, data.args ?? []);
            });
            ipcRenderer.send(IPCResponses.SendWindowMessage, -1, { id: "pluginName" });
        } catch (e) {
            /* Catch silently */
        }

        document.getElementById("BABYLON-START-IMAGE")?.remove();

        // Debug?
        if (process.env.DEBUG) {
            remote.getCurrentWindow().maximize();
        }
    }
}
