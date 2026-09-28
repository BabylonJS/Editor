import { tmpdir } from "os";
import { join as joinNative } from "path";
import { dirname, join } from "path/posix";
import { randomBytes, randomUUID } from "crypto";
import { pathExists } from "fs-extra";
import { clipboard, ipcRenderer, shell, webUtils } from "electron";

import { Component, DragEvent, ReactNode } from "react";
import { toast } from "sonner";

import { Terminal, ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";

import { IoAdd, IoCloseOutline, IoEllipsisHorizontal } from "react-icons/io5";

import { Button } from "../../ui/shadcn/ui/button";
import { SpinnerUIComponent } from "../../ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/shadcn/ui/tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../../ui/shadcn/ui/dropdown-menu";

import { isWindows } from "../../tools/os";
import { openSingleFileDialog } from "../../tools/dialog";
import { execNodePty, NodePtyInstance } from "../../tools/node-pty";
import {
	tryGetAssistantAgentFromLocalStorage,
	tryGetAssistantExecutablePathFromLocalStorage,
	trySetAssistantAgentInLocalStorage,
	trySetAssistantExecutablePathInLocalStorage,
} from "../../tools/local-storage";

import { removeAgentData } from "../../project/agent-data";
import { onProjectConfigurationChangedObservable, projectConfiguration } from "../../project/configuration";

import type { IEditorMcpServer } from "../../mcp/mcp";

import { Editor } from "../main";

import type { AssistantAssetsWatcher } from "./assistant/watcher";
import { EditorAssistantIcon } from "./assistant/icon";
import { IAssistantExecutable } from "./assistant/executable";
import { assistantAgents, EditorAssistantAgentId, getAssistantAgent, IEditorAssistantAgent } from "./assistant/agents";
import { getAssistantWorkStateFromCodexTitle, getCodexArguments, getCodexEnvironment } from "./assistant/codex";
import { installAssistantSkillsInProject } from "./assistant/skills";
import {
	getAssistantMcpServerScriptPath,
	getAssistantPluginDirectory,
	getClaudeArguments,
	getWindowsBatchCommandLine,
	IAssistantMcpConfigurationOptions,
	supportsAssistantPlugin,
	writeAssistantConfiguration,
} from "./assistant/config";
import {
	EditorAssistantWorkState,
	getAssistantWorkStateAfterHook,
	getAssistantWorkStateAfterInput,
	IAssistantHookInput,
	IAssistantHooksServer,
	isAssistantInputNotification,
	startAssistantHooksServer,
	supportsAssistantHooks,
} from "./assistant/hooks";

/**
 * Defines the environment variables of the editor that must not reach the agent: an internal flag of the editor
 * (DEBUG, set in development), variables that would make it believe it runs in another application or as Node.js, and
 * the markers another Claude Code session gives to the processes it starts, for an editor started from one.
 */
const ignoredEnvironmentVariables = [
	"DEBUG",
	"ELECTRON_RUN_AS_NODE",
	"TERM_PROGRAM",
	"TERM_PROGRAM_VERSION",
	"CLAUDECODE",
	"CLAUDE_PID",
	"CLAUDE_EFFORT",
	"CLAUDE_CODE_ENTRYPOINT",
	"CLAUDE_CODE_CHILD_SESSION",
	"CLAUDE_CODE_EXECPATH",
	"CLAUDE_CODE_MESSAGING_SOCKET",
	"CLAUDE_CODE_MESSAGING_TOKEN",
	"CLAUDE_CODE_SESSION_ATTENDED",
	"CLAUDE_CODE_SESSION_ID",
	"CLAUDE_CODE_SSE_PORT",
];

/**
 * Defines the environment variables starting with "CODEX_" that are settings of the user. The others are the markers
 * a Codex session gives to the processes it starts, for an editor started from one: they don't reach the agent either.
 */
const userCodexEnvironmentVariables = ["CODEX_HOME", "CODEX_CA_CERTIFICATE"];

export type EditorAssistantStatus = "idle" | "no-project" | "searching" | "not-found" | "starting" | "running" | "exited" | "error";

export interface IEditorAssistantProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
	/**
	 * Defines wether or not the panel of the assistant is open. The session starts the first time it opens and keeps
	 * running while it is closed.
	 */
	open: boolean;
}

