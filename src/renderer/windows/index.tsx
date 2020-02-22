import { ipcRenderer, remote } from "electron";
import { IPCResponses, IPCRequests } from "../../shared/ipc";

import * as React from "react";
import * as ReactDOM from "react-dom";

export default class WindowedPlugin {
    /**
     * Constructor.
     */
    constructor() {
        this._init();
    }

    /**
     * Inits the plugin.
     */
    private async _init(): Promise<void> {
        // Bind event on the window is closing
        window.addEventListener("beforeunload", () => {
            ipcRenderer.send(IPCRequests.SendWindowMessage, -1, { id: "close-window", windowId: remote.getCurrentWindow().id });
        });

        // Get plugin name
        const pluginName = await new Promise<string>((resolve) => {
            ipcRenderer.once(IPCResponses.SendWindowMessage, (_, data) => data.id === "pluginName" && resolve(data.name));
        });

        // Load plugin!
        try {
            const plugin = require(`./${pluginName}`);
            document.title = plugin.title;

            ReactDOM.render(<plugin.default />, document.getElementById("BABYLON-EDITOR-PLUGIN"));
            ipcRenderer.send(IPCResponses.SendWindowMessage, -1, { id: "pluginName" });
        } catch (e) {
            /* Catch silently */
        }

        document.getElementById("BABYLON-START-IMAGE")?.remove();
    }
}
