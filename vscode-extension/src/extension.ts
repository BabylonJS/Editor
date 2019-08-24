import { ExtensionContext, workspace, Uri, window } from 'vscode';

import Sockets from './utils/socket';
import Watcher from './utils/watcher';
// import CustomFileSystem from './file-system';
import TempFileSystem from './temp-file-system';

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

    // Workspace
    const fs = new TempFileSystem();
    await fs.init();
    workspace.updateWorkspaceFolders(0, 0, { uri: Uri.parse('file:/' + Utils.TempFolder), name: 'BabylonJSEditor' });

    // Dispose
    context.subscriptions.push({
        dispose: async () => {
            Watcher.Dispose();
            await fs.clear();
        }
    });
}

/**
 * Deactivates the extension
 */
export async function deactivate (): Promise<void> {
    Sockets.Close();
}
