import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerScriptTools(server: McpServer): void {
	server.registerTool(
		"list_scripts",
		{
			title: "List scripts",
			description: "List the TypeScript scripts under the project's `src/` folder. Scripts implement behaviors (`onStart`/`onUpdate`/`onStop`) and are attached to nodes.",
			inputSchema: z.object({}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("list_scripts", args)
	);

	server.registerTool(
		"create_script",
		{
			title: "Create script",
			description:
				"Create a new TypeScript script using the editor's default skeleton. The path MUST live under `src/**` (scripts outside `src/` are not valid editor scripts). " +
				"Scripts are for runtime BEHAVIOR ONLY (input, movement, game rules, AI, collision reactions, runtime spawning) — NOT for building the scene. " +
				"Before writing a script, author the geometry, materials, lights and props with the editor tools (`create_primitive_mesh`, `instantiate_mesh_asset`, `create_material`, `create_instance`, `create_light`, `set_mesh_physics`) so they remain real, hand-editable assets. " +
				"After creating, edit it with `write_script` and attach it to a node with `attach_script`.",
			inputSchema: z.object({
				path: z.string().describe("Project path for the new script under `src/`, e.g. `src/door.ts`."),
				className: z.string().optional().describe("Optional class name to use in the skeleton."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("create_script", args)
	);

	server.registerTool(
		"read_script",
		{
			title: "Read script",
			description: "Read the content of a TypeScript script file. Use before `write_script` to make incremental edits without losing existing code.",
			inputSchema: z.object({
				path: z.string().describe("Project path of the script under `src/`."),
			}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("read_script", args)
	);

	server.registerTool(
		"write_script",
		{
			title: "Write script",
			description:
				"Overwrite a script's content. The file must be under `src/**`. Implement runtime behaviors with the editor's `IScript` interface (`onStart`/`onUpdate`/`onStop`) and export inspector-editable values where it helps reuse. " +
				"Keep scripts to LOGIC, not scene construction: do not use `new Mesh`/`MeshBuilder`/`new StandardMaterial`/`new ...Light` to build geometry, materials or lighting in code — that content must be authored with the editor tools so the user can hand-edit it. " +
				"Reference already-authored assets from the script (e.g. look them up by name, or expose exported values set via `set_script_exported_value`). " +
				"Example: a door that opens when the player is near checks distance in `onUpdate` and plays an animation on the existing authored door mesh.",
			inputSchema: z.object({
				path: z.string().describe("Project path of the script under `src/`."),
				content: z.string().describe("The full new content of the script file."),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("write_script", args)
	);

	server.registerTool(
		"attach_script",
		{
			title: "Attach script",
			description:
				"Attach a script file to a node (the scene itself can also have scripts). This writes the node's script metadata exactly as the inspector's Scripts section does, so the attachment is visible to the user. " +
				"The script is compiled: the result lists its inspector properties (`@visibleAs*`, `@visibleAsEntity`, `@visibleAsAsset`) with their types and default values — configure them with `set_script_exported_value` — " +
				"or its `compileError` to fix with `write_script`. Attach the script again after adding properties to it, then check it with `play_scene`.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				path: z.string().describe("Project path of the script under `src/` to attach."),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("attach_script", args)
	);

	server.registerTool(
		"list_attached_scripts",
		{
			title: "List attached scripts",
			description:
				"List the scripts attached to a node with their inspector properties (key, type, entity/asset type, current value), or their `compileError`. " +
				"Use this to discover which values you can tune with `set_script_exported_value`.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
			}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("list_attached_scripts", args)
	);

	server.registerTool(
		"set_script_exported_value",
		{
			title: "Set script exported value",
			description:
				"Set an inspector value of a script attached to a node (a property decorated with `@visibleAs*`, `@visibleAsEntity` or `@visibleAsAsset`). This lets you configure the same reusable script differently per object (e.g. speed, sensitivity, the camera to drive). " +
				"The value is checked and converted for the type of the property: number, boolean, string; vector2/vector3 as `[x, y, z]`; color3/color4 as `[r, g, b(, a)]` in 0..1 or `#rrggbb`; " +
				'keymap as a key ("w", "Space", "Shift"); entity as the id or name of a node, sound or particle system, or the name of an animation group; asset as the project path of the file (e.g. `assets/rifle.json`); ' +
				"texture as the project path of an image; `null` clears an entity, asset or texture.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				path: z.string().describe("Project path of the attached script."),
				key: z.string().describe("Name of the decorated property to set (its property name in the script, or its inspector label)."),
				value: z.any().describe("The new value, in the format of its type (see the description)."),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("set_script_exported_value", args)
	);

	server.registerTool(
		"detach_script",
		{
			title: "Detach script",
			description: "Remove an attached script from a node.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				path: z.string().describe("Project path of the attached script to remove."),
			}),
			annotations: { destructiveHint: true, idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("detach_script", args)
	);
}
