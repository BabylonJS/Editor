import { ipcRenderer } from "electron";

import { Tools } from "babylonjs";

/**
 * Sends an IPC message to the main process and waits for a response.
 * @param id The id of the IPC message.
 * @param args The arguments to pass to the IPC message.
 * @returns A promise that resolves with the response from the main process.
 */
export function ipcSendAsync<T>(id: string, ...args: any[]): Promise<T> {
    return new Promise((resolve) => {
        ipcRenderer.once(id, (_, result) => resolve(result));
        ipcRenderer.send(id, ...args);
    });
}

/**
 * Sends an IPC message to the main process and waits for a response.
 * @param id The id of the IPC message.
 * @param args The arguments to pass to the IPC message.
 * @returns A promise that resolves with the response from the main process.
 */
export function ipcSendAsyncWithMessageId<T>(id: string, ...args: any[]): Promise<T> {
    return new Promise((resolve) => {
        const messageId = Tools.RandomId();

        ipcRenderer.once(messageId, (_, result) => resolve(result));
        ipcRenderer.send(id, messageId, ...args);
    });
}