export interface IEditorAssistantState {
	status: EditorAssistantStatus;
	agent: EditorAssistantAgentId;
	executable: IAssistantExecutable | null;
	error: string | null;
	exitCode: number | null;
	activity: string | null;
	dragOver: boolean;
}

export class EditorAssistant extends Component<IEditorAssistantProps, IEditorAssistantState> {
	private _terminal: Terminal | null = null;
	private _fitAddon: FitAddon | null = null;
	private _webglAddon: WebglAddon | null = null;
	private _terminalContainer: HTMLDivElement | null = null;
	private _resizeObserver: ResizeObserver | null = null;
	private _themeObserver: MutationObserver | null = null;

	private _pty: NodePtyInstance | null = null;
	private _mcpServer: IEditorMcpServer | null = null;
	private _hooksServer: IAssistantHooksServer | null = null;
	private _watcher: AssistantAssetsWatcher | null = null;
	private _projectPath: string | null = null;
	private _starting: boolean = false;
	private _sessionAgent: EditorAssistantAgentId | null = null;

	// Mirrors the state of the editor, which is updated asynchronously, for the events that follow each other.
	private _workState: EditorAssistantWorkState = "idle";
	// A new notification each time the assistant waits: sonner drops a notification created again with the id of one it is closing.
	private _inputToastId: string | number | null = null;

	private _sessionId: string = randomUUID();
	private _activityTimeout: ReturnType<typeof setTimeout> | null = null;
	private _projectConfigurationObserver: ReturnType<typeof onProjectConfigurationChangedObservable.add> | null = null;

	public constructor(props: IEditorAssistantProps) {
		super(props);

		this.state = {
			status: "idle",
			agent: getAssistantAgent(tryGetAssistantAgentFromLocalStorage()).id,
			executable: null,
			error: null,
			exitCode: null,
			activity: null,
			dragOver: false,
		};
	}

	public render(): ReactNode {
		const showTerminal = this.state.status === "running" || this.state.status === "exited";

		return (
			<div className="flex flex-col w-full h-full bg-background text-foreground border-l border-border/50">
				{this._getHeader()}

				<div
					className={`relative w-full h-full min-h-0 ${this.state.dragOver ? "outline outline-2 -outline-offset-2 outline-primary/60" : ""}`}
					onDragOver={(ev) => this._handleDragOver(ev)}
					onDragLeave={() => this.setState({ dragOver: false })}
					onDrop={(ev) => this._handleDrop(ev)}
				>
					<div className={`absolute inset-0 p-2 overflow-hidden ${showTerminal ? "" : "invisible"}`}>
						<div ref={(r) => (this._terminalContainer = r)} className="w-full h-full overflow-hidden" />
					</div>

					{!showTerminal && <div className="absolute inset-0 flex items-center justify-center p-6 overflow-y-auto">{this._getPlaceholder()}</div>}

					{this.state.status === "exited" && this._getExitedBar()}
				</div>
			</div>
		);
	}

	public componentDidMount(): void {
		this._projectConfigurationObserver = onProjectConfigurationChangedObservable.add((configuration) => {
			if (configuration.path === this._projectPath) {
				return;
			}

			if (this._pty || this.props.open) {
				this.restart(false);
			}
		});

		if (this.props.open) {
			this.start(false);
		}
	}

	public componentDidUpdate(prevProps: IEditorAssistantProps): void {
		if (!this.props.open || prevProps.open) {
			return;
		}

		if (this.state.status === "idle" || this.state.status === "no-project") {
			this.start(false);
		} else {
			requestAnimationFrame(() => {
				this._fit();
				this.focus();
			});
		}
	}

