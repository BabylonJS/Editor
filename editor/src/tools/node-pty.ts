import { randomUUID } from "crypto";
import { ipcRenderer } from "electron";
import { IPtyForkOptions, IWindowsPtyForkOptions } from "node-pty";

import { Observable } from "babylonjs";

import { isWindows } from "./os";
import { tryGetTerminalFromLocalStorage } from "./local-storage";

export interface INodePtyExecutableOptions {
	/**
	 * Defines wether or not the shell stays open for the user to type commands. The given command is then not run.
	 */
	interactive?: boolean;
	/**
	 * Defines the absolute path to an executable to spawn instead of the shell of the user. The process is then
	 * always interactive: the given command is ignored and the executable runs until it exits or is killed.
	 */
	file?: string;
	/**
	 * Defines the arguments given to the executable set in "file". On Windows, they can also be given as an already
	 * escaped command line.
	 */
	args?: string[] | string;
}

/**
 * Creates a new node-pty instance.
 * @param command The command to run in the pty process.
 * @param options The options to pass to the pty process.
 * @returns A promise that resolves with the node-pty instance.
 */
export async function execNodePty(command: string, options: (IPtyForkOptions | IWindowsPtyForkOptions) & INodePtyExecutableOptions = {}): Promise<NodePtyInstance> {
	const id = randomUUID();

	let forcedShell: string | null = null;
	if (isWindows()) {
		forcedShell = tryGetTerminalFromLocalStorage();
	}

	await new Promise<void>((resolve) => {
		ipcRenderer.once(`editor:create-node-pty-${id}`, () => resolve());
		ipcRenderer.send("editor:create-node-pty", command, id, options, forcedShell);
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
	 * An observable that is triggered when the pty process is killed.
	 */
	public onKillObservable: Observable<void> = new Observable<void>();
	/**
	 * An observable that is triggered when data is received from the pty.
	 */
	public onGetDataObservable: Observable<string> = new Observable<string>();
	/**
	 * An observable that is triggered when the pty process exited, with its exit code.
	 */
	public onExitObservable: Observable<number> = new Observable<number>();

	private _exited: boolean = false;
	private _exitCode: number = -1;

	/**
	 * Constructor.
	 * @param id The id of the node-pty instance.
	 */
	public constructor(id: string) {
		this.id = id;

		const onData = (_: unknown, data: string) => {
			this.onGetDataObservable.notifyObservers(data);
		};

		ipcRenderer.on(`editor:node-pty-data:${id}`, onData);

		ipcRenderer.once(`editor:node-pty-exit:${this.id}`, (_, code) => {
			this._exited = true;
			this._exitCode = code;

			ipcRenderer.off(`editor:node-pty-data:${id}`, onData);
			this.onExitObservable.notifyObservers(code);
		});
	}

	/**
	 * Gets wether or not the pty process exited.
	 */
	public get exited(): boolean {
		return this._exited;
	}

	/**
	 * Writes data to the pty.
	 * @param data The data to write.
	 */
	public write(data: string): void {
		if (this._exited) {
			return;
		}
		ipcRenderer.send("editor:node-pty-write", this.id, data);
	}

	/**
	 * Kills the pty process.
	 */
	public kill(): void {
		if (this._exited) {
			return;
		}

		this.onKillObservable.notifyObservers();

		ipcRenderer.send("editor:kill-node-pty", this.id);
	}

	/**
	 * Waits until the
	 */
	public wait(): Promise<number> {
		if (this._exited) {
			return Promise.resolve(this._exitCode);
		}

		return new Promise<number>((resolve) => {
			ipcRenderer.once(`editor:node-pty-exit:${this.id}`, () => resolve(this._exitCode));
		});
	}

	/**
	 * Resizes the node-pty process in case it is used using xterm.
	 */
	public resize(cols: number, rows: number): void {
		if (this._exited) {
			return;
		}
		ipcRenderer.send("editor:resize-node-pty", this.id, cols, rows);
	}
}
