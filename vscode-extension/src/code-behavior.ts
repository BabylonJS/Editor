import {
    TreeView, TreeDataProvider, TreeItem, TreeItemCollapsibleState,
    window, EventEmitter, commands, Command, workspace, Event
} from 'vscode';
import * as fetch from 'node-fetch';

export interface BehaviorCode {
    name: string;
    id: string;
    code: string;
}

export class CodeBehaviorDependency extends TreeItem {
    /**
     * Constructor
     * @param name 
     * @param collapsibleState 
     */
    constructor(
        public readonly label: string,
        public readonly collapsibleState: TreeItemCollapsibleState,
        public readonly command?: Command,
	) {
		super(label, collapsibleState);
    }
}

export class CodeBehaviorTreeProvider implements TreeDataProvider<CodeBehaviorDependency> {
    // Public members
    public tree: TreeView<CodeBehaviorDependency> = window.createTreeView('behavior-code', { treeDataProvider: this });

    public readonly root: CodeBehaviorDependency = new CodeBehaviorDependency('Code Behavior Editor', TreeItemCollapsibleState.Expanded);
    
    public readonly _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();
    public readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData.event;

    // Private members
    private _codes: BehaviorCode[] = [];

    /**
     * Constructor
     */
    constructor() {
        commands.registerCommand('behaviorCode.openScript', async (id: string) => {
            // Get effective code reference
            const code = this._codes.find(c => c.id === id);
            if (!code)
                return;
            
            // Create document
            const doc = await workspace.openTextDocument({ language: 'typescript', content: code.code });
            await window.showTextDocument(doc);
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

        // Return by requesting
        const result = await fetch('http://localhost:1337/behaviorCodes');
        this._codes = <BehaviorCode[]> await result.json();

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
