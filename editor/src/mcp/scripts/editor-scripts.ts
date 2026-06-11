import { join as nativeJoin } from "path";
import { dirname, join, basename, relative } from "path/posix";
import { ensureDir, writeFile, pathExists } from "fs-extra";

import { Scene } from "babylonjs";

import { normalizedGlob } from "../../tools/fs";
import { compileScript } from "../../tools/compile";
import { ensureTemporaryDirectoryExists } from "../../tools/project";

import { projectConfiguration } from "../../project/configuration";

import { IMCPActionOptions } from "../action";

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
 * Returns the absolute path of the "agentdata" folder at the root of the project, where agent
 * automation scripts are stored.
 */
function getAgentDataDirectory(): string {
	return join(getProjectDirectory(), "agentdata");
}

/**
 * Normalizes the given script name into a safe, project-relative path under "agentdata" and ensures
 * a ".js" extension. Prevents escaping the agentdata folder.
 * @param name defines the requested script name (may include subfolders).
 */
function resolveAgentScriptPath(name: string): string {
	const normalized = name.replace(/\\/g, "/").replace(/^\.?\/+/, "");
	if (normalized.includes("..") || normalized.length === 0) {
		throw new Error(`Invalid agent script name: "${name}". Use a simple name like "forest.js" (optionally in subfolders, no "..").`);
	}

	const withExtension = normalized.endsWith(".js") ? normalized : `${normalized}.js`;

	return join(getAgentDataDirectory(), withExtension);
}

/**
 * Writes (or overwrites) a `.js` automation script into the project's "agentdata" folder.
 * The script must export `main(editor)`. It can later be executed with `run_agent_script`.
 */
export async function writeAgentScript(_scene: Scene, data: any): Promise<any> {
	if (typeof data.content !== "string") {
		throw new Error("`content` (the JavaScript source of the script) is required.");
	}

	const absolutePath = resolveAgentScriptPath(data.name);
	await ensureDir(dirname(absolutePath));
	await writeFile(absolutePath, data.content, "utf-8");

	return { path: relative(getProjectDirectory(), absolutePath) };
}

/**
 * Lists the `.js` automation scripts available in the project's "agentdata" folder.
 */
