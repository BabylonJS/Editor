import { ExtensionContext, workspace, Uri, window } from 'vscode';

import Sockets from './utils/socket';
import CustomFileSystem from './file-system';
import BabylonJSEditorPlugin from './plugin';

import Utils from './utils/utils';

/**
 * Activtes the extension
 */
export function activate (context: ExtensionContext): void {
    // Misc.
    Utils.ExtensionPath = context.extensionPath;

    // Connect sockets
    Sockets.Connect();

    // Workspace
    context.subscriptions.push(workspace.registerFileSystemProvider('babylonjs-editor', new CustomFileSystem(), { isCaseSensitive: true, isReadonly: false }));
    workspace.updateWorkspaceFolders(0, 0, { uri: Uri.parse('babylonjs-editor:/'), name: "BabylonJSEditor" });

    // Plugin
    context.subscriptions.push(window.createTreeView('babylonjsEditorPlugin', { treeDataProvider: new BabylonJSEditorPlugin() }));
}

/**
 * Deactivates the extension
 */
export function deactivate (): void {
    Sockets.Close();
}
