import { IpcMainEvent } from "electron";

import { IIPCHandler } from "../handlers/ipc";
import { IPCRequests, IPCResponses } from "../../shared/ipc";
import { GameServer, IServerHttpsOptions } from "../tools/server";

export class StartWebServerIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.StartGameServer;
	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
     * @param path defines the path of the web server to serve files.
     * @param port defines the port of the server to listen.
	 */
	public async handler(event: IpcMainEvent, path: string, port: number, https?: IServerHttpsOptions): Promise<void> {
		try {
			GameServer.RunServer(path, port, https);
			event.sender.send(IPCResponses.StartGameServer, { ips: GameServer.GetIps() });
		} catch (e) {
			event.sender.send(IPCResponses.StartGameServer, { error: e.message });
		}
	}
}