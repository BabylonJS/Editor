import Socket from './socket';
import { IGenerator } from './types';
import Document from './document';

/**
 * Inits the plugin.
 */
export async function init (generator: IGenerator): Promise<void> {
    // Connect server
    await Socket.Connect();
    Socket.OnClientConnected = () => Document.Init(generator);

    // Bind events
    generator.onPhotoshopEvent("imageChanged", () => Document.OnDocumentChanged(generator));
}

/**
 * Closes the plugin.
 */
export async function close (generator: IGenerator): Promise<void> {
    await Socket.Close();
}