export async function listAgentScripts(): Promise<any> {
	const directory = getAgentDataDirectory();

	if (!(await pathExists(directory))) {
		return { scripts: [] };
	}

	const matches = await normalizedGlob(join(directory, "/**/*.js"), {
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
 * Compiles and executes an "agentdata" automation script by calling its `main(editor)` export.
 * Accepts either an existing script `name`, or inline `content` (written first, then executed).
 * The script runs with full access to the `editor` mediator; see `get_editor_api`.
 */
export async function runAgentScript(_scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const editor = options.editor;

	if (!data.name && data.content === undefined) {
		throw new Error("Provide a script `name` to run, or inline `content` to write-and-run.");
	}

	const absolutePath = resolveAgentScriptPath(data.name ?? "agent-script.js");

	// When inline content is provided, (over)write the script first.
	if (data.content !== undefined) {
		await ensureDir(dirname(absolutePath));
		await writeFile(absolutePath, data.content, "utf-8");
	} else if (!(await pathExists(absolutePath))) {
		throw new Error(`Agent script not found: ${relative(getProjectDirectory(), absolutePath)}. Write it first with write_agent_script.`);
	}

	// Compile with the same pipeline the editor's "Run script" feature uses.
	const temporaryDirectory = await ensureTemporaryDirectoryExists(projectConfiguration.path!);
	const outfile = join(temporaryDirectory, "agent-scripts", basename(absolutePath).replace(/\.js$/, ".cjs"));

	await compileScript({
		outfile,
		entryPoints: [absolutePath],
	});

	let returned: any;
	try {
		const compiled = require(outfile);
		if (typeof compiled.main !== "function") {
			throw new Error('The script must export a "main" function: export function main(editor) { ... }');
		}

		returned = await compiled.main(editor);
	} finally {
		delete require.cache[nativeJoin(outfile)];
	}

	// Reflect any changes the script made in the editor UI.
	await editor.layout.graph.refresh();
	editor.layout.assets.refresh();

	// Only return primitive results; objects (meshes, etc.) are not serializable for the response.
	const result = returned === null || returned === undefined || typeof returned === "object" ? null : returned;

	return {
		ran: true,
		script: relative(getProjectDirectory(), absolutePath),
		result,
	};
}

/**
 * Returns a reference describing the `editor` mediator object available to agent scripts, so the agent
 * knows what it can do. Derived from the editor sources under /editor/src/editor.
 */
export function getEditorApi(): any {
	const reference = `EDITOR AUTOMATION SCRIPTS — "editor" mediator reference

A runnable script is a .js file in the project's "agentdata/" folder with this skeleton:

    import { Tools, Vector3 } from "babylonjs";

    export function main(editor) {
        // your automation here; may be async (you can return a Promise)
        return "short summary of what was done"; // optional string, shown back to you
    }

Import Babylon from "babylonjs" (also "babylonjs-materials", "babylonjs-gui", "babylonjs-loaders", "babylonjs-post-process", ...). The editor rewrites @babylonjs/* imports automatically, and always injects the editor's own Babylon instance.

The "editor" parameter is the editor's central mediator. Most useful members:

SCENE & RENDERING
- editor.layout.preview.scene        -> the live Babylon.js Scene. Your main entry point: create/find meshes, materials, lights, etc.
- editor.layout.preview.engine       -> the Babylon engine.
- editor.layout.preview.camera       -> the editor camera.
- editor.layout.preview.clusteredLightContainer -> container for non-shadow lights (perf).
- editor.layout.preview.switchToCamera(camera)  -> make a camera active (saves/restores its post-processes).

SCENE GRAPH (left panel) — call after adding/removing nodes so they show up:
- await editor.layout.graph.refresh()
- editor.layout.graph.setSelectedNode(node)
- editor.layout.graph.getSelectedNodes()

INSPECTOR (right panel):
- editor.layout.inspector.setEditedObject(object)
- editor.layout.inspector.forceUpdate()

ASSETS BROWSER:
- editor.layout.assets.refresh()

CONSOLE (visible to the user in the editor, NOT returned to you):
- editor.layout.console.log(msg) / .warn(msg) / .error(msg)

PROJECT / APP:
- editor.path -> the editor application path.

CONVENTIONS
- Units are centimeters. Pass editor.layout.preview.scene to Babylon constructors / MeshBuilder so new objects join the live scene.
- MANDATORY: every entity you create (mesh, instance, light, camera, transform node, material, ...) MUST have BOTH an "id" and a "uniqueId" set, otherwise the editor inspector, selection and serialization break:
      import { Tools } from "babylonjs";
      import { UniqueNumber } from "babylonjs-editor";
      entity.id = Tools.RandomId();
      entity.uniqueId = UniqueNumber.Get();
- Prefer source-mesh.createInstance(name) for many copies (cheap) over cloning; set instance.parent = sourceMesh.parent (and the id/uniqueId above).
- After building, call: await editor.layout.graph.refresh() and select a representative node.
- The editor source under /editor/src/editor (preview, layout, graph, inspector, assets-browser) documents the full surface if you need more.

EXAMPLE — scatter a forest from an existing "Tree" mesh:

    import { Tools, Vector3 } from "babylonjs";
    import { UniqueNumber } from "babylonjs-editor";

    export function main(editor) {
        const scene = editor.layout.preview.scene;
        const tree = scene.getMeshByName("Tree");
        if (!tree) { return "No mesh named 'Tree' found — import one first."; }

        for (let i = 0; i < 200; i++) {
            const inst = tree.createInstance("Tree " + i);
            inst.id = Tools.RandomId();
            inst.uniqueId = UniqueNumber.Get();
            inst.parent = tree.parent;
            inst.position = new Vector3((Math.random() - 0.5) * 20000, 0, (Math.random() - 0.5) * 20000);
            inst.rotation.y = Math.random() * Math.PI * 2;
            const s = 0.8 + Math.random() * 0.5;
            inst.scaling.set(s, s, s);
        }

        editor.layout.graph.refresh();
        return "Created 200 tree instances.";
    }

USE AGENT SCRIPTS WHEN a task is too complex or too voluminous for the individual MCP tools: custom/procedural geometry, algorithmic scattering, bulk programmatic edits. For ordinary scene building, PREFER the dedicated MCP tools so the result stays simple and hand-editable. Whatever the script creates becomes real editor content the user can keep editing by hand.`;

	return { reference };
}
