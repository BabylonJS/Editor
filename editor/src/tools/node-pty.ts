import { randomUUID } from "crypto";
import { ipcRenderer } from "electron";
import { IPtyForkOptions, IWindowsPtyForkOptions } from "node-pty";

import { Observable } from "babylonjs";

/**
 * Creates a new node-pty instance.
 * @param command The command to run in the pty process.
 * @param options The options to pass to the pty process.
 * @returns A promise that resolves with the node-pty instance.
 */
export async function execNodePty(command: string, options: IPtyForkOptions | IWindowsPtyForkOptions = {}): Promise<NodePtyInstance> {
    const id = randomUUID();

    await new Promise<void>((resolve) => {
        ipcRenderer.once(`editor:create-node-pty-${id}`, () => resolve());
        ipcRenderer.send("editor:create-node-pty", command, id, options);
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

    private _exited: boolean = false;

    /**
     * Constructor.
     * @param id The id of the node-pty instance.
     */
    public constructor(id: string) {
        this.id = id;

        ipcRenderer.once(`editor:node-pty-exit:${this.id}`, () => {
            this._exited = true;
        });

        ipcRenderer.on(`editor:node-pty-data:${id}`, (_, data) => {
            // console.log(data);
            this.onGetDataObservable.notifyObservers(data);
        });
    }

    /**
     * Writes data to the pty.
     * @param data The data to write.
     */
    public write(data: string): void {
        ipcRenderer.send("editor:node-pty-write", this.id, data);
    }

    /**
     * Kills the pty process.
     */
    public kill(): void {
        ipcRenderer.send("editor:kill-node-pty", this.id);
    }

    /**
     * Waits until the 
     */
    public wait(): Promise<void> {
        if (this._exited) {
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            ipcRenderer.once(`editor:node-pty-exit:${this.id}`, () => resolve());
        });
    }

    /**
     * Resizes the node-pty process in case it is used using xterm.
     */
    public resize(cols: number, rows: number): void {
        ipcRenderer.send("editor:resize-node-pty", this.id, cols, rows);
    }
}
