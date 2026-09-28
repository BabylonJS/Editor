import { join } from "path";
import { copy, ensureDir, pathExists, readdir, readJSON, remove, writeJSON } from "fs-extra";

import { MCPTokenHeader } from "../../../mcp/server";

import type { EditorAssistantWorkState, IAssistantHooksServer } from "./hooks";
import { IAssistantMcpConfigurationOptions } from "./config";
import { findExecutable, getDefaultLocationOptions, IAssistantExecutable, IAssistantExecutableCandidate, IExecutableLocationOptions } from "./executable";

/**
 * Defines the name of the plugin the assistant gives to Antigravity CLI: its MCP server is "babylonjs_editor" in
 * Antigravity CLI, which prefixes the MCP servers of plugins with their name. Kept short: Antigravity CLI refuses the
 * tools whose full name, "mcp_babylonjs_editor_<tool>", is longer than 64 characters.
 */
export const antigravityPluginName = "babylonjs";

/**
 * Defines the description of the plugin, which also tells it was written by the editor.
 */
export const antigravityPluginDescription = "Babylon.js Editor: the tools and skills of the editor, added by its AI assistant while it runs Antigravity CLI.";

/**
 * Defines the name of the folder of the plugin holding one file per session of the assistant using it, with the
 * identifier of the process of its editor window.
 */
export const antigravityPluginSessionsDirectoryName = ".sessions";

/**
 * Defines the hook events of Antigravity CLI the assistant follows to know what it is doing. "PreToolUse" is not one of
 * them: Antigravity CLI denies the tool when its hook doesn't decide.
 */
export const antigravityHookEvents = ["PreInvocation", "PostInvocation", "PostToolUse", "Stop"];

/**
 * Defines the answer the hooks server of the assistant gives to Antigravity CLI, which reads the output of its hooks as
 * JSON: an empty object lets it go on as if there was no hook.
 */
export const antigravityHookAnswer = "{}";

/**
 * Defines the questions Antigravity CLI asks in its terminal when it waits for the user to allow something: it runs no
 * hook while it waits.
 */
const antigravityApprovalPrompts = [/Allow calling this tool\?/, /Run this command\?/, /Allow access to this URL\?/, /^\s*>\s*1\.\s*Yes, allow/m];

/**
 * Returns the paths where the installers of Antigravity CLI put its executable, in order of preference.
 * @param options defines the platform, the home directory and the environment of the user.
 */
export function getAntigravityInstallationCandidates(options: IExecutableLocationOptions = getDefaultLocationOptions()): string[] {
	if (options.platform === "win32") {
		return options.env.LOCALAPPDATA ? [join(options.env.LOCALAPPDATA, "agy", "bin", "agy.exe")] : [];
	}

	return [join(options.home, ".local", "bin", "agy"), "/opt/homebrew/bin/agy", "/usr/local/bin/agy"];
}

/**
 * Extracts the version of Antigravity CLI from the output of "agy --version", e.g. "1.2.12": Antigravity CLI prints
 * the version alone.
 * @param output defines the output of the command.
 */
export function parseAntigravityVersion(output: string): string | null {
	const lines = output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line);

	return lines.reverse().find((line) => /^\d+\.\d+\.\d+[\w.-]*$/.test(line)) ?? null;
}

/**
 * Finds the Antigravity CLI executable installed on this computer: the one chosen by the user, the one in the PATH of
 * the user, then the one the installers of Antigravity CLI create.
 * @param customPath defines the path of the executable chosen by the user, if any.
 * @returns the first executable that answers "agy --version", or null when none is found.
 */
export function findAntigravityExecutable(customPath?: string | null): Promise<IAssistantExecutable | null> {
	return findExecutable({
		command: "agy",
		customPath,
		parseVersion: parseAntigravityVersion,
		getCandidates: async () => getAntigravityInstallationCandidates().map((path): IAssistantExecutableCandidate => ({ path, source: "installation" })),
	});
}

