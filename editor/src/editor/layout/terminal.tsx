import { dirname } from "path/posix";
import { Component, ReactNode } from "react";

import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

import { Editor } from "../main";
import { execNodePty, NodePtyInstance } from "../../tools/node-pty";
import { projectConfiguration, onProjectConfigurationChangedObservable } from "../../project/configuration";
import { isDarwin } from "../../export";

export interface IEditorTerminalProps {
	editor: Editor;
}

export interface IEditorTerminalState {
	hasProject: boolean;
}

export class EditorTerminal extends Component<IEditorTerminalProps, IEditorTerminalState> {
	private _terminal: Terminal | null = null;
	private _fitAddon: FitAddon | null = null;
	private _pty: NodePtyInstance | null = null;
	private _projectPath: string | null = null;

	constructor(props: IEditorTerminalProps) {
		super(props);
		this.state = {
			hasProject: projectConfiguration.path !== null,
		};
	}

	public render(): ReactNode {
		return (
			<div className="relative w-full h-full">
				<div className="sticky z-50 top-0 left-0 w-full h-10 bg-primary-foreground flex items-center px-2">
					<div className="text-sm text-muted-foreground">Terminal</div>
				</div>

				<div className="w-full h-[calc(100%-40px)] p-2 overflow-hidden">
					{this.state.hasProject ? (
						<div ref={(r) => this._onTerminalContainerChanged(r)} className="w-full h-full overflow-hidden" />
					) : (
						<div className="flex items-center justify-center w-full h-full text-muted-foreground">
							<div className="text-center">
								<div className="text-lg mb-2">No Project Open</div>
								<div className="text-sm">Open a project to use the terminal</div>
							</div>
						</div>
					)}
				</div>
			</div>
		);
	}

	public componentDidMount(): void {
		// Set initial project path if available
		if (projectConfiguration.path) {
			this._projectPath = projectConfiguration.path;
		}

		onProjectConfigurationChangedObservable.add((config) => {
			const newPath = config.path;
			if (newPath && newPath !== this._projectPath) {
				this._projectPath = newPath;

				// Update state to trigger re-render and show terminal
				this.setState({ hasProject: true });

				// Restart terminal with new project path only if terminal is already initialized
				if (this._terminal && this._pty) {
					this._restartTerminal();
				}
			}
		});
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

	private _onTerminalContainerChanged(ref: HTMLDivElement | null): void {
		if (!ref) {
			this._dispose();
			return;
		}

		if (!this._terminal) {
			this._initializeTerminal(ref).catch((error) => {
				console.error("Failed to initialize terminal:", error);
				this._dispose();
			});
		}
	}

	private async _initializeTerminal(ref: HTMLDivElement): Promise<void> {
		this._terminal = new Terminal({
			fontSize: 14,
			lineHeight: 1,
			letterSpacing: isDarwin() ? -6 : 0,
			fontWeight: "400",
			fontWeightBold: "600",
			fontFamily: "Arial",
			allowTransparency: true,
			cursorBlink: true,
			convertEol: true,
			theme: {
				background: "#0000",
				foreground: "#0000",
				selectionBackground: "rgba(255, 255, 255, 0.3)",
				selectionForeground: "#d4d4d4",
			},
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
			if (this._terminal && this._fitAddon) {
				this._fitAddon.fit();
			}
		});

		const cwd = this._projectPath ? dirname(this._projectPath) : undefined;
		this._pty = await execNodePty("", { interactive: true, cwd } as any);

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
			requestAnimationFrame(() => {
				if (this._terminal && this._fitAddon) {
					this._fitAddon.fit();
				}
			});
		});
		ro.observe(ref);
	}

	private async _restartTerminal(): Promise<void> {
		if (!this._terminal || !this._pty) {
			return;
		}

		// Kill the old PTY
		this._pty.kill();

		// Create new PTY with updated project path
		const cwd = this._projectPath ? dirname(this._projectPath) : undefined;
		this._pty = await execNodePty("", { interactive: true, cwd } as any);

		// Reconnect event handlers
		this._pty.onGetDataObservable.add((data) => {
			this._terminal?.write(data);
		});

		// Update terminal size
		if (this._terminal && this._fitAddon) {
			this._pty.resize(this._terminal.cols, this._terminal.rows);
		}

		// Clear terminal and show new prompt
		this._terminal.clear();
	}
}
