"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const fetch = require("node-fetch");
class CodeBehaviorDependency extends vscode_1.TreeItem {
    /**
     * Constructor
     * @param name
     * @param collapsibleState
     */
    constructor(label, collapsibleState, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.command = command;
    }
}
exports.CodeBehaviorDependency = CodeBehaviorDependency;
class CodeBehaviorTreeProvider {
    /**
     * Constructor
     */
    constructor() {
        // Public members
        this.tree = vscode_1.window.createTreeView('behavior-code', { treeDataProvider: this });
        this.root = new CodeBehaviorDependency('Code Behavior Editor', vscode_1.TreeItemCollapsibleState.Expanded);
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        // Private members
        this._codes = [];
        vscode_1.commands.registerCommand('behaviorCode.openScript', (id) => __awaiter(this, void 0, void 0, function* () {
            // Get effective code reference
            const code = this._codes.find(c => c.id === id);
            if (!code)
                return;
            // Create document
            const doc = yield vscode_1.workspace.openTextDocument({ language: 'typescript', content: code.code });
            yield vscode_1.window.showTextDocument(doc);
        }));
    }
    /**
     * Get a TreeItem representation of the given element
     * @param element the element to translate
     */
    getTreeItem(element) {
        // Already a tree item
        return element;
    }
    /**
     * Get the children of the given element or root if no element is passed.
     * @param element the element being undefined or root in this case
     */
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            // Return root
            if (!element)
                return Promise.resolve([this.root]);
            // Return by requesting
            const result = yield fetch('http://localhost:1337/behaviorCodes');
            this._codes = (yield result.json());
            return Promise.resolve(this._codes.map(d => {
                const command = { command: 'behaviorCode.openScript', title: 'Open Script', arguments: [d.id] };
                return new CodeBehaviorDependency(d.name, vscode_1.TreeItemCollapsibleState.None, command);
            }));
        });
    }
    /**
     * Refreshes the tree
     */
    refresh() {
        this._onDidChangeTreeData.fire();
    }
}
exports.CodeBehaviorTreeProvider = CodeBehaviorTreeProvider;
//# sourceMappingURL=code-behavior.js.map