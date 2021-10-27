import * as os from "os";
import { IPty, spawn } from "node-pty";
import { Terminal, IDisposable } from "xterm";

import { Nullable, Undefinable } from "../../../shared/types";

import { Editor } from "../editor";

import { WorkSpace } from "../project/workspace";

export interface IEditorProcess {
	/**
	 * Defines the id of the process. This id is useful to get a process by id using the EditorProcess Api.
	 * @see EditorProcess.GetProcessById
	 */
	id: string;
	/**
	 * Defines the reference to the node-pty process that is running.
	 */
	process: IPty;
	/**
	 * Defines the reference to the terminal that logs the process data.
	 */
	terminal: Terminal;
	/**
	 * Defines the options of the process.
	 */
	options?: IEditorProcessOptions;

	/**
	 * Defines the reference to the data listener.s
	 */
	onDataListener?: IDisposable;
}

export interface IEditorProcessOptions {
	/**
	 * Defines the optional working directory.
	 */
	cwd?: string;
	/**
	 * Defines the optional command to write once the process has been created.
	 */
	command?: string;
	/**
	 * Defines wether or not the process is readonly mode.
	 */
	readonly?: boolean;
}

export class EditorProcess {
	private static _Processes: IEditorProcess[] = [];

	/**
	 * Registers a new process to the editor identified by the given id with the given options.
	 * If the process already exists, returns the reference to the existing editor process object.
	 * @param editor defines the reference to the editor.
	 * @param id defines the id of the process.
	 * @param options defines the optional options that can be passed to the process and terminal.
	 * @returns the newly created editor process object that contains the terminal, process, etc.
	 * @example EditorProcess.RegisterProcess(editor, "watch-webpack", { cwd: WorkSpace.DirPath, command: "npm run watch" });
	 */
	public static RegisterProces(editor: Editor, id: string, options?: IEditorProcessOptions): Nullable<IEditorProcess> {
		// Check existing
		const existing = this.GetProcessById(id);
		if (existing) {
			return existing;
		}

		// Create process.
        const shell = this._GetShell(editor);
		if (!shell) {
			return null;
		}

		const p = spawn(shell, this._GetArgs(), {
			cols: 80,
            rows: 30,
            name: "xterm-color",
            cwd: options?.cwd ?? WorkSpace.DirPath!,
        });

		// Create terminal
        const terminal = new Terminal({
            fontFamily: "Consolas, 'Courier New', monospace",
            fontSize: 12,
            fontWeight: "normal",
            cursorStyle: "block",
            cursorWidth: 1,
            drawBoldTextInBrightColors: true,
            fontWeightBold: "bold",
            letterSpacing: -4,
            cols: 80,
            lineHeight: 1,
            rendererType: "canvas",
            allowTransparency: true,
            theme: {
                background: "#111111"
            },
        });

		// Events
		p.onData((d) => terminal.write(d));

		let onDataListener: Undefinable<IDisposable> = undefined;
		if (options?.readonly === false) {
			onDataListener = terminal.onData((d) => p.write(d));
		}

		// Write command
		if (options?.command) {
			p.write(options.command + "\r\n");
		}

		// Register process
		const result: IEditorProcess = { id, process: p, terminal, onDataListener };
		this._Processes.push(result);

		return result;
	}

	/**
	 * Restarts the process identified by the given id if exists.
	 * @param editor defines the reference to the editor.
	 * @param id defines the id of the process to restart if exists.
	 */
	public static RestartProcessById(editor: Editor, id: string): void {
		const editorProcess = this.GetProcessById(id);
		if (!editorProcess) {
			return;
		}


		const shell = this._GetShell(editor);
		if (!shell) {
			return;
		}

		editorProcess.process.kill();
		editorProcess.process = spawn(shell, this._GetArgs(), {
			cols: 80,
            rows: 30,
            name: "xterm-color",
            cwd: editorProcess.options?.cwd ?? WorkSpace.DirPath!,
        });

		// Events
		editorProcess.process.onData((d) => editorProcess.terminal.write(d));

		if (editorProcess.options?.readonly === false) {
			editorProcess.onDataListener?.dispose();
			editorProcess.terminal.onData((d) => editorProcess.process.write(d));
		}

		// Write command
		if (editorProcess.options?.command) {
			editorProcess.process.write(editorProcess.options.command + "\r\n");
		}
	}

	/**
	 * Kills and removes the editor process identified by the given id if exists.
	 * @param id defines the id of the editor process to remove if exists.
	 */
	public static RemoveProcessById(id: string): void {
		const editorProcess = this.GetProcessById(id);
		if (!editorProcess) {
			return;
		}

		editorProcess.process.kill();
		editorProcess.terminal.dispose();

		const index = this._Processes.indexOf(editorProcess);
		if (index !== -1) {
			this._Processes.splice(index, 1);
		}
	}

	/**
	 * Returns the reference to the editor process identified by the given id if exists.
	 * @param id defines the id of the process to retrieve if exists.
	 * @returns the reference to the editor process object if exists.
	 */
	public static GetProcessById(id: string): Nullable<IEditorProcess> {
		return this._Processes.find((p) => p.id === id) ?? null;
	}

	/**
	 * Returns the path to the shell to run.
	 */
	private static _GetShell(editor: Editor): Nullable<string> {
        return editor.getPreferences().terminalPath ?? process.env[os.platform() === "win32" ? "COMSPEC" : "SHELL"] ?? null;
	}

	/**
	 * Returns the list of arguments for the shell.
	 */
	private static _GetArgs(): string[] {
		const shellArguments: string[] = [];

        if (os.platform() === "darwin") {
            shellArguments.push("-l");
        }

		return shellArguments;
	}
}