	public componentWillUnmount(): void {
		onProjectConfigurationChangedObservable.remove(this._projectConfigurationObserver);

		this._stopSession();
		this._disposeTerminal();

		this._mcpServer?.close();
		this._mcpServer = null;
	}

	/**
	 * Gets wether or not a session of the agent is running in the assistant.
	 */
	public get isRunning(): boolean {
		return this.state.status === "running";
	}

	/**
	 * Focuses the terminal of the assistant so the user can type directly.
	 */
	public focus(): void {
		this._terminal?.focus();
	}

	/**
	 * Starts a session of the agent chosen by the user in the root folder of the project, connected to this editor window.
	 * @param resume defines wether or not to continue the last conversation of the project instead of starting a new one.
	 */
	public async start(resume: boolean): Promise<void> {
		if (this._starting || this._pty) {
			return;
		}

		this._projectPath = projectConfiguration.path;
		if (!this._projectPath) {
			return this.setState({ status: "no-project" });
		}

		this._starting = true;

		try {
			this.setState({ status: "searching", error: null, exitCode: null });

			const agent = getAssistantAgent(this.state.agent);
			const executable = await agent.findExecutable(tryGetAssistantExecutablePathFromLocalStorage(agent.id));
			if (!executable) {
				return this.setState({ status: "not-found", executable: null });
			}

			this.setState({ status: "starting", executable });

			const editorPath = this.props.editor.path;
			if (!editorPath) {
				throw new Error("The path of the editor is not known yet.");
			}

			const mcpServer = await this._ensureMcpServer();
			const projectDirectory = dirname(this._projectPath);

			const mcpOptions: IAssistantMcpConfigurationOptions = {
				executablePath: ipcRenderer.sendSync("editor:get-executable-path"),
				serverScriptPath: getAssistantMcpServerScriptPath(editorPath),
				url: `http://127.0.0.1:${mcpServer.port}`,
				token: mcpServer.token!,
			};

			const env = this._getEnvironment();
			const pluginDirectory = await this._getPluginDirectory(editorPath);

			let args: string[];
			if (agent.id === "codex") {
				if (pluginDirectory) {
					await this._installSkillsInProject(pluginDirectory, projectDirectory);
				}

				// Codex tells what it is doing through the title of its terminal, see _handleTitleChange.
				args = getCodexArguments(mcpOptions, resume, executable.version);
				Object.assign(env, getCodexEnvironment(mcpOptions));
			} else {
				const hooksServer = supportsAssistantHooks(executable.version) ? await this._startHooksServer() : null;
				const { mcpConfigurationPath, settingsPath } = await writeAssistantConfiguration(
					joinNative(tmpdir(), "babylonjs-editor-assistant", this._sessionId),
					mcpOptions,
					hooksServer
				);

				args = getClaudeArguments(mcpConfigurationPath, settingsPath, resume, pluginDirectory && supportsAssistantPlugin(executable.version) ? pluginDirectory : null);
			}

			const terminal = this._ensureTerminal();
			terminal.reset();

			const isBatchFile = isWindows() && /\.(cmd|bat)$/i.test(executable.path);

			const pty = await execNodePty("", {
				file: isBatchFile ? (process.env.COMSPEC ?? "cmd.exe") : executable.path,
				args: isBatchFile ? getWindowsBatchCommandLine(executable.path, args) : args,
				cwd: projectDirectory,
				env,
				name: "xterm-256color",
				cols: terminal.cols,
				rows: terminal.rows,
			});

			this._pty = pty;
			this._sessionAgent = agent.id;

			pty.onGetDataObservable.add((data) => this._terminal?.write(data));
			pty.onExitObservable.add((exitCode) => {
				if (this._pty !== pty) {
					return;
				}

				this._pty = null;
				this._watcher?.stop();
				this._stopHooksServer();

				void removeAgentData(this._projectPath);

				this.setState({ status: "exited", exitCode });
			});

			pty.resize(terminal.cols, terminal.rows);

			await this._startWatcher(projectDirectory);

			// The agent may have exited while the watcher was starting.
			if (this._pty !== pty) {
				this._watcher?.stop();
				return;
			}

			this.setState({ status: "running" });

			requestAnimationFrame(() => {
				this._fit();
				this.focus();
			});
		} catch (e) {
			this.setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
		} finally {
			this._starting = false;
		}
	}

