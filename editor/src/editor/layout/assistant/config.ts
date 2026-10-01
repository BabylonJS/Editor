import { join } from "path";
import { ensureDir, writeJSON } from "fs-extra";

import { MCPTokenHeader } from "../../../mcp/server";

import { compareVersions } from "./executable";
import { assistantHookEvents } from "./hooks";

/**
 * Defines the name of the MCP server of the editor in the configuration given to Claude Code. Its tools are named
 * "mcp__babylonjs-editor__<tool>" in Claude Code.
 */
export const assistantMcpServerName = "babylonjs-editor";

/**
 * Defines the time, in seconds, Claude Code waits for the assistant to receive a hook event. The assistant answers
 * right away: a busy editor must not keep Claude Code waiting for longer.
 */
export const assistantHookTimeout = 5;

/**
 * Defines the tools of the editor Claude Code may use without asking the user first: reading the project, and
 * composing the scene with content the user sees appear live. Deleting, saving, downloading, writing or running code
 * (playing the scene runs the scripts of the project) and batches (which can run any tool) keep asking, as Claude
 * Code does by default.
 */
export const assistantAllowedEditorTools = [
	// Scene & nodes
	"get_scene_hierarchy",
	"list_scenes",
	"get_active_scene",
	"get_scene_settings",
	// The editor asks the user to confirm it itself.
	"save_scene",
	"set_scene_settings",
	"get_node",
	"set_node_transform",
	"set_node_properties",
	"set_node_parent",
	"rename_node",
	"select_node",
	"get_selected_nodes",
	// Meshes, lights & cameras
	"create_primitive_mesh",
	"create_instance",
	"clone_mesh",
	"set_mesh_material",
	"set_mesh_visibility",
	"set_mesh_physics",
	"get_mesh_bounding_info",
	"create_decal",
	"update_decal",
	"create_light",
	"set_light_shadows",
	"remove_light_shadows",
	"create_clustered_light_container",
	"add_light_to_clustered_container",
	"remove_light_from_clustered_container",
	"create_camera",
	"set_active_camera",
	"get_camera_post_processes",
	"set_camera_post_process",
	// Terrains: every edit is undoable. "export_terrain_heightmap" keeps asking: it writes files outside the scene data.
	"get_terrain_info",
	"create_terrain",
	"sculpt_terrain",
	"paint_terrain",
	"set_terrain_layer",
	"auto_paint_terrain",
	"generate_terrain",
	"modify_terrain",
	"import_terrain_heightmap",
	"list_terrain_brushes",
	"add_terrain_brush",
	"sample_terrain",
	"snap_nodes_to_terrain",
	"set_terrain_material",
	// Materials & assets
	"list_materials",
	"list_material_types",
	"create_material",
	"set_material_properties",
	"assign_texture_to_material",
	"set_environment_texture",
	"list_assets",
	"get_asset_preview",
	"instantiate_mesh_asset",
	"import_asset",
	"reload_asset",
	// Particles, sounds & animations
	"list_particle_assets",
	"instantiate_particle_system",
	"list_sound_assets",
	"create_sound",
	"set_sound_properties",
	"list_animation_groups",
	"play_animation_group",
	"stop_animation_group",
	"create_animation",
	// Marketplace, scripts & verification (read only)
	"get_instructions",
	"open_marketplace",
	"search_marketplace",
	"list_scripts",
	"read_script",
	"list_attached_scripts",
	"get_editor_api",
	"list_agent_scripts",
	"get_screenshot",
	"focus_node",
	// Play-testing: controlling and reading the game once the user allowed "play_scene", which runs its scripts.
	"stop_scene",
	"simulate_input",
	"inspect_play_scene",
	"get_console_logs",
];

export interface IAssistantMcpConfigurationOptions {
	/**
	 * Defines the absolute path of the executable of the editor, which runs the MCP server as Node.js does.
	 */
	executablePath: string;
	/**
	 * Defines the absolute path of the bundled MCP server script.
	 */
	serverScriptPath: string;
	/**
	 * Defines the URL of the HTTP server of the editor window the assistant belongs to.
	 */
	url: string;
	/**
	 * Defines the token the HTTP server of the editor expects.
	 */
	token: string;
}

/**
 * Creates the MCP configuration given to Claude Code: the MCP server of the editor, run by the executable of the
 * editor itself so no Node.js installation is needed, and connected to the window the assistant belongs to.
 */
export function createAssistantMcpConfiguration(options: IAssistantMcpConfigurationOptions): object {
	return {
		mcpServers: {
			[assistantMcpServerName]: {
				type: "stdio",
				command: options.executablePath,
				args: [options.serverScriptPath],
				env: {
					ELECTRON_RUN_AS_NODE: "1",
					BABYLONJS_EDITOR_MCP_URL: options.url,
					BABYLONJS_EDITOR_MCP_TOKEN: options.token,
					BABYLONJS_EDITOR_ASSISTANT: "1",
				},
			},
		},
	};
}

