import { Observable } from "babylonjs";
import { ipcRenderer } from "electron";
import { IPtyForkOptions, IWindowsPtyForkOptions } from "node-pty";

/**
 * Creates a new node-pty instance.
 * @param command The command to run in the pty process.
 * @param options The options to pass to the pty process.
 * @returns A promise that resolves with the node-pty instance.
 */
export async function execNodePty(command: string, options: IPtyForkOptions | IWindowsPtyForkOptions): Promise<NodePtyInstance> {
    const id = await new Promise<string>((resolve) => {
        ipcRenderer.once("editor:create-node-pty", (_, id) => resolve(id));
        ipcRenderer.send("editor:create-node-pty", command, options);
    });

    if (id === null) {
        throw new Error("Failed to create node-pty instance.");
    }

    return new NodePtyInstance(id);
}

export class NodePtyInstance {
    /**
     * The id of the node-pty instance.
     */
    public readonly id: string;

    /**
     * An observable that is triggered when data is received from the pty.
     */
    public onGetDataObservable: Observable<string> = new Observable<string>();

    /**
     * Constructor.
     * @param id The id of the node-pty instance.
     */
    public constructor(id: string) {
        this.id = id;

        ipcRenderer.on(`editor:node-pty-data:${id}`, (_, data) => {
            console.log(data);
            this.onGetDataObservable.notifyObservers(data);
        });
    }

    /**
     * Writes data to the pty.
     * @param data The data to write.
     */
    public write(data: string): void {
        console.log(data);
    }

    /**
     * Kills the pty process.
     */
    public kill(): void {
        ipcRenderer.send("editor:kill-node-pty", this.id);
    }
}