	/**
	 * Returns the absolute path of the plugin of the assistant, holding the skills of the editor, or null when it was not
	 * built.
	 */
	private async _getPluginDirectory(editorPath: string): Promise<string | null> {
		const pluginDirectory = getAssistantPluginDirectory(editorPath);
		return (await pathExists(pluginDirectory)) ? pluginDirectory : null;
	}

	/**
	 * Installs the skills of the editor in the project for Codex, which only finds skills in the project or in the home
	 * folder of the user. The agent still starts when they can't be installed.
	 */
	private async _installSkillsInProject(pluginDirectory: string, projectDirectory: string): Promise<void> {
		try {
			const results = await installAssistantSkillsInProject(pluginDirectory, projectDirectory);

			Object.entries(results).forEach(([name, result]) => {
				if (result === "installed" || result === "updated") {
					this.props.editor.layout.console.log(`AI assistant: skill "${name}" ${result} in ".agents/skills" of the project.`);
				}
			});
		} catch (e) {
			this.props.editor.layout.console.warn(`AI assistant: failed to install the skills of the editor in the project: ${e instanceof Error ? e.message : e}`);
		}
	}

	/**
	 * Stops the current session of the agent, if any, and starts a new one.
	 * @param resume defines wether or not to continue the last conversation of the project instead of starting a new one.
	 */
	public async restart(resume: boolean): Promise<void> {
		this._stopSession();
		await this.start(resume);
	}

	private _stopSession(): void {
		const pty = this._pty;
		this._pty = null;
		pty?.kill();

		this._watcher?.stop();
		this._watcher = null;

		this._stopHooksServer();

		void removeAgentData(this._projectPath);
	}

	/**
	 * Starts the HTTP server the hook events of the new session are sent to. Each session has its own server, so the
	 * events a stopped session still sends are never received.
	 */
	private async _startHooksServer(): Promise<IAssistantHooksServer> {
		this._stopHooksServer();

		const server = await startAssistantHooksServer((event, input) => {
			if (this._hooksServer === server) {
				this._handleHook(event, input);
			}
		});

		this._hooksServer = server;

		return server;
	}

	private _stopHooksServer(): void {
		this._hooksServer?.close();
		this._hooksServer = null;

		this._setWorkState("idle");
	}

	private _setWorkState(workState: EditorAssistantWorkState): void {
		if (workState === this._workState) {
			return;
		}

		if (this._inputToastId !== null) {
			toast.dismiss(this._inputToastId);
			this._inputToastId = null;
		}

		const finished = this._workState !== "idle" && workState === "idle";

		this._workState = workState;
		this.props.editor.setState({ assistantWorkState: workState });

		// The automation scripts the agent wrote to build content are not kept once it finished its work.
		if (finished) {
			void removeAgentData(this._projectPath);
		}
	}

	private _handleHook(event: string, input: IAssistantHookInput): void {
		const workState = getAssistantWorkStateAfterHook(this._workState, event, input);
		this._setWorkState(workState);

		switch (event) {
			case "Stop":
				toast.success("AI Assistant is done", {
					action: this._getShowToastAction(),
				});
				break;

			case "StopFailure":
				toast.error("AI Assistant stopped because of an error", {
					description: input.last_assistant_message || input.error,
					action: this._getShowToastAction(),
				});
				break;

			case "Notification":
				// Stays until the assistant stops waiting.
				if (workState === "waiting" && isAssistantInputNotification(input)) {
					this._inputToastId = toast.warning("AI Assistant needs your input", {
						id: this._inputToastId ?? undefined,
						description: input.message,
						duration: Infinity,
						action: this._getShowToastAction(),
					});
				}
				break;
		}
	}

