import { ExtensionContext, workspace } from 'vscode';

import Sockets from './socket';
import CustomTextDocument from './document';
import CodeBehaviorTreeProvider from './code-behavior';

/**
 * Activtes the extension
 */
export function activate (context: ExtensionContext) {
    // Connect sockets
    Sockets.Connect();

    // Events
    workspace.onDidChangeTextDocument(e => {

    });

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
