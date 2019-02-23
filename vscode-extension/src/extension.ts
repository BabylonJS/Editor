import { ExtensionContext, workspace, window } from 'vscode';

import CodeBehaviorTreeProvider from './code-behavior';
import Sockets from './socket';
import CustomTextDocument from './document';

/**
 * Activtes the extension
 */
export function activate (context: ExtensionContext) {
    // Connect sockets
    Sockets.Connect();

    // Text provider
    const textProvider = new CustomTextDocument();
    workspace.registerTextDocumentContentProvider('babylonjs-editor', textProvider);

    // Create behavior code tree provider
    new CodeBehaviorTreeProvider();
}

/**
 * Deactivates the extension
 */
export function deactivate () {
    // TODO: close sockets etc.
}
