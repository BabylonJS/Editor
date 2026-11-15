import { clipboard } from "electron";

import { Button } from "@blueprintjs/core";
import { Component, isValidElement, ReactNode } from "react";

import { Editor } from "../main";

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../ui/shadcn/ui/context-menu";

import { UniqueNumber } from "../../tools/tools";

import { EditorConsoleProgressLogComponent } from "./console/progress-log";

export type EditorConsoleEntryLevel = "log" | "warn" | "error";

export interface IEditorConsoleEntry {
	/**
	 * Defines the number of the entry, increasing with each message logged.
	 */
	id: number;
	/**
	 * Defines the level of the message.
	 */
	level: EditorConsoleEntryLevel;
	/**
	 * Defines the text of the message.
	 */
	message: string;
	/**
	 * Defines the date the message was logged at, in milliseconds.
	 */
	time: number;
}

/**
 * Defines the maximum number of messages kept in the console.
 */
const maxConsoleEntries = 1000;

export interface IEditorConsoleProps {
	editor: Editor;
}

export interface IEditorConsoleState {
	logs: ReactNode[];
}

export class EditorConsole extends Component<IEditorConsoleProps, IEditorConsoleState> {
	private _div: HTMLDivElement | null = null;

	public constructor(props: IEditorConsoleProps) {
		super(props);

		this.state = {
			logs: [],
		};
	}

	public render(): ReactNode {
		return (
			<div className="relative">
				<div className="sticky z-50 top-0 left-0 w-full h-10 bg-primary-foreground">
					<div className="flex gap-2 h-full">
						<Button minimal icon="trash" text="Clear" onClick={() => this.setState({ logs: [] })} />
					</div>
				</div>

				<div ref={(r) => (this._div = r)} className="flex flex-col gap-1 p-2 text-foreground overflow-auto">
					{this.state.logs}
				</div>
			</div>
		);
	}

	/**
	 * Logs a message to the console.
	 * @param message defines the message to log.
	 */
	public log(message: ReactNode): void {
		this._addEntry("log", message);
		this._addLog(<div className="whitespace-break-spaces hover:bg-secondary/50 transition-all duration-300 ease-in-out">{message}</div>);
	}

	/**
	 * Logs a message to the console in yellow to indicate a warning.
	 * @param message defines the message to log.
	 */
	public warn(message: ReactNode): void {
		this._addEntry("warn", message);
		this._addLog(<div className="whitespace-break-spaces !text-yellow-500 hover:bg-secondary/50 transition-all duration-300 ease-in-out">{message}</div>);
	}

	/**
	 * Logs a message to the console in red to indicate an error.
	 * @param message defines the message to log.
	 */
	public error(message: ReactNode): void {
		this._addEntry("error", message);
		this._addLog(<div className="whitespace-break-spaces !text-red-500 hover:bg-secondary/50 transition-all duration-300 ease-in-out">{message}</div>);
	}

	/**
	 * Logs a message to the console with a spinner indicator to indicate a progress.
	 * This method returns the reference to the log component that can be modified later.
	 * @param message defines the message to log by default.
	 * @returns the reference to the progress log component that can be modified later.
	 * @example
	 *  const progress = await editor.layout.console.progress("Loading...");
	 *  progress.setState({ done: true, message: "" });
	 */
	public progress(message: ReactNode): Promise<EditorConsoleProgressLogComponent> {
		return EditorConsoleProgressLogComponent.Create(this.props.editor, message);
	}

	private _addLog(log: ReactNode): void {
		if (this.state.logs.length === maxConsoleEntries) {
			this.state.logs.shift();
		}

		let ref: HTMLDivElement | null = null;

		this.state.logs.push(
			<ContextMenu key={`log-${UniqueNumber.Get()}`}>
				<ContextMenuTrigger>
					<div ref={(r) => (ref = r)}>{log}</div>
				</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuItem onClick={() => clipboard.writeText(ref?.innerText ?? "")}>Copy</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		);

		const div = this._div?.parentElement?.parentElement;
		if (!div || !this._div) {
			return;
		}

		const limit = div.scrollHeight - div.clientHeight - 10;
		const isAtBottom = div.scrollTop >= limit;

		this.setState({ logs: this.state.logs }, () => {
			if (isAtBottom) {
				div.scrollTo(0, div.scrollHeight);
			}
		});
	}

	private _nextEntryId: number = 0;
	private _entries: IEditorConsoleEntry[] = [];

	/**
	 * Gets the id the next message logged in the console will have. Read it before an operation to get the messages it
	 * logs with `getEntriesSince`.
	 */
	public get nextEntryId(): number {
		return this._nextEntryId;
	}

	/**
	 * Returns the messages logged in the console since the given entry id, oldest first.
	 * @param id defines the id of the first entry to return.
	 */
	public getEntriesSince(id: number): IEditorConsoleEntry[] {
		return this._entries.filter((entry) => entry.id >= id);
	}

	private _addEntry(level: EditorConsoleEntryLevel, message: ReactNode): void {
		if (this._entries.length === maxConsoleEntries) {
			this._entries.shift();
		}

		this._entries.push({
			level,
			time: Date.now(),
			id: this._nextEntryId++,
			message: this._getConsoleMessageText(message),
		});
	}

	private _getConsoleMessageText(node: ReactNode): string {
		if (node === null || node === undefined || typeof node === "boolean") {
			return "";
		}

		if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
			return String(node);
		}

		if (Array.isArray(node)) {
			return node.map((child) => this._getConsoleMessageText(child)).join("");
		}

		if (isValidElement(node)) {
			return this._getConsoleMessageText((node.props as { children?: ReactNode }).children);
		}

		return "";
	}
}