	/**
	 * Follows what Codex is doing through the title it gives to its terminal: Codex only runs the hooks the user
	 * trusted, while the terminal of the assistant always receives the title.
	 */
	private _handleTitleChange(title: string): void {
		if (!this._pty || this._sessionAgent !== "codex") {
			return;
		}

		const workState = getAssistantWorkStateFromCodexTitle(title);
		if (workState === null || workState === this._workState) {
			return;
		}

		const wasBusy = this._workState !== "idle";
		this._setWorkState(workState);

		if (workState === "idle" && wasBusy) {
			toast.success("AI Assistant is done", {
				action: this._getShowToastAction(),
			});
		} else if (workState === "waiting") {
			// Stays until the assistant stops waiting.
			this._inputToastId = toast.warning("AI Assistant needs your input", {
				duration: Infinity,
				action: this._getShowToastAction(),
			});
		}
	}

	/**
	 * Returns the action of the notifications of the assistant, which shows its panel when it is hidden.
	 */
	private _getShowToastAction(): { label: string; onClick: () => void } | undefined {
		if (this.props.open) {
			return undefined;
		}

		return {
			label: "Show",
			onClick: () => {
				this.props.editor.setAssistantOpen(true);
				this.focus();
			},
		};
	}

	private async _ensureMcpServer(): Promise<IEditorMcpServer> {
		if (this._mcpServer) {
			return this._mcpServer;
		}

		// Loaded on demand: the MCP tools import most of the editor.
		const { startMcpServer } = await import("../../mcp/mcp");

		const server = await startMcpServer(this.props.editor, {
			port: 0,
			token: randomBytes(32).toString("hex"),
		});

		server.onRequestObservable.add((endpoint) => {
			if (this._activityTimeout) {
				clearTimeout(this._activityTimeout);
				this._activityTimeout = null;
			}

			this.setState({ activity: endpoint });

			// A tool of the editor runs: the user allowed it, before the agent tells it once the tool is done.
			if (this._workState === "waiting") {
				this._setWorkState("working");
			}
		});

		server.onResponseObservable.add(() => {
			if (this._activityTimeout) {
				clearTimeout(this._activityTimeout);
			}

			this._activityTimeout = setTimeout(() => {
				this._activityTimeout = null;
				this.setState({ activity: null });
			}, 1500);
		});

		this._mcpServer = server;

		return server;
	}

	private async _startWatcher(projectDirectory: string): Promise<void> {
		this._watcher?.stop();

		const { AssistantAssetsWatcher } = await import("./assistant/watcher");

		this._watcher = new AssistantAssetsWatcher(this.props.editor, join(projectDirectory, "assets"));
		this._watcher.start();
	}

	private _getEnvironment(): Record<string, string> {
		const env: Record<string, string> = {};

		Object.entries(process.env).forEach(([key, value]) => {
			if (value === undefined || ignoredEnvironmentVariables.includes(key) || key.startsWith("VSCODE_")) {
				return;
			}

			if (!key.startsWith("CODEX_") || userCodexEnvironmentVariables.includes(key)) {
				env[key] = value;
			}
		});

		env.TERM = "xterm-256color";
		env.COLORTERM = "truecolor";

		return env;
	}