/**
 * Returns the absolute path of the plugin of the assistant among the plugins of the user: Antigravity CLI can't be
 * given MCP servers nor plugins for a single session, and doesn't load the ones of the project before the user signed
 * in.
 * @param options defines the platform, the home directory and the environment of the user.
 */
export function getAntigravityPluginDirectory(options: IExecutableLocationOptions = getDefaultLocationOptions()): string {
	return join(options.home, ".gemini", "config", "plugins", antigravityPluginName);
}

/**
 * Returns the hooks of the plugin: each hook event is sent to the hooks server of the assistant with curl, which comes
 * with macOS, Windows and most Linux distributions. Like the MCP server, the hooks get the URL and the token of the
 * server from the environment of Antigravity CLI, which runs them with "sh -c" or "cmd /c".
 * @param platform defines the platform of the user.
 */
export function createAntigravityHooks(platform: NodeJS.Platform = process.platform): object {
	const variable = (name: string): string => (platform === "win32" ? `%${name}%` : `$${name}`);
	const command = (event: string): string =>
		[
			platform === "win32" ? "curl.exe" : "curl",
			"-s -m 5 -X POST",
			`-H "${MCPTokenHeader}: ${variable("BABYLONJS_EDITOR_HOOKS_TOKEN")}"`,
			`-H "Content-Type: application/json"`,
			"--data-binary @-",
			`"${variable("BABYLONJS_EDITOR_HOOKS_URL")}/${event}"`,
			// The editor may be gone: Antigravity CLI still gets an answer.
			`|| echo ${antigravityHookAnswer}`,
		].join(" ");

	const handler = (event: string): object => ({ type: "command", command: command(event), timeout: 10 });

	return {
		[antigravityPluginName]: {
			PreInvocation: [handler("PreInvocation")],
			PostInvocation: [handler("PostInvocation")],
			PostToolUse: [{ matcher: "*", hooks: [handler("PostToolUse")] }],
			Stop: [handler("Stop")],
		},
	};
}

/**
 * Returns what the assistant is doing after the given hook event of Antigravity CLI.
 * @param event defines the name of the hook event.
 */
export function getAssistantWorkStateAfterAntigravityHook(event: string): EditorAssistantWorkState {
	// Any event but "Stop" means the model or a tool runs: the user answered, if Antigravity CLI was waiting.
	return event === "Stop" ? "idle" : "working";
}

/**
 * Returns wether or not the given output of Antigravity CLI, without its escape sequences, asks the user to allow a
 * tool, a command or a URL.
 * @param text defines the output of Antigravity CLI.
 */
export function isAntigravityApprovalPrompt(text: string): boolean {
	return antigravityApprovalPrompts.some((prompt) => prompt.test(text));
}

/**
 * Returns the MCP configuration of the plugin: the MCP server of the editor, run by the executable of the editor itself.
 * It has no token nor URL: it gets the ones of the editor window from the environment of Antigravity CLI, which the
 * processes it starts inherit.
 * @param options defines the MCP server of the editor.
 */
export function createAntigravityMcpConfiguration(options: IAssistantMcpConfigurationOptions): object {
	return {
		mcpServers: {
			editor: {
				command: options.executablePath,
				args: [options.serverScriptPath],
				env: {
					ELECTRON_RUN_AS_NODE: "1",
					BABYLONJS_EDITOR_ASSISTANT: "1",
				},
			},
		},
	};
}

function isProcessRunning(pid: unknown): boolean {
	try {
		return typeof pid === "number" && process.kill(pid, 0);
	} catch (e) {
		return false;
	}
}

/**
 * Returns wether or not a session of the assistant, in any editor window, still uses the plugin. The sessions of an
 * editor that crashed don't count.
 */
async function isAntigravityPluginUsed(sessionsDirectory: string): Promise<boolean> {
	if (!(await pathExists(sessionsDirectory))) {
		return false;
	}

	for (const name of await readdir(sessionsDirectory)) {
		try {
			if (isProcessRunning((await readJSON(join(sessionsDirectory, name))).pid)) {
				return true;
			}
		} catch (e) {
			// Being written or removed.
		}
	}

	return false;
}

