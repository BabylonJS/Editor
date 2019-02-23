"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const code_behavior_1 = require("./code-behavior");
/**
 * Activtes the extension
 */
function activate(context) {
    // Create behavior code tree provider
    const behaviorCode = new code_behavior_1.CodeBehaviorTreeProvider();
}
exports.activate = activate;
/**
 * Deactivates the extension
 */
function deactivate() {
    // TODO: close sockets etc.
    debugger;
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map