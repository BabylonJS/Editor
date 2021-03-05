import { IpcMainEvent } from "electron";

import { IIPCHandler } from "../handlers/ipc";
import { Settings } from "../settings";
import { IPCRequests, IPCResponses } from "../../shared/ipc";

export class GetProjectPathIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.GetProjectPath;
	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
	 */
	public handler(event: IpcMainEvent): void {
		event.sender.send(IPCResponses.GetProjectPath, Settings.OpenedFile);
	}
}

export class SetProjectPathIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.SetProjectPath;
	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
     * @param path defines the new path of the project file.
	 */
	public handler(event: IpcMainEvent, path: string): void {
		Settings.OpenedFile = path;
		event.sender.send(IPCResponses.SetProjectPath);
	}
}
