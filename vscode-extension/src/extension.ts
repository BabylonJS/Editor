import { ExtensionContext, commands, window } from 'vscode';

import { CodeBehaviorTreeProvider } from './code-behavior';

/**
 * Activtes the extension
 */
export function activate(context: ExtensionContext) {
    // Create behavior code tree provider
    const behaviorCode = new CodeBehaviorTreeProvider();
}

/**
 * Deactivates the extension
 */
export function deactivate() {
    // TODO: close sockets etc.
    debugger;
}
