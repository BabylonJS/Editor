import { dirname, join, isAbsolute, basename, relative } from "path/posix";
import { ensureDir, pathExists, readFile, writeFile } from "fs-extra";

import { Tools, Scene } from "babylonjs";

import { normalizedGlob } from "../../tools/fs";

import { projectConfiguration } from "../../project/configuration";

import { IMCPActionOptions } from "../action";
import { resolveNode, toNodeSummary } from "../tools/resolve";

import { getScriptProperties, getScriptPropertyValue, updateScriptValues } from "./values";

/**
 * Returns the absolute path of the project directory.
 */
function getProjectDirectory(): string {
	if (!projectConfiguration.path) {
		throw new Error("No project is currently open.");
	}

	return dirname(projectConfiguration.path);
}

/**
 * Returns the absolute path of the project "src" directory.
 */
function getSrcDirectory(): string {
	return join(getProjectDirectory(), "src");
}

/**
 * Resolves an absolute path under the project "src" directory.
 * Scripts MUST live under src/**.
 */
function resolveScriptPath(path: string): string {
	const absolute = isAbsolute(path) ? path : join(getProjectDirectory(), path);

	const srcDir = join(getSrcDirectory(), "/");
	if (!join(absolute, "/").startsWith(srcDir) && !absolute.startsWith(srcDir.slice(0, -1))) {
		throw new Error(`Scripts must live under "src/". Got: ${path}`);
	}

	return absolute;
}

/**
 * Returns the script metadata key (path relative to "src/") for the given absolute path.
 */
function getScriptKey(absolutePath: string): string {
	return relative(getSrcDirectory(), absolutePath).replace(/\\/g, "/");
}

/**
 * Lists all the TypeScript scripts under the project "src" directory.
 */
export async function listScripts(): Promise<any> {
	const srcDir = getSrcDirectory();

	const matches = await normalizedGlob(join(srcDir, "/**/*.{ts,tsx}"), {
		nodir: true,
		ignore: ["**/node_modules/**"],
	});

	return {
		scripts: (matches as string[]).map((matchPath) => {
			const path = matchPath.toString();
			return {
				name: basename(path),
				path: relative(getProjectDirectory(), path),
			};
		}),
	};
}

/**
 * Creates a new TypeScript script with the editor's default skeleton under "src/".
 */
export async function createScript(_scene: Scene, data: any): Promise<any> {
	const absolutePath = resolveScriptPath(data.path);
	await ensureDir(dirname(absolutePath));

	// Reuse the editor's class-based script skeleton.
	let content = await fetch("assets/class-based-script.ts").then((r) => r.text());

	if (data.className) {
		content = content.replace("MyScriptComponent", data.className);
	}

	await writeFile(absolutePath, content, { encoding: "utf-8" });

	return { path: relative(getProjectDirectory(), absolutePath) };
}

/**
 * Reads a script's content.
 */
export async function readScript(_scene: Scene, data: any): Promise<any> {
	const absolutePath = resolveScriptPath(data.path);

	if (!(await pathExists(absolutePath))) {
		throw new Error(`Script not found: ${data.path}`);
	}

	const content = await readFile(absolutePath, { encoding: "utf-8" });
	return { content };
}

/**
 * Overwrites/updates a script's content.
 */
export async function writeScript(_scene: Scene, data: any): Promise<any> {
	const absolutePath = resolveScriptPath(data.path);
	await ensureDir(dirname(absolutePath));

	await writeFile(absolutePath, data.content ?? "", { encoding: "utf-8" });

	return { path: relative(getProjectDirectory(), absolutePath) };
}

/**
 * Returns the decorated properties of the given attached script with their values, after updating the values saved in
 * the metadata of the object. A script that doesn't compile is reported with its error.
 */
async function getAttachedScriptDescription(script: any): Promise<any> {
	const description: any = {
		path: join("src", script.key),
		enabled: script.enabled,
	};

	try {
		description.properties = getScriptProperties(script, await updateScriptValues(script));
	} catch (e) {
		// The loader of the game requires the values of a script with decorated properties.
		script.values ??= {};

		description.compileError = e instanceof Error ? e.message : String(e);
		description.properties = [];
	}

	return description;
}

/**
 * Attaches a script file to a node, writing the node script metadata as the inspector does.
 */
export async function attachScript(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });
	const absolutePath = resolveScriptPath(data.path);
	const key = getScriptKey(absolutePath);

	if (!(await pathExists(absolutePath))) {
		throw new Error(`Script not found: ${data.path}`);
	}

	node.metadata ??= {};
	node.metadata.scripts ??= [];

	let script = node.metadata.scripts.find((script) => script.key === key);
	if (!script) {
		script = {
			_id: Tools.RandomId(),
			enabled: true,
			key,
		};

		node.metadata.scripts.push(script);
	}

	const description = await getAttachedScriptDescription(script);

	options.editor.layout.inspector.setEditedObject(node);
	options.editor.layout.inspector.forceUpdate();

	return {
		...toNodeSummary(node),
		script: description,
	};
}

/**
 * Lists the scripts attached to a node and their exported values.
 */
export async function listAttachedScripts(scene: Scene, data: any): Promise<any> {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	const scripts: any[] = [];
	for (const script of node.metadata?.scripts ?? []) {
		scripts.push(await getAttachedScriptDescription(script));
	}

	return { scripts };
}

/**
 * Sets an exported/inspector value of an attached script on a node.
 */
export async function setScriptExportedValue(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });
	const absolutePath = resolveScriptPath(data.path);
	const key = getScriptKey(absolutePath);

	const script = node.metadata?.scripts?.find((s) => s.key === key);
	if (!script) {
		throw new Error(`Script "${data.path}" is not attached to node "${node.name}".`);
	}

	const output = await updateScriptValues(script);

	const property = output.find((property) => property.propertyKey === data.key) ?? output.find((property) => property.label === data.key);
	if (!property) {
		const available = output.map((property) => `${property.propertyKey} (${property.configuration.type})`).join(", ");
		throw new Error(`Script "${data.path}" has no property "${data.key}" shown in the inspector. Available: ${available || "none (decorate properties with @visibleAs*)"}.`);
	}

	script.values[property.propertyKey].value = await getScriptPropertyValue(scene, property, data.value);

	options.editor.layout.inspector.setEditedObject(node);
	options.editor.layout.inspector.forceUpdate();

	return {
		...toNodeSummary(node),
		script: {
			path: join("src", key),
			properties: getScriptProperties(script, output),
		},
	};
}

/**
 * Removes an attached script from a node.
 */
export function detachScript(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });
	const absolutePath = resolveScriptPath(data.path);
	const key = getScriptKey(absolutePath);

	if (node.metadata?.scripts) {
		const index = node.metadata.scripts.findIndex((s) => s.key === key);
		if (index !== -1) {
			node.metadata.scripts.splice(index, 1);
		}
	}

	options.editor.layout.inspector.setEditedObject(node);
	options.editor.layout.inspector.forceUpdate();

	return toNodeSummary(node);
}
