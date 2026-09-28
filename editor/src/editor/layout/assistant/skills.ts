import { createHash } from "crypto";
import { join, relative } from "path";
import { copy, pathExists, readdir, readFile, readJSON, remove, stat, writeJSON } from "fs-extra";

/**
 * Defines the name of the file the assistant writes in each skill it installs in a project. It holds the hash of the
 * files installed, to know if the user modified the skill since.
 */
export const assistantSkillMarkerFileName = ".babylonjs-editor-skill.json";

/**
 * Defines what happened to a skill when installing it in a project:
 * - "installed": the skill was not in the project and was copied.
 * - "updated": the skill installed by the editor was replaced by the version of this editor.
 * - "up-to-date": the skill installed by the editor is already the version of this editor.
 * - "kept": the skill was modified by the user, or not installed by the editor, and was left as is.
 */
export type AssistantSkillInstallResult = "installed" | "updated" | "up-to-date" | "kept";

async function listSkillFiles(directory: string): Promise<string[]> {
	const files: string[] = [];

	for (const name of await readdir(directory)) {
		const path = join(directory, name);

		if ((await stat(path)).isDirectory()) {
			files.push(...(await listSkillFiles(path)));
		} else if (name !== assistantSkillMarkerFileName) {
			files.push(path);
		}
	}

	return files;
}

/**
 * Returns the hash of the files of the given skill, the file of the editor excluded.
 * @param directory defines the absolute path of the folder of the skill.
 */
export async function getSkillHash(directory: string): Promise<string> {
	const hash = createHash("sha256");
	const files = (await listSkillFiles(directory)).map((path) => ({ path, name: relative(directory, path).replace(/\\/g, "/") }));

	files.sort((a, b) => a.name.localeCompare(b.name));

	for (const file of files) {
		hash.update(file.name);
		hash.update("\0");
		hash.update(await readFile(file.path));
		hash.update("\0");
	}

	return hash.digest("hex");
}

async function copySkill(sourceDirectory: string, targetDirectory: string, hash: string): Promise<void> {
	await copy(sourceDirectory, targetDirectory);
	await writeJSON(
		join(targetDirectory, assistantSkillMarkerFileName),
		{
			hash,
			description: "Installed by the Babylon.js Editor for the AI assistant. It is updated with the editor as long as the files of the skill are not modified.",
		},
		{ spaces: "\t" }
	);
}

/**
 * Installs the given skill in the given folder, or updates the version the editor installed there before. A skill the
 * user modified, or didn't come from the editor, is never replaced.
 * @param sourceDirectory defines the absolute path of the folder of the skill bundled with the editor.
 * @param targetDirectory defines the absolute path of the folder of the skill in the project.
 */
export async function installAssistantSkill(sourceDirectory: string, targetDirectory: string): Promise<AssistantSkillInstallResult> {
	const sourceHash = await getSkillHash(sourceDirectory);

	if (!(await pathExists(targetDirectory))) {
		await copySkill(sourceDirectory, targetDirectory, sourceHash);
		return "installed";
	}

	let marker: { hash?: string } | null = null;
	try {
		marker = await readJSON(join(targetDirectory, assistantSkillMarkerFileName));
	} catch (e) {
		// Not installed by the editor.
	}

	if (!marker?.hash || (await getSkillHash(targetDirectory)) !== marker.hash) {
		return "kept";
	}

	if (marker.hash === sourceHash) {
		return "up-to-date";
	}

	await remove(targetDirectory);
	await copySkill(sourceDirectory, targetDirectory, sourceHash);

	return "updated";
}

/**
 * Installs the skills of the plugin of the assistant in the "agents" skills folder of the project ("<project>/.agents/skills"),
 * where Codex finds the skills of a project: Codex can't load skills from another folder for a single session.
 * @param pluginDirectory defines the absolute path of the plugin of the assistant bundled with the editor.
 * @param projectDirectory defines the absolute path of the root folder of the project.
 * @returns what happened to each skill, by name.
 */
export async function installAssistantSkillsInProject(pluginDirectory: string, projectDirectory: string): Promise<Record<string, AssistantSkillInstallResult>> {
	const skillsDirectory = join(pluginDirectory, "skills");
	if (!(await pathExists(skillsDirectory))) {
		return {};
	}

	const results: Record<string, AssistantSkillInstallResult> = {};

	for (const name of await readdir(skillsDirectory)) {
		const sourceDirectory = join(skillsDirectory, name);
		if (!(await stat(sourceDirectory)).isDirectory()) {
			continue;
		}

		results[name] = await installAssistantSkill(sourceDirectory, join(projectDirectory, ".agents", "skills", name));
	}

	return results;
}
