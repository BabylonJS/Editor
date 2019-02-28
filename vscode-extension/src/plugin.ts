import {
    TreeDataProvider, TreeItem, TreeItemCollapsibleState, Command,
    Event, EventEmitter, commands, window, ViewColumn, Uri, WebviewPanel
} from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { getIp } from './utils';

export class Item extends TreeItem {
    // Public members
    public contextValue: string = 'item';
    public iconPath = {
		light: path.join(__filename, '..', '..', 'assets', 'light', 'document.svg'),
		dark: path.join(__filename, '..', '..', 'assets', 'dark', 'document.svg')
	};

    /**
     * Constructor
     */
	constructor(
		public readonly label: string,
		public readonly collapsibleState: TreeItemCollapsibleState,
		public readonly command?: Command
	) {
		super(label, collapsibleState);
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
    private _currentPreview: WebviewPanel = null;
    
    /**
     * Constructor
     */
    constructor (extensionPath: string) {
        // Misc.
        this._extensionPath = extensionPath;

        // Register commands
        commands.registerCommand('babylonjsEditorPlugin.openPreview', async () => {
            if (this._currentPreview)
                return this._currentPreview.reveal();
            
            // Create preview
            this._currentPreview = window.createWebviewPanel('babylonjsEditorPreview', 'Preview', ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [
                    Uri.parse(this._extensionPath)
                ]
            });
            this._currentPreview.onDidDispose(() => this._currentPreview = null);

            this._currentPreview.webview.onDidReceiveMessage(m => {
                switch (m.command) {
                    case 'notify': return window.showInformationMessage(m.text);
                    case 'notifyError': return window.showInformationMessage(m.text);

                    case 'refresh': return this._setHtml();
                    default: break;
                }
            });

            this._setHtml();
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
        return [
            new Item('Preview Scene', TreeItemCollapsibleState.None, { command: 'babylonjsEditorPlugin.openPreview', title: 'Open Preview' })
        ];
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
    private async _setHtml (): Promise<void> {
        const basePath = Uri.parse(path.join(this._extensionPath)).with({ scheme: 'vscode-resource' });
        const content = await new Promise<string>((resolve, reject) => {
            fs.readFile(path.join(this._extensionPath, 'assets/preview/index.html'), (err, buffer) => {
                if (err) return reject(err);
                resolve(buffer.toString()
                              .replace(/{{base}}/g, basePath.toString())
                              .replace(/{{nonce}}/g, this._getNonce())
                              .replace(/{{ip}}/g, getIp())
                );
            });
        });
        this._currentPreview.webview.html = content;
    }
}