	private _ensureTerminal(): Terminal {
		if (this._terminal) {
			return this._terminal;
		}

		if (!this._terminalContainer) {
			throw new Error("The terminal of the assistant is not mounted.");
		}

		const terminal = new Terminal({
			fontSize: 13,
			lineHeight: 1.15,
			fontFamily: "'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace",
			allowTransparency: true,
			cursorBlink: true,
			scrollback: 5000,
			theme: this._getTerminalTheme(),
		});

		this._fitAddon = new FitAddon();
		terminal.loadAddon(this._fitAddon);

		terminal.open(this._terminalContainer);

		try {
			this._webglAddon = new WebglAddon();
			terminal.loadAddon(this._webglAddon);
		} catch (e) {
			// WebGL not available, keep the default renderer.
			this._webglAddon = null;
		}

		terminal.onData((data) => {
			this._pty?.write(data);
			this._setWorkState(getAssistantWorkStateAfterInput(this._workState, data));
		});
		terminal.onResize(({ cols, rows }) => this._pty?.resize(cols, rows));
		terminal.onTitleChange((title) => this._handleTitleChange(title));

		this._resizeObserver = new ResizeObserver(() => requestAnimationFrame(() => this._fit()));
		this._resizeObserver.observe(this._terminalContainer);

		// The theme of the editor is switched live from the preferences by toggling the "dark" class of the body.
		this._themeObserver = new MutationObserver(() => {
			if (this._terminal) {
				this._terminal.options.theme = this._getTerminalTheme();
			}
		});
		this._themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

		this._terminal = terminal;
		this._fit();

		return terminal;
	}

	private _disposeTerminal(): void {
		this._resizeObserver?.disconnect();
		this._resizeObserver = null;

		this._themeObserver?.disconnect();
		this._themeObserver = null;

		this._fitAddon?.dispose();
		this._fitAddon = null;

		try {
			this._webglAddon?.dispose();
		} catch (e) {
			// Ignore.
		}
		this._webglAddon = null;

		this._terminal?.dispose();
		this._terminal = null;
	}

	/**
	 * Fits the terminal to its container. A collapsed panel has no size: fitting would give invalid dimensions.
	 */
	private _fit(): void {
		if (!this._terminal || !this._fitAddon) {
			return;
		}

		const dimensions = this._fitAddon.proposeDimensions();
		if (!dimensions || !isFinite(dimensions.cols) || !isFinite(dimensions.rows) || dimensions.cols <= 1 || dimensions.rows <= 1) {
			return;
		}

		this._fitAddon.fit();
	}

	private _getTerminalTheme(): ITheme {
		const isDark = document.body.classList.contains("dark");

		return isDark
			? {
					background: "#00000000",
					foreground: "#d4d4d4",
					cursor: "#d4d4d4",
					selectionBackground: "rgba(255, 255, 255, 0.3)",
					selectionForeground: "#ffffff",
				}
			: {
					background: "#00000000",
					foreground: "#1f2328",
					cursor: "#1f2328",
					cursorAccent: "#ffffff",
					selectionBackground: "rgba(0, 0, 0, 0.2)",
					selectionForeground: "#000000",
				};
	}

	private _handleDragOver(ev: DragEvent<HTMLDivElement>): void {
		if (!this._pty || (!ev.dataTransfer.types.includes("assets") && !ev.dataTransfer.types.includes("Files"))) {
			return;
		}

		ev.preventDefault();
		ev.dataTransfer.dropEffect = "copy";

		if (!this.state.dragOver) {
			this.setState({ dragOver: true });
		}
	}

	/**
	 * Types the paths of the dropped assets or files in the prompt of the agent, relative to the project when they
	 * are in it, so the user can talk about them.
	 */
	private _handleDrop(ev: DragEvent<HTMLDivElement>): void {
		this.setState({ dragOver: false });

		if (!this._pty || !this._terminal) {
			return;
		}

		ev.preventDefault();

		let paths: string[] = [];

		try {
			const assets = ev.dataTransfer.getData("assets");
			if (assets) {
				paths = JSON.parse(assets);
			}
		} catch (e) {
			// Not dragged from the assets browser.
		}

		if (!paths.length) {
			paths = Array.from(ev.dataTransfer.files).map((file) => webUtils.getPathForFile(file));
		}

		const projectDirectory = this._projectPath ? join(dirname(this._projectPath.replace(/\\/g, "/")), "/") : null;
		const text = paths
			.map((path) => path.replace(/\\/g, "/"))
			.map((path) => (projectDirectory && path.startsWith(projectDirectory) ? path.substring(projectDirectory.length) : path))
			.map((path) => (path.includes(" ") ? `"${path}"` : path))
			.join(" ");

		if (text) {
			this._terminal.paste(`${text} `);
			this.focus();
		}
	}