async function isAntigravityPluginOfEditor(directory: string): Promise<boolean> {
	try {
		return (await readJSON(join(directory, "plugin.json"))).description === antigravityPluginDescription;
	} catch (e) {
		return false;
	}
}

/**
 * Writes the plugin of the assistant among the plugins of Antigravity CLI for the given session: the MCP server of the
 * editor, its skills and the hooks telling the assistant what Antigravity CLI is doing. A plugin of the same name that
 * wasn't written by the editor is left untouched.
 * @param sessionId defines the identifier of the session of the assistant.
 * @param options defines the MCP server of the editor.
 * @param skillsPluginDirectory defines the absolute path of the plugin of the assistant bundled with the editor, holding
 * its skills, if built.
 * @throws when a plugin of the same name, not written by the editor, exists.
 */
export async function addAntigravityPlugin(sessionId: string, options: IAssistantMcpConfigurationOptions, skillsPluginDirectory: string | null): Promise<void> {
	const directory = getAntigravityPluginDirectory();

	if ((await pathExists(directory)) && !(await isAntigravityPluginOfEditor(directory))) {
		throw new Error(`Antigravity CLI already has a plugin named "${antigravityPluginName}" that the editor didn't write: "${directory}".`);
	}

	await ensureDir(join(directory, antigravityPluginSessionsDirectoryName));

	await writeJSON(join(directory, "plugin.json"), { name: antigravityPluginName, description: antigravityPluginDescription }, { spaces: "\t" });
	await writeJSON(join(directory, "mcp_config.json"), createAntigravityMcpConfiguration(options), { spaces: "\t" });
	await writeJSON(join(directory, "hooks.json"), createAntigravityHooks(), { spaces: "\t" });
	await writeJSON(join(directory, antigravityPluginSessionsDirectoryName, sessionId), { pid: process.pid });

	const skillsDirectory = skillsPluginDirectory ? join(skillsPluginDirectory, "skills") : null;
	if (skillsDirectory && (await pathExists(skillsDirectory))) {
		await remove(join(directory, "skills"));
		await copy(skillsDirectory, join(directory, "skills"));
	}
}

/**
 * Removes the given session from the plugin of the assistant, and the plugin once no session of the assistant uses it
 * anymore: the other sessions of Antigravity CLI of the user don't start the MCP server of the editor. Never throws.
 * @param sessionId defines the identifier of the session of the assistant.
 */
export async function removeAntigravityPlugin(sessionId: string): Promise<void> {
	try {
		const directory = getAntigravityPluginDirectory();
		if (!(await isAntigravityPluginOfEditor(directory))) {
			return;
		}

		const sessionsDirectory = join(directory, antigravityPluginSessionsDirectoryName);
		await remove(join(sessionsDirectory, sessionId));

		if (!(await isAntigravityPluginUsed(sessionsDirectory))) {
			await remove(directory);
		}
	} catch (e) {
		// Removed the next time.
	}
}

/**
 * Returns the arguments Antigravity CLI is started with.
 * @param resume defines wether or not to continue the last conversation of the project instead of starting a new one.
 */
export function getAntigravityArguments(resume: boolean): string[] {
	return resume ? ["--continue"] : [];
}

/**
 * Returns the environment variables to give to Antigravity CLI so the MCP server of the editor it starts is connected
 * to the window the assistant belongs to, and its hooks to the assistant.
 * @param options defines the HTTP server of the editor window.
 * @param hooksServer defines the HTTP server of the assistant receiving the hook events.
 */
export function getAntigravityEnvironment(options: IAssistantMcpConfigurationOptions, hooksServer: IAssistantHooksServer): Record<string, string> {
	return {
		BABYLONJS_EDITOR_MCP_URL: options.url,
		BABYLONJS_EDITOR_MCP_TOKEN: options.token,
		BABYLONJS_EDITOR_HOOKS_URL: hooksServer.url,
		BABYLONJS_EDITOR_HOOKS_TOKEN: hooksServer.token,
	};
}
