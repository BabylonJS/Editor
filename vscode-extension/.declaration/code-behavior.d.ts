import { TreeView, TreeDataProvider, TreeItem, TreeItemCollapsibleState, EventEmitter, Command, Event } from 'vscode';
export interface BehaviorCode {
    name: string;
    id: string;
    code: string;
}
export declare class CodeBehaviorDependency extends TreeItem {
    readonly label: string;
    readonly collapsibleState: TreeItemCollapsibleState;
    readonly command?: Command;
    /**
     * Constructor
     * @param name
     * @param collapsibleState
     */
    constructor(label: string, collapsibleState: TreeItemCollapsibleState, command?: Command);
}
export declare class CodeBehaviorTreeProvider implements TreeDataProvider<CodeBehaviorDependency> {
    tree: TreeView<CodeBehaviorDependency>;
    readonly root: CodeBehaviorDependency;
    readonly _onDidChangeTreeData: EventEmitter<any>;
    readonly onDidChangeTreeData: Event<any>;
    private _codes;
    /**
     * Constructor
     */
    constructor();
    /**
     * Get a TreeItem representation of the given element
     * @param element the element to translate
     */
    getTreeItem(element: CodeBehaviorDependency): TreeItem;
    /**
     * Get the children of the given element or root if no element is passed.
     * @param element the element being undefined or root in this case
     */
    getChildren(element?: CodeBehaviorDependency): Promise<CodeBehaviorDependency[]>;
    /**
     * Refreshes the tree
     */
    refresh(): any;
}
