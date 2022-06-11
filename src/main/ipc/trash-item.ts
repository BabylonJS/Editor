import { IpcMainEvent, shell } from "electron";

import { IIPCHandler } from "../handlers/ipc";
import { IPCRequests, IPCResponses } from "../../shared/ipc";

export class TrashItemIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.TrashItem;
	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
     * @param absolutePath defines the aboslute path to the item to move to trash.
	 */
	public async handler(event: IpcMainEvent, absolutePath: string): Promise<void> {
        try {
            await shell.trashItem(absolutePath);
            event.sender.send(IPCResponses.TrashItem, true);
        } catch (e) {
            event.sender.send(IPCResponses.TrashItem, false);
        }
	}
}