export interface IAssistantHooksConfigurationOptions {
	/**
	 * Defines the URL of the HTTP server of the assistant that receives the hook events.
	 */
	url: string;
	/**
	 * Defines the token the HTTP server of the assistant expects.
	 */
	token: string;
}

/**
 * Creates the hooks given to Claude Code so it tells the assistant what it is doing: each event is sent as a POST
 * request to "<url>/<event>".
 */
export function createAssistantHooks(options: IAssistantHooksConfigurationOptions): object {
	const hooks: Record<string, object[]> = {};

	assistantHookEvents.forEach((event) => {
		hooks[event] = [
			{
				hooks: [
					{
						type: "http",
						url: `${options.url}/${event}`,
						headers: {
							[MCPTokenHeader]: options.token,
						},
						timeout: assistantHookTimeout,
					},
				],
			},
		];
	});

	return hooks;
}

/**
 * Creates the additional settings given to Claude Code for the session.
 * @param hooks defines the HTTP server of the assistant the hook events are sent to, if the version of Claude Code
 * supports it.
 */
export function createAssistantSettings(hooks: IAssistantHooksConfigurationOptions | null = null): object {
	return {
		permissions: {
			allow: assistantAllowedEditorTools.map((tool) => `mcp__${assistantMcpServerName}__${tool}`),
		},
		...(hooks ? { hooks: createAssistantHooks(hooks) } : {}),
	};
}

/**
 * Defines the oldest version of Claude Code the assistant gives its plugin to. Claude Code refuses to start with an
 * option it doesn't know, and "--plugin-dir" is known to exist in this version.
 */
export const assistantPluginMinimumClaudeVersion = "2.1.101";

/**
 * Returns wether or not the given version of Claude Code can load the plugin of the assistant for the session.
 * @param claudeVersion defines the version of Claude Code, like "2.1.283".
 */
export function supportsAssistantPlugin(claudeVersion: string): boolean {
	return compareVersions(claudeVersion, assistantPluginMinimumClaudeVersion) >= 0;
}

/**
 * Returns the arguments Claude Code is started with.
 * @param mcpConfigurationPath defines the absolute path of the MCP configuration file.
 * @param settingsPath defines the absolute path of the settings file.
 * @param resume defines wether or not to continue the last conversation of the project instead of starting a new one.
 * @param pluginDirectory defines the absolute path of the plugin of the assistant, holding the skills of the editor,
 * loaded for the session only.
 */
export function getClaudeArguments(mcpConfigurationPath: string, settingsPath: string, resume: boolean, pluginDirectory: string | null = null): string[] {
	return ["--mcp-config", mcpConfigurationPath, "--settings", settingsPath, ...(pluginDirectory ? ["--plugin-dir", pluginDirectory] : []), ...(resume ? ["--continue"] : [])];
}

/**
 * Returns the command line cmd.exe runs a batch file (like the "claude.cmd" npm creates) with, on Windows.
 * @param batchFile defines the absolute path of the batch file.
 * @param args defines the arguments, which must not contain double quotes.
 */
export function getWindowsBatchCommandLine(batchFile: string, args: string[]): string {
	return `/d /s /c ""${batchFile}" ${args.map((arg) => `"${arg}"`).join(" ")}"`;
}

/**
 * Returns the absolute path of the MCP server bundled with the editor. In a packaged editor, it is unpacked from the
 * asar archive so another process can run it.
 * @param appPath defines the path of the application, as returned by "app.getAppPath()".
 */
export function getAssistantMcpServerScriptPath(appPath: string): string {
	return join(appPath, "build", "mcp", "index.mjs").replace(/app\.asar([\\/])/, "app.asar.unpacked$1");
}

/**
 * Returns the absolute path of the plugin of the assistant bundled with the editor: the skills of the editor, built
 * from the ones of the website. In a packaged editor, it is unpacked from the asar archive so the agents can read it.
 * @param appPath defines the path of the application, as returned by "app.getAppPath()".
 */
export function getAssistantPluginDirectory(appPath: string): string {
	return join(appPath, "build", "assistant", "plugin").replace(/app\.asar([\\/])/, "app.asar.unpacked$1");
}

/**
 * Writes the MCP configuration and the settings of the session in the given folder, only readable by the user as
 * they hold the tokens of the editor.
 * @param hooks defines the HTTP server of the assistant the hook events are sent to, if the version of Claude Code
 * supports it.
 * @returns the absolute paths of the two files.
 */
export async function writeAssistantConfiguration(
	directory: string,
	options: IAssistantMcpConfigurationOptions,
	hooks: IAssistantHooksConfigurationOptions | null = null
): Promise<{ mcpConfigurationPath: string; settingsPath: string }> {
	await ensureDir(directory, { mode: 0o700 });

	const mcpConfigurationPath = join(directory, "mcp.json");
	const settingsPath = join(directory, "settings.json");

	await writeJSON(mcpConfigurationPath, createAssistantMcpConfiguration(options), { spaces: "\t", mode: 0o600 });
	await writeJSON(settingsPath, createAssistantSettings(hooks), { spaces: "\t", mode: 0o600 });

	return { mcpConfigurationPath, settingsPath };
}
