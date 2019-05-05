import { commands, WebviewPanel, ViewColumn, Uri, window } from "vscode";
import { join } from 'path';

import BabylonJSEditorPlugin from "../plugin";
import Utils from "../utils/utils";
import Sockets from "../utils/socket";

export default class GraphItem {
    // Public members
    public panels: { [id: string]: WebviewPanel } = { };

    public behaviorGraphs: any[] = [];
    public sceneInfos: any = { };
    public selectedObject: any = { };

    /**
     * Constructor
     */
    constructor (public plugin: BabylonJSEditorPlugin) {
        this.setupCommands();
        this.setupSockets();
    }

    /**
     * Setups the commands
     */
    public setupCommands (): void {
        commands.registerCommand('babylonjsEditorPlugin.openGraph', async (id) => {
            const g = this.behaviorGraphs.find(g => g.id === id);
            if (!g)
                return;

            // If exists, just reveal
            let panel = this.panels[id];
            if (panel)
                return panel.reveal();

            // Create panel
            panel = window.createWebviewPanel('babylonjsEditorGraph' + id, g.name, ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [Uri.parse(Utils.ExtensionPath)]
            });
            panel.iconPath = {
                light: Uri.file(join(Utils.ExtensionPath, 'assets', 'light', 'dependency.svg')),
                dark: Uri.file(join(Utils.ExtensionPath, 'assets', 'dark', 'dependency.svg'))
            };
            panel.onDidDispose(() => delete this.panels[id]);
            this.panels[id] = panel;

            const url = 'assets/graph/index.html';
            Utils.SetWebViewCommands(panel, url);
            await Utils.SetWebViewHtml(panel, url);

            // Events
            panel.webview.onDidReceiveMessage(m => {
                switch (m.command) {
                    case 'require-graph':
                        panel.webview.postMessage({ command: 'set-scene-infos', infos: this.sceneInfos });
                        panel.webview.postMessage({ command: 'set-selected-object', infos: this.selectedObject });
                        return panel.webview.postMessage({ command: 'set-graph', graph: g });
                    case 'set-graph':
                        const effective = this.behaviorGraphs.find(b => b.id === m.graph.id);
                        effective.graph = m.graph.graph;
                        return Sockets.UpdateBehaviorGraph(m.graph);
                    default: break;
                }
            });
        });
    }
    
    /**
     * Setups the sockets
     */
    public setupSockets (): void {
        Sockets.OnGotBehaviorGraphs = (g => {
            // Refresh
            if (Array.isArray(g)) {
                this.behaviorGraphs = g;
                this.plugin._onDidChangeTreeData.fire();
                this.clearObseletePanels();
                return;
            }

            // Update
            const effective = this.behaviorGraphs.find(b => b.id === g.id);
            effective.name = g.name;
            effective.graph = g.graph;
            
            if (this.panels[g.id])
                this.panels[g.id].webview.postMessage({ command: 'set-graph', graph: g });
        });

        Sockets.OnGotSceneInfos = (i => {
            this.sceneInfos = i;
            this.postMessageToPanels({ command: 'set-scene-infos', infos: i });
        });

        Sockets.OnGotSelectedObject = (s => {
            this.selectedObject = s;
            this.postMessageToPanels({ command: 'set-selected-object', name: s });
        });
    }

    /**
     * Posts the given message to all opened panels
     * @param message the message to post
     */
    public postMessageToPanels (message: any): void {
        for (const id in this.panels)
            this.panels[id].webview.postMessage(message);
    }

    /**
     * Clears all the obselete panels. Typically when the user removes a graph
     * or loads a new scene
     */
    public clearObseletePanels (): void {
        for (const id in this.panels) {
            const b = this.behaviorGraphs.find(b => b.id === id);
            if (!b) {
                this.panels[id].dispose();
                delete this.panels[id];
            }
        }
    }
}
