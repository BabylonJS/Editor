import * as os from "os";
import { IPty, spawn } from "node-pty";
import { Terminal, IDisposable } from "xterm";

import { Nullable, Undefinable } from "../../../shared/types";

import { Editor } from "../editor";

import { WorkSpace } from "../project/workspace";

import { Tools } from "./tools";
import { IEditorPreferences } from "./types";

export interface IEditorProcess {
	/**
	 * Defines the id of the process. This id is useful to get a process by id using the EditorProcess Api.
	 * @see EditorProcess.GetProcessById
	 */
	id: string;
	/**
	 * Defines the reference to the node-pty process that is running.
	 */
	program: IPty;
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

	/**
	 * Defines wether or not the process has been killed.
	 */
	killed: boolean;

	/**
	 * Defines the function that waits until the process has finished.
	 * This detaches the process from the list of available processes once finished.
	 */
	wait: () => Promise<void>;
	/**
	 * Kills the process and removes it from the listed editor processes.
	 */
	kill: () => void;
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
	 * Defines the reference to the terminal that logs the process data.
	 */
	terminal?: Terminal;
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
	public static RegisterProcess(editor: Nullable<Editor>, id: string, options?: IEditorProcessOptions): Nullable<IEditorProcess> {
		// Check existing
		const existing = this.GetProcessById(id);
		if (existing) {
			return existing;
		}

		// Create process.
		const shell = this._GetShell(editor);
		if (!shell) {
			const message = `Can't execute process "${id}" as no shell environment is available.`;
			editor?.console.logError(message);
			throw new Error(message);
		}

		const hasBackSlashes = shell.toLowerCase() === process.env["COMSPEC"]?.toLowerCase();

		const program = spawn(shell, this._GetArgs(), {
			cols: 80,
			rows: 30,
			name: "xterm-color",
			cwd: options?.cwd ?? WorkSpace.DirPath!,
		});

		// Create terminal
		const terminal = options?.terminal ?? this.CreateTerminal();
		const resizeListener = terminal.onResize(() => {
			program.resize(terminal.cols, terminal.rows);
		});

		if (options?.terminal) {
			program.resize(terminal.cols, terminal.rows);
		}

		// Events
		program.onData((d) => terminal.write(d));

		let onDataListener: Undefinable<IDisposable> = undefined;
		if (options?.readonly === false) {
			onDataListener = terminal.onData((d) => program.write(d));
		}

		// Write command
		if (options?.command) {
			if (hasBackSlashes) {
				program.write(`${options.command.replace(/\//g, "\\")}\n\r`);
			} else {
				program.write(`${options.command}\n\r`);
			}
		}

		// Register process
		const result: IEditorProcess = {
			id,
			program,
			options,
			terminal,
			onDataListener,
			killed: false,
			kill: () => {
				result.killed = true;
				this.RemoveProcessById(id);
			},
			wait: () => {
				return new Promise<void>((resolve, reject) => {
					program.onExit((e) => {
						e?.exitCode === 0 && !result.killed ? resolve() : reject();
						resizeListener.dispose();
						this.RemoveProcessById(id);
					});

					program.write("exit\n\r");
				});
			},
		};

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

		editorProcess.program.kill();
		editorProcess.program = spawn(shell, this._GetArgs(), {
			cols: 80,
			rows: 30,
			name: "xterm-color",
			cwd: editorProcess.options?.cwd ?? WorkSpace.DirPath!,
		});

		// Events
		editorProcess.program.onData((d) => editorProcess.terminal.write(d));

		if (editorProcess.options?.readonly === false) {
			editorProcess.onDataListener?.dispose();
			editorProcess.terminal.onData((d) => editorProcess.program.write(d));
		}

		// Write command
		if (editorProcess.options?.command) {
			editorProcess.program.write(editorProcess.options.command + "\r\n");
		}
	}

	/**
	 * Executes the given command and returns the reference to the newly created editor process object.
	 * @param command defines the command to execute in the terminal process.
	 * @param readonly defines wether or not the terminal process is in read-only.
	 * @param cwd defines the absolute path to the working directory where to process will be executed.
	 * @returns the newly created editor process object that contains the terminal, process, etc.
	 */
	public static ExecuteCommand(command: string, readonly: boolean = true, cwd?: string): Nullable<IEditorProcess> {
		return this.RegisterProcess(null, Tools.RandomId(), {
			cwd,
			command,
			readonly,
		});
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

		editorProcess.program.kill();

		if (!editorProcess.options?.terminal) {
			editorProcess.terminal.dispose();
		}

		const index = this._Processes.indexOf(editorProcess);
		if (index !== -1) {
			this._Processes.splice(index, 1);
		}
	}

	/**
	 * Creates a new terminal and returns its reference.
	 */
	public static CreateTerminal(): Terminal {
		return new Terminal({
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
	private static _GetShell(editor: Nullable<Editor>): Nullable<string> {
		if (editor) {
			return editor.getPreferences().terminalPath ?? process.env[os.platform() === "win32" ? "COMSPEC" : "SHELL"] ?? null;
		}

		const settings = JSON.parse(localStorage.getItem("babylonjs-editor-preferences") ?? "{ }") as IEditorPreferences;
		return settings.terminalPath ?? process.env[os.platform() === "win32" ? "COMSPEC" : "SHELL"] ?? null;
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
