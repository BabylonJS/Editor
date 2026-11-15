import { join } from "path";

import type { EditorAssistantWorkState } from "./hooks";
import { assistantAllowedEditorTools, assistantMcpServerName, IAssistantMcpConfigurationOptions } from "./config";
import { compareVersions, findExecutable, getDefaultLocationOptions, IAssistantExecutable, IAssistantExecutableCandidate, IExecutableLocationOptions } from "./executable";

/**
 * Defines the time, in seconds, Codex waits for the MCP server of the editor to start. It is run by the executable of
 * the editor, which starts slower than Node.js.
 */
export const codexMcpStartupTimeout = 30;

/**
 * Defines the time, in seconds, Codex waits for a tool of the editor. Importing a large asset takes longer than the 60
 * seconds Codex waits by default.
 */
export const codexMcpToolTimeout = 600;

/**
 * Defines the items of the title Codex gives to its terminal. The assistant follows what Codex is doing through it:
 * Codex tells it only there when it doesn't run hooks the user trusted.
 */
export const codexTerminalTitleItems = ["activity", "run-state"];

/**
 * Defines the oldest version of Codex known to have the "--no-daemon" option: an unknown option makes Codex refuse to
 * start. The overrides of the configuration can't be given to the shared background server of Codex, which it says in
 * a warning unless it is told not to use it.
 */
export const codexNoDaemonMinimumVersion = "0.158.0";

/**
 * Defines the instructions given to the model of Codex. Codex doesn't give the instructions of the MCP servers to its
 * models, and the recent ones only see the tools they search for: without them, the model doesn't know the editor is
 * connected and edits the files of the project instead. Written without quotes nor line breaks to stay a TOML literal
 * string (see toTomlString).
 */
export const codexDeveloperInstructions = [
	"You are running in the AI assistant panel of the Babylon.js Editor: the user sees the editor next to you, and the editor is connected to you through the MCP server babylonjs-editor.",
	"Do everything that concerns the scene (nodes, meshes, materials, lights, cameras, assets, scripts, physics, testing the game) with the tools of this server, never by editing the files of the project by hand.",
	`Its tools are named mcp__babylonjs_editor__<tool>, for example mcp__babylonjs_editor__get_scene_hierarchy. When they are not listed, they are deferred: find them in ALL_TOOLS and call them from exec through the global tools object, for example await tools.mcp__babylonjs_editor__get_scene_hierarchy({}).`,
	"Before your first action on the scene, call mcp__babylonjs_editor__get_instructions and follow the instructions it returns.",
].join(" ");

/**
 * Defines the environment variables Codex gives to the MCP server of the editor. They are given to Codex rather than
 * written in its arguments, which the other users of the computer can read.
 */
export const codexForwardedEnvironmentVariables = ["BABYLONJS_EDITOR_MCP_URL", "BABYLONJS_EDITOR_MCP_TOKEN"];

/**
 * Returns the paths where the installers of Codex put its executable, in order of preference.
 * @param options defines the platform, the home directory and the environment of the user.
 */
export function getCodexInstallationCandidates(options: IExecutableLocationOptions = getDefaultLocationOptions()): string[] {
	if (options.platform === "win32") {
		const candidates: string[] = [];
		if (options.env.LOCALAPPDATA) {
			candidates.push(join(options.env.LOCALAPPDATA, "Programs", "OpenAI", "Codex", "bin", "codex.exe"));
		}
		if (options.env.APPDATA) {
			candidates.push(join(options.env.APPDATA, "npm", "codex.cmd"));
		}

		return candidates;
	}

	return [
		join(options.home, ".local", "bin", "codex"),
		"/opt/homebrew/bin/codex",
		"/usr/local/bin/codex",
		join(options.home, ".npm-global", "bin", "codex"),
		join(options.home, ".bun", "bin", "codex"),
	];
}

/**
 * Returns the paths of the executable of Codex the desktop apps of OpenAI come with, in order of preference.
 * @param options defines the platform, the home directory and the environment of the user.
 */
export function getCodexDesktopAppCandidates(options: IExecutableLocationOptions = getDefaultLocationOptions()): string[] {
	if (options.platform !== "darwin") {
		return [];
	}

	return ["/Applications", join(options.home, "Applications")].flatMap((directory) =>
		["ChatGPT.app", "Codex.app"].map((app) => join(directory, app, "Contents", "Resources", "codex"))
	);
}

/**
 * Extracts the version of Codex from the output of "codex --version", e.g. "codex-cli 0.158.0".
 * @param output defines the output of the command.
 */
export function parseCodexVersion(output: string): string | null {
	if (!/codex/i.test(output)) {
		return null;
	}

	return output.match(/(\d+\.\d+\.\d+[\w.-]*)/)?.[1] ?? null;
}