	private _handleLocateExecutable(): void {
		const agent = getAssistantAgent(this.state.agent);
		const path = openSingleFileDialog({
			title: `Locate the ${agent.name} executable`,
		});

		if (!path) {
			return;
		}

		trySetAssistantExecutablePathInLocalStorage(agent.id, path);
		this.restart(false);
	}

	private _handleResetExecutableLocation(): void {
		trySetAssistantExecutablePathInLocalStorage(this.state.agent, null);
		this.restart(false);
	}

	/**
	 * Remembers the agent chosen by the user and starts a new session with it. The conversation of the current agent
	 * can be resumed later from the menu.
	 */
	private _handleAgentChange(agentId: EditorAssistantAgentId): void {
		if (agentId === this.state.agent) {
			return;
		}

		trySetAssistantAgentInLocalStorage(agentId);

		this.setState({ agent: agentId, executable: null }, () => {
			if (this._pty || this.props.open) {
				this.restart(false);
			}
		});
	}

	private _getHeader(): ReactNode {
		const { executable, activity } = this.state;
		const agent = getAssistantAgent(this.state.agent);
		const busy = this.state.status === "searching" || this.state.status === "starting";

		return (
			<div className="flex items-center justify-between gap-2 w-full h-10 px-2 bg-primary-foreground shrink-0">
				<div className="flex items-center gap-2 min-w-0">
					<EditorAssistantIcon workState={this.props.editor.state.assistantWorkState} size={16} />
					<div className="text-sm font-semibold whitespace-nowrap">AI Assistant</div>

					{activity ? (
						<div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
							<span className="w-2 h-2 shrink-0 rounded-full bg-green-500 animate-pulse" />
							<span className="truncate">{activity}</span>
						</div>
					) : (
						executable && (
							<div className="text-xs text-muted-foreground truncate">
								{agent.name} {executable.version}
							</div>
						)
					)}
				</div>

				<TooltipProvider delayDuration={0}>
					<div className="flex items-center gap-1 shrink-0">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" className="w-8 h-8 !p-0" disabled={!projectConfiguration.path} onClick={() => this.restart(false)}>
									<IoAdd className="w-5 h-5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>New conversation</TooltipContent>
						</Tooltip>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="w-8 h-8 !p-0">
									<IoEllipsisHorizontal className="w-5 h-5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem disabled={!projectConfiguration.path} onClick={() => this.restart(true)}>
									Resume last conversation
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Agent</DropdownMenuLabel>
								<DropdownMenuRadioGroup value={agent.id} onValueChange={(value) => this._handleAgentChange(value as EditorAssistantAgentId)}>
									{assistantAgents.map((item) => (
										<DropdownMenuRadioItem key={item.id} value={item.id} disabled={busy}>
											{item.name}
										</DropdownMenuRadioItem>
									))}
								</DropdownMenuRadioGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={() => this._handleLocateExecutable()}>Locate {agent.name} executable...</DropdownMenuItem>
								<DropdownMenuItem disabled={!tryGetAssistantExecutablePathFromLocalStorage(agent.id)} onClick={() => this._handleResetExecutableLocation()}>
									Find {agent.name} automatically
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={() => shell.openExternal(agent.setupUrl)}>{agent.name} documentation...</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" className="w-8 h-8 !p-0" onClick={() => this.props.editor.setAssistantOpen(false)}>
									<IoCloseOutline className="w-5 h-5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Hide the assistant (the session keeps running)</TooltipContent>
						</Tooltip>
					</div>
				</TooltipProvider>
			</div>
		);
	}

