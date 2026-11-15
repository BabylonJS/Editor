import { remove } from "fs-extra";
import { dirname, join } from "path/posix";

import { temporaryDirectoryName } from "../tools/project";

/**
 * Defines the name of the folder, at the root of the project, where the AI agents write the automation scripts they
 * run in the editor (see the "write_agent_script" and "run_agent_script" MCP tools).
 */
export const agentDataDirectoryName = "agentdata";

/**
 * Returns the absolute path of the folder where the AI agents write their automation scripts.
 * @param projectPath defines the absolute path of the project file (".bjseditor").
 */
export function getAgentDataDirectory(projectPath: string): string {
	return join(dirname(projectPath.replace(/\\/g, "/")), agentDataDirectoryName);
}

/**
 * Returns the absolute path of the folder where the automation scripts of the AI agents are compiled.
 * @param projectPath defines the absolute path of the project file (".bjseditor").
 */
export function getAgentScriptsBuildDirectory(projectPath: string): string {
	return join(dirname(projectPath.replace(/\\/g, "/")), temporaryDirectoryName, "agent-scripts");
}

/**
 * Removes the automation scripts of the AI agents from the project, once an agent finished its work: they only help it
 * build content, and what they create lives in the scene. Never throws: a folder in use is removed the next time.
 * @param projectPath defines the absolute path of the project file (".bjseditor"), if a project is open.
 */
export async function removeAgentData(projectPath: string | null): Promise<void> {
	if (!projectPath) {
		return;
	}

	await Promise.all(
		[getAgentDataDirectory(projectPath), getAgentScriptsBuildDirectory(projectPath)].map(async (directory) => {
			try {
				await remove(directory);
			} catch (e) {
				// Removed the next time.
			}
		})
	);
}
