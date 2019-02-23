"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const code_behavior_1 = require("./code-behavior");
const socket_1 = require("./socket");
const document_1 = require("./document");
/**
 * Activtes the extension
 */
function activate(context) {
    // Connect sockets
    socket_1.default.Connect();
    // Text provider
    const textProvider = new document_1.default();
    vscode_1.workspace.registerTextDocumentContentProvider('babylonjs-editor', textProvider);
    // Create behavior code tree provider
    new code_behavior_1.default();
}
exports.activate = activate;
/**
 * Deactivates the extension
 */
function deactivate() {
    // TODO: close sockets etc.
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map