	private _getPlaceholder(): ReactNode {
		switch (this.state.status) {
			case "idle":
			case "no-project":
				return (
					<div className="text-center text-muted-foreground">
						<div className="text-lg mb-2">No Project Open</div>
						<div className="text-sm">Open a project to use the AI assistant.</div>
					</div>
				);

			case "searching":
			case "starting":
				return (
					<div className="flex flex-col items-center gap-4 text-muted-foreground">
						<SpinnerUIComponent width={32} height={32} />
						<div className="text-sm">
							{this.state.status === "searching" ? "Looking for" : "Starting"} {getAssistantAgent(this.state.agent).name}...
						</div>
					</div>
				);

			case "not-found":
				return this._getNotFoundPlaceholder();

			case "error":
				return (
					<div className="flex flex-col items-center gap-4 max-w-md text-center">
						<div className="text-lg">The assistant failed to start</div>
						<div className="text-sm text-muted-foreground break-words">{this.state.error}</div>
						<Button variant="secondary" onClick={() => this.restart(false)}>
							Try again
						</Button>
					</div>
				);

			default:
				return null;
		}
	}

	private _getNotFoundPlaceholder(): ReactNode {
		const agent = getAssistantAgent(this.state.agent);
		const otherAgents = assistantAgents.filter((item) => item.id !== agent.id);

		const installCommand = agent.getInstallCommand(isWindows());
		const customPath = tryGetAssistantExecutablePathFromLocalStorage(agent.id);

		return (
			<div className="flex flex-col gap-4 max-w-md">
				<div className="text-lg font-semibold">{agent.name} is required</div>

				<div className="text-sm text-muted-foreground">
					The assistant runs {agent.name}, installed on this computer, and connects it to the editor so {agent.modelName} can build your scene and add assets to your
					project. It uses your own {agent.account}: sign in from this panel the first time.
				</div>

				{customPath ? (
					<div className="text-sm text-muted-foreground break-all">The executable you chose doesn&apos;t work: {customPath}</div>
				) : (
					<>
						<div className="text-sm text-muted-foreground">
							{agent.name} was not found. Install it with the following command in a {isWindows() ? "PowerShell" : "terminal"}
							{agent.desktopApp ? `, or with ${agent.desktopApp}` : ""}, then try again:
						</div>

						<div className="flex items-center gap-2">
							<code className="flex-1 px-2 py-1.5 rounded bg-secondary text-xs break-all select-text">{installCommand}</code>
							<Button variant="ghost" size="sm" onClick={() => clipboard.writeText(installCommand)}>
								Copy
							</Button>
						</div>
					</>
				)}

				<div className="flex flex-wrap gap-2">
					<Button onClick={() => this.restart(false)}>Try again</Button>
					<Button variant="secondary" onClick={() => this._handleLocateExecutable()}>
						Locate executable...
					</Button>
					{customPath && (
						<Button variant="secondary" onClick={() => this._handleResetExecutableLocation()}>
							Find automatically
						</Button>
					)}
					<Button variant="ghost" onClick={() => shell.openExternal(agent.setupUrl)}>
						Installation guide
					</Button>
				</div>

				{otherAgents.map((item: IEditorAssistantAgent) => (
					<Button key={item.id} variant="link" className="self-start h-auto p-0 text-sm" onClick={() => this._handleAgentChange(item.id)}>
						Use {item.name} instead
					</Button>
				))}
			</div>
		);
	}

	private _getExitedBar(): ReactNode {
		return (
			<div className="absolute left-0 right-0 bottom-0 flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-secondary/95 border-t border-border/50">
				<div className="text-sm text-muted-foreground">
					{getAssistantAgent(this.state.agent).name} exited{this.state.exitCode ? ` (code ${this.state.exitCode})` : ""}.
				</div>
				<div className="flex gap-2">
					<Button size="sm" variant="secondary" onClick={() => this.restart(true)}>
						Resume conversation
					</Button>
					<Button size="sm" onClick={() => this.restart(false)}>
						New conversation
					</Button>
				</div>
			</div>
		);
	}
}
