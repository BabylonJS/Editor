import {
    TreeDataProvider, TreeItem, TreeItemCollapsibleState, Command,
    Event, EventEmitter, commands, window, ViewColumn, Uri, WebviewPanel
} from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { getIp } from './utils';
import Socket from './socket';

enum FileIcon {
    Document = 'document.svg',
    Directory = 'folder.svg',
}

export class Item extends TreeItem {
    // Public members
    public contextValue: string = 'item';
    
    // Private members
    private _fileIcon: FileIcon;

    /**
     * Constructor
     */
	constructor(
        public readonly label: string,
        public readonly id: string,
		public readonly collapsibleState: TreeItemCollapsibleState,
		public readonly command?: Command
	) {
        super(label, collapsibleState);
        
        switch (collapsibleState) {
            case TreeItemCollapsibleState.None:
                this._fileIcon = FileIcon.Document;
                break;
            case TreeItemCollapsibleState.Expanded:
            case TreeItemCollapsibleState.Collapsed:
                this._fileIcon = FileIcon.Directory;
                break;
            default:
                this._fileIcon = FileIcon.Document;
                break;
        }
    }
    
    /**
     * Returns the icon path
     */
    public get iconPath () {
        return {
            light: path.join(__filename, '..', '..', 'assets', 'light', this._fileIcon),
            dark: path.join(__filename, '..', '..', 'assets', 'dark', this._fileIcon)
        };
    }

    /**
     * Gets the tooltip text to draw in vscode
     */
	public get tooltip(): string {
		return this.label;
	}

}

export default class BabylonJSEditorPlugin implements TreeDataProvider<Item> {
    // Public members
    public readonly _onDidChangeTreeData: EventEmitter<Item | undefined> = new EventEmitter<Item | undefined>();
    public readonly onDidChangeTreeData: Event<Item | undefined> = this._onDidChangeTreeData.event;

    // Private members
    private _extensionPath: string;
    private _previewPanel: WebviewPanel = null;
    private _graphPanels: { [id: string]: WebviewPanel } = { };

    private _behaviorGraphs: any[] = [];
    
    /**
     * Constructor
     */
    constructor (extensionPath: string) {
        // Misc.
        this._extensionPath = extensionPath;

        // Register commands
        commands.registerCommand('babylonjsEditorPlugin.openPreview', async () => {
            if (this._previewPanel)
                return this._previewPanel.reveal();
            
            // Create preview
            this._previewPanel = window.createWebviewPanel('babylonjsEditorPreview', 'Preview', ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [Uri.parse(this._extensionPath)]
            });
            this._previewPanel.onDidDispose(() => this._previewPanel = null);

            const url = 'assets/preview/index.html';
            this._bindMessageEvents(this._previewPanel, url);
            await this._setHtml(this._previewPanel, url);
        });

        commands.registerCommand('babylonjsEditorPlugin.openGraph', async (id) => {
            const g = this._behaviorGraphs.find(g => g.id === id);
            if (!g)
                return;

            // If exists, just reveal
            let panel = this._graphPanels[id];
            if (panel)
                return panel.reveal();

            // Create panel
            panel = window.createWebviewPanel('babylonjsEditorGraph' + id, g.name, ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [Uri.parse(this._extensionPath)]
            });
            panel.onDidDispose(() => delete this._behaviorGraphs[id]);
            this._behaviorGraphs[id] = panel;

            const url = 'assets/graph/index.html';
            this._bindMessageEvents(panel, url);
            await this._setHtml(panel, url);

            // Set graph
            panel.webview.postMessage({ command: 'set-graph', graph: g });
        });

        // Events
        Socket.OnGotBehaviorGraphs = (g => {
            // Refresh
            if (Array.isArray(g)) {
                this._behaviorGraphs = g;
                this._onDidChangeTreeData.fire();
                return;
            }

            // Update
            const effective = this._behaviorGraphs.find(b => b.id === g.id);
            effective.name = g.name;
            effective.graph = g.graph;
            
            if (this._behaviorGraphs[g.id])
                this._behaviorGraphs[g.id].webview.postMessage({ command: 'set-graph', graph: g });
        });
    }

    /**
     * Returns the item as a tree item
     */
	public getTreeItem(element: Item): TreeItem {
        // Element already an item, just return the element
		return element;
    }
    
    /**
     * Returns the children of the given tree item
     */
    public getChildren(element?: Item): Item[] {
        if (!element) {
            return [
                new Item('Preview Scene', 'preview', TreeItemCollapsibleState.None, { command: 'babylonjsEditorPlugin.openPreview', title: 'Open Preview' }),
                new Item('Behavior Graphs', 'behavior-graphs', TreeItemCollapsibleState.Expanded)
            ];
        }

        switch (element.id) {
            case 'behavior-graphs':
                return this._behaviorGraphs.map(b => new Item(b.name, b.id, TreeItemCollapsibleState.None, { command: 'babylonjsEditorPlugin.openGraph', title: 'Open Graph', arguments: [b.id] }));
        }
    }
    
    // Returns a random nonce
    private _getNonce (): string {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
    }

    // Sets html of the webview
    private async _setHtml (panel: WebviewPanel, url: string): Promise<void> {
        const basePath = Uri.parse(path.join(this._extensionPath)).with({ scheme: 'vscode-resource' });
        const content = await new Promise<string>((resolve, reject) => {
            fs.readFile(path.join(this._extensionPath, url), (err, buffer) => {
                if (err) return reject(err);
                resolve(buffer.toString()
                              .replace(/{{base}}/g, basePath.toString())
                              .replace(/{{nonce}}/g, this._getNonce())
                              .replace(/{{ip}}/g, getIp())
                );
            });
        });
        panel.webview.html = content;
    }

    // Binds the events on panel
    private _bindMessageEvents (panel: WebviewPanel, url: string): void {
        panel.webview.onDidReceiveMessage(m => {
            switch (m.command) {
                case 'notify': return window.showInformationMessage(m.text);
                case 'notifyError': return window.showInformationMessage(m.text);

                case 'refresh': return this._setHtml(panel, url);

                case 'set-graph':
                    const effective = this._behaviorGraphs.find(b => b.id === m.graph.id);
                    effective.graph = m.graph.graph;
                    return Socket.UpdateBehaviorGraph(m.graph);
                default: break;
            }
        });
    }
}