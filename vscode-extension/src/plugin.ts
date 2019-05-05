import {
    TreeDataProvider, TreeItem, TreeItemCollapsibleState, Command,
    Event, EventEmitter, commands, window, ViewColumn, Uri, WebviewPanel
} from 'vscode';
import * as path from 'path';

import PreviewItem from './items/preview';
import GraphItem from './items/graphs';

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
            light: path.join(__filename, '..', '..', '..', 'assets', 'light', this._fileIcon),
            dark: path.join(__filename, '..', '..', '..', 'assets', 'dark', this._fileIcon)
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
    private _previewItem: PreviewItem;
    private _graphItem: GraphItem;
    
    /**
     * Constructor
     */
    constructor () {
        // Register items
        this._previewItem = new PreviewItem(this);
        this._graphItem = new GraphItem(this);
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
                return this._graphItem.behaviorGraphs.map(b => new Item(b.name, b.id, TreeItemCollapsibleState.None, { command: 'babylonjsEditorPlugin.openGraph', title: 'Open Graph', arguments: [b.id] }));
        }
    }
}