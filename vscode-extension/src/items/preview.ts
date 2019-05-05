import { commands, WebviewPanel, ViewColumn, Uri, window } from "vscode";

import BabylonJSEditorPlugin from "../plugin";
import Utils from "../utils/utils";

export default class PreviewItem {
    // Public members
    public panel: WebviewPanel = null;

    /**
     * Constructor
     */
    constructor (public plugin: BabylonJSEditorPlugin) {
        this.setupCommands();
    }

    /**
     * Setups the commands
     */
    public setupCommands (): void {
        commands.registerCommand('babylonjsEditorPlugin.openPreview', async () => {
            if (this.panel)
                return this.panel.reveal();
            
            // Create preview
            this.panel = window.createWebviewPanel('babylonjsEditorPreview', 'Preview', ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [Uri.parse(Utils.ExtensionPath)]
            });
            this.panel.onDidDispose(() => this.panel = null);

            const url = 'assets/preview/index.html';
            Utils.SetWebViewCommands(this.panel, url);
            await Utils.SetWebViewHtml(this.panel, url);
        });
    }
}
