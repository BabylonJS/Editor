import {
    TreeDataProvider, TreeItem, TreeItemCollapsibleState, Command,
    Event, EventEmitter, commands, window, ViewColumn, Uri, WebviewPanel
} from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

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
    private _currentPreview: WebviewPanel = null;
    
    /**
     * Constructor
     */
    constructor (extensionPath: string) {
        // Register commands
        commands.registerCommand('babylonjsEditorPlugin.openPreview', async () => {
            if (this._currentPreview)
                return this._currentPreview.reveal();
            
            // Create preview
            this._currentPreview = window.createWebviewPanel('babylonjsEditorPreview', 'Preview', ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [
                    Uri.file(path.join(extensionPath, 'assets/preview'))
                ]
            });
            this._currentPreview.onDidDispose(() => this._currentPreview = null);
            this._currentPreview.webview.html = fs.readFileSync(path.join(extensionPath, 'assets/preview/index.html')).toString();
        });
    }

    /**
     * 
     */
	public getTreeItem(element: Item): TreeItem {
        // Element already an item, just return the element
		return element;
    }
    
    /**
     * 
     */
    public getChildren(element?: Item): Item[] {
        return [
            new Item('Preview Scene', TreeItemCollapsibleState.None, { command: 'babylonjsEditorPlugin.openPreview', title: 'Open Preview' })
        ];
	}
}