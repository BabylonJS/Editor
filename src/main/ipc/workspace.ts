import { IpcMainEvent } from "electron";

import { IIPCHandler } from "../handlers/ipc";
import { Settings } from "../settings";
import { IPCRequests, IPCResponses } from "../../shared/ipc";

export class GetWorkspacePathIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.GetWorkspacePath;
	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
	 */
	public handler(event: IpcMainEvent): void {
		event.sender.send(IPCResponses.GetWorkspacePath, Settings.WorkspacePath);
	}
}

export class SetWorkspacePathIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.SetWorkspacePath;
	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
     * @param path defines the new path of the project file.
	 */
	public handler(event: IpcMainEvent, path: string | null): void {
		Settings.WorkspacePath = path;
		Settings.OpenedFile = null;
		event.sender.send(IPCResponses.SetWorkspacePath);
	}
}