/**
 * Finds the Codex executable installed on this computer: the one chosen by the user, the one in the PATH of the user,
 * the ones the installers of Codex create, and finally the one of the desktop apps of OpenAI.
 * @param customPath defines the path of the executable chosen by the user, if any.
 * @returns the first executable that answers "codex --version", or null when none is found.
 */
export function findCodexExecutable(customPath?: string | null): Promise<IAssistantExecutable | null> {
	return findExecutable({
		command: "codex",
		customPath,
		parseVersion: parseCodexVersion,
		getCandidates: async () => [
			...getCodexInstallationCandidates().map((path): IAssistantExecutableCandidate => ({ path, source: "installation" })),
			...getCodexDesktopAppCandidates().map((path): IAssistantExecutableCandidate => ({ path, source: "desktop-app" })),
		],
	});
}

/**
 * Returns the given text as a TOML string. It is a literal string when possible: it keeps the backslashes of the paths
 * on Windows as they are, and has no double quotes, which cmd.exe can't give to the batch file npm creates for Codex.
 * @param value defines the text to write.
 */
export function toTomlString(value: string): string {
	// A literal string can't hold single quotes nor control characters.
	const isLiteral = Array.from(value).every((character) => {
		const code = character.charCodeAt(0);
		return character !== "'" && code >= 0x20 && code !== 0x7f;
	});

	if (isLiteral) {
		return `'${value}'`;
	}

	return JSON.stringify(value);
}

function toTomlArray(values: string[]): string {
	return `[${values.map((value) => toTomlString(value)).join(", ")}]`;
}

/**
 * Returns the arguments Codex is started with. The MCP server of the editor and the title of the terminal are given as
 * overrides of the configuration of the user, which stays untouched.
 * @param options defines the MCP server of the editor, run by the executable of the editor itself so no Node.js
 * installation is needed.
 * @param resume defines wether or not to continue the last conversation of the project instead of starting a new one.
 * @param version defines the version of Codex, like "0.158.0".
 */
export function getCodexArguments(options: IAssistantMcpConfigurationOptions, resume: boolean, version: string): string[] {
	const server = [
		`command = ${toTomlString(options.executablePath)}`,
		`args = ${toTomlArray([options.serverScriptPath])}`,
		`env = { ELECTRON_RUN_AS_NODE = '1', BABYLONJS_EDITOR_ASSISTANT = '1' }`,
		`env_vars = ${toTomlArray(codexForwardedEnvironmentVariables)}`,
		`startup_timeout_sec = ${codexMcpStartupTimeout}`,
		`tool_timeout_sec = ${codexMcpToolTimeout}`,
		// Like Claude Code: the tools composing the scene run right away, the others ask the user first.
		`default_tools_approval_mode = 'prompt'`,
		`tools = { ${assistantAllowedEditorTools.map((tool) => `${tool} = { approval_mode = 'approve' }`).join(", ")} }`,
	];

	return [
		...(resume ? ["resume", "--last"] : []),
		...(compareVersions(version, codexNoDaemonMinimumVersion) >= 0 ? ["--no-daemon"] : []),
		"-c",
		`mcp_servers.${assistantMcpServerName}={ ${server.join(", ")} }`,
		"-c",
		`tui.terminal_title=${toTomlArray(codexTerminalTitleItems)}`,
		// Replaces the developer instructions of the configuration of the user, if any, for the session.
		"-c",
		`developer_instructions=${toTomlString(codexDeveloperInstructions)}`,
	];
}

/**
 * Returns the environment variables to give to Codex so it connects the MCP server of the editor to its window.
 * @param options defines the HTTP server of the editor window the assistant belongs to.
 */
export function getCodexEnvironment(options: IAssistantMcpConfigurationOptions): Record<string, string> {
	return {
		BABYLONJS_EDITOR_MCP_URL: options.url,
		BABYLONJS_EDITOR_MCP_TOKEN: options.token,
	};
}

/**
 * Returns what Codex is doing according to the title it gives to its terminal, like "⠋ Working", "Ready" or
 * "[ ! ] Action Required", or null when the title doesn't tell it.
 * @param title defines the title of the terminal.
 */
export function getAssistantWorkStateFromCodexTitle(title: string): EditorAssistantWorkState | null {
	if (/Action Required/i.test(title)) {
		return "waiting";
	}

	// "Waiting" is Codex waiting for a command it runs in the background: it is still working on the request.
	if (/\b(Working|Thinking|Waiting)\b/.test(title)) {
		return "working";
	}

	// Codex clears the title when it exits.
	if (/\b(Ready|Starting)\b/.test(title) || !title.trim()) {
		return "idle";
	}

	return null;
}
