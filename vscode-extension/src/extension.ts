import { ExtensionContext, workspace, Uri, window } from 'vscode';

import Sockets from './socket';
import CustomFileSystem from './file-system';

/**
 * Activtes the extension
 */
export function activate (context: ExtensionContext) {
    // Connect sockets
    Sockets.Connect();

    // Providers
    workspace.registerFileSystemProvider('babylonjs-editor', new CustomFileSystem(), { isCaseSensitive: true, isReadonly: false });
    // workspace.updateWorkspaceFolders(0, 0, { uri: Uri.parse('babylonjs-editor:/'), name: "BabylonJS Editor" });
}

/**
 * Deactivates the extension
 */
export function deactivate () {
    Sockets.Close();
}
