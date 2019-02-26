import { ExtensionContext, workspace, Uri } from 'vscode';

import Sockets from './socket';
import CustomFileSystem from './file-system';

/**
 * Activtes the extension
 */
export function activate (context: ExtensionContext): void {
    // Connect sockets
    Sockets.Connect();

    // Providers
    workspace.registerFileSystemProvider('babylonjs-editor', new CustomFileSystem(), { isCaseSensitive: true, isReadonly: false });
    workspace.updateWorkspaceFolders(0, 0, { uri: Uri.parse('babylonjs-editor:/'), name: "BabylonJSEditor" });
}

/**
 * Deactivates the extension
 */
export function deactivate (): void {
    Sockets.Close();
}
