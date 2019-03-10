import { ExtensionContext, workspace, Uri, window } from 'vscode';

import Sockets from './utils/socket';
import CustomFileSystem from './file-system';
import TempFileSystem from './temp-file-system';
import BabylonJSEditorPlugin from './plugin';

import Utils from './utils/utils';

/**
 * Activtes the extension
 */
export async function activate (context: ExtensionContext): Promise<void> {
    // Misc.
    Utils.ExtensionPath = context.extensionPath;

    // Connect sockets
    Sockets.Connect();

    // Workspace
    // context.subscriptions.push(workspace.registerFileSystemProvider('babylonjs-editor', new CustomFileSystem(), { isCaseSensitive: true, isReadonly: false }));
    // workspace.updateWorkspaceFolders(0, 0, { uri: Uri.parse('babylonjs-editor:/'), name: "BabylonJSEditor" });

    const fs = new TempFileSystem();
    await fs.init();
    workspace.updateWorkspaceFolders(0, 0, { uri: Uri.parse('file:/' + Utils.TempFolder), name: 'BabylonJSEditor' });
    context.subscriptions.push({ dispose: () => TempFileSystem.Watchers.forEach(f => f.dispose()) });

    // Plugin
    context.subscriptions.push(window.createTreeView('babylonjsEditorPlugin', { treeDataProvider: new BabylonJSEditorPlugin() }));
}

/**
 * Deactivates the extension
 */
export function deactivate (): void {
    Sockets.Close();
}
