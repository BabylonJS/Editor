import { ipcRenderer, remote } from "electron";
import { IPCRequests, IPCResponses } from "../../../shared/ipc";

export class IPCTools {
    /**
     * Calls the host with the given request and arguments.
     * @param request the name of the request to send to host.
     * @param args the arguments to send to host.
     * @warning should be called only for requests that send responses.
     */
    public static CallWithPromise<T>(request: string, ...args: any[]): Promise<T> {
        return new Promise<T>((resolve) => {
            ipcRenderer.once(request, (_, data) => resolve(data as T));
            ipcRenderer.send(request, ...args);
        });
    }

    /**
     * Sends the given data to the window id with the given message id.
     * @param popupId the id of the window to send the message.
     * @param id the id of the message.
     * @param data the data to send to the window.
     */
    public static SendWindowMessage<T>(popupId: number, id: string, data: any = { }): Promise<{ id: string; data: T; }> {
        return new Promise<{ id: string; data: T; }>((resolve) => {
            ipcRenderer.once(IPCResponses.SendWindowMessage, (_, data) => data.id === id && resolve(data));
            ipcRenderer.send(IPCRequests.SendWindowMessage, popupId, {
                id,
                data,
            });
        });
    }

    /**
     * Executes the given action in the main editor window with the given arguments.
     * @param args the editor's function arguments.
     * @warning take care with arguments.
     */
    public static async ExecuteEditorFunction<T>(functionName: string, ...args: any[]): Promise<{ id: string; data: T; }> {
        return this.SendWindowMessage(-1, "execute-editor-function", {
            popupId: remote.getCurrentWindow().id,
            functionName,
            args,
        });
    }

    /**
     * Sends the given parameters with the given request to the host.
     * @param request the name of the request to send to host.
     * @param args the arguments to send to host.
     */
    public static Send(request: string, ...args: any[]): void {
        ipcRenderer.send(request, ...args);
    }
}