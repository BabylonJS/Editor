import { Component, ReactNode } from "react";

import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

import { Editor } from "../main";
import { isDarwin } from "../../tools/os";
import { execNodePty, NodePtyInstance } from "../../tools/node-pty";

export interface IEditorTerminalProps {
	editor: Editor;
}

export class EditorTerminal extends Component<IEditorTerminalProps> {
	private _terminal: Terminal | null = null;
	private _fitAddon: FitAddon | null = null;
	private _pty: NodePtyInstance | null = null;

	public render(): ReactNode {
		return (
			<div className="relative w-full h-full">
				<div className="sticky z-50 top-0 left-0 w-full h-10 bg-primary-foreground flex items-center px-2">
					<div className="text-sm text-muted-foreground">Terminal</div>
				</div>

				<div className="w-full h-[calc(100%-40px)] p-2 text-foreground overflow-hidden">
					<div ref={(r) => this._onTerminalContainerChanged(r)} className="w-full h-full overflow-hidden rounded border border-border" />
				</div>
			</div>
		);
	}

	public componentWillUnmount(): void {
		this._dispose();
	}

	private _dispose(): void {
		this._fitAddon?.dispose();
		this._fitAddon = null;

		this._terminal?.dispose();
		this._terminal = null;

		this._pty?.kill();
		this._pty = null;
	}

	private async _onTerminalContainerChanged(ref: HTMLDivElement | null): Promise<void> {
		if (!ref) {
			this._dispose();
			return;
		}

		if (!this._terminal) {
			this._terminal = new Terminal({
				fontSize: 12,
				lineHeight: 1,
				fontWeight: "400",
				fontWeightBold: "600",
				allowTransparency: true,
				letterSpacing: isDarwin() ? -6 : 0,
				fontFamily: "'Inter var', sans-serif",
				cursorBlink: true,
				convertEol: true,
				windowOptions: {
					getWinSizePixels: true,
					getCellSizePixels: true,
					getWinSizeChars: true,
				},
			});

			this._fitAddon = new FitAddon();
			this._terminal.loadAddon(this._fitAddon);

			this._terminal.open(ref);

			requestAnimationFrame(() => {
				this._fitAddon?.fit();
			});

			this._pty = await execNodePty("", { interactive: true, cwd: process.cwd(), env: process.env });

			this._pty.onGetDataObservable.add((data) => {
				this._terminal?.write(data);
			});

			this._terminal.onData((data) => {
				this._pty?.write(data);
			});

			this._terminal.onResize(({ cols, rows }) => {
				this._pty?.resize(cols, rows);
			});

			const ro = new ResizeObserver(() => {
				requestAnimationFrame(() => this._fitAddon?.fit());
			});
			ro.observe(ref);
		}
	}
}


