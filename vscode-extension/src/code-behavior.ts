import {
    TreeDataProvider, TreeItem, TreeItemCollapsibleState,
    window, EventEmitter, commands, Command, workspace, Event,
    Uri,
    languages,
    WorkspaceEdit
} from 'vscode';
import * as fetch from 'node-fetch';
import * as path from 'path';

import Sockets from './socket';

export interface BehaviorCode {
    name: string;
    id: string;
    code: string;
}

export class CodeBehaviorDependency extends TreeItem {
    /**
     * Constructor
     * @param name the name of the item
     * @param collapsibleState the collapsible state of the item
     */
    constructor(
        public readonly label: string,
        public readonly collapsibleState: TreeItemCollapsibleState,
        public readonly command?: Command,
	) {
		super(label, collapsibleState);
    }

    /**
     * Gets the icon path according to the current item type
     */
    public iconPath = {
		light: path.join(__filename, '..', '..', 'assets', 'light', this.command ? 'document.svg' : 'folder.svg'),
		dark: path.join(__filename, '..', '..', 'assets', 'dark', this.command ? 'document.svg' : 'folder.svg')
	};
}

export default class CodeBehaviorTreeProvider implements TreeDataProvider<CodeBehaviorDependency> {
    // Public members
    public readonly root: CodeBehaviorDependency = new CodeBehaviorDependency('Code Behavior Editor', TreeItemCollapsibleState.Expanded);
    public readonly _onDidChangeTreeData: EventEmitter<CodeBehaviorDependency | undefined> = new EventEmitter<CodeBehaviorDependency | undefined>();
	public readonly onDidChangeTreeData: Event<CodeBehaviorDependency | undefined> = this._onDidChangeTreeData.event;

    // Private members
    private _codes: BehaviorCode[] = [];

    /**
     * Constructor
     */
    constructor() {
        // Register
        window.registerTreeDataProvider('behaviorCode', this);

        // Sockets
        Sockets.onGotBehaviorCodes = (s => {
            this._codes = s;
            this.refresh();
        });

        // Register commands
        commands.registerCommand('behaviorCode.refresh', () => {
            this._codes = [];
            this.refresh();
        });

        commands.registerCommand('behaviorCode.openScript', async (id: string) => {
            // Get effective code reference
            const code = this._codes.find(c => c.id === id);
            if (!code)
                return;
            
            // Create document
            const uri = Uri.parse('babylonjs-editor:' + code.name);
            const doc = await workspace.openTextDocument(uri);

            const tab = await window.showTextDocument(doc, 1, false);
            languages.setTextDocumentLanguage(doc, 'typescript');
        });
    }

    /**
     * Get a TreeItem representation of the given element
     * @param element the element to translate
     */
	public getTreeItem(element: CodeBehaviorDependency): TreeItem {
        // Already a tree item
        return element;
    }
    
    /**
     * Get the children of the given element or root if no element is passed.
     * @param element the element being undefined or root in this case
     */
    public async getChildren(element?: CodeBehaviorDependency): Promise<CodeBehaviorDependency[]> {
        // Return root
        if (!element)
            return Promise.resolve([this.root]);

        // If empty, request existing
        if (this._codes.length === 0) {
            const result = await fetch('http://localhost:1337/behaviorCodes');
            this._codes = <BehaviorCode[]> await result.json();
        }

        return Promise.resolve(this._codes.map(d => {
            const command: Command = { command: 'behaviorCode.openScript', title: 'Open Script', arguments: [d.id] }
            return new CodeBehaviorDependency(d.name, TreeItemCollapsibleState.None, command);
        }));
    }
    
    /**
     * Refreshes the tree
     */
    public refresh(): any {
        this._onDidChangeTreeData.fire();
	}
}
