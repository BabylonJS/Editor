"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const socket_1 = require("./socket");
class CustomTextDocument {
    constructor() {
        // Public members
        this.onDidChangeEmitter = new vscode_1.EventEmitter();
        this.onDidChange = this.onDidChangeEmitter.event;
    }
    /**
     * Provides the text to draw to the editor
     * @param uri the uri containing the text
     */
    provideTextDocumentContent(uri) {
        const s = socket_1.default.codeScripts.find(cs => cs.name === uri.path);
        if (s)
            return s.code;
        return uri.path;
    }
}
exports.default = CustomTextDocument;
//# sourceMappingURL=document.js.map