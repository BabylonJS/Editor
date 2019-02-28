import { ExtensionContext, workspace, Uri, window } from 'vscode';

import Sockets from './socket';
import CustomFileSystem from './file-system';
import BabylonJSEditorPlugin from './plugin';

/**
 * Activtes the extension
 */
export function activate (context: ExtensionContext): void {
    // Connect sockets
    Sockets.Connect();

    // Workspace
    workspace.registerFileSystemProvider('babylonjs-editor', new CustomFileSystem(), { isCaseSensitive: true, isReadonly: false });
    workspace.updateWorkspaceFolders(0, 0, { uri: Uri.parse('babylonjs-editor:/'), name: "BabylonJSEditor" });

    // Plugin
    window.createTreeView('babylonjsEditorPlugin', { treeDataProvider: new BabylonJSEditorPlugin(context.extensionPath) });
}

/**
 * Deactivates the extension
 */
export function deactivate (): void {
    Sockets.Close();
}
