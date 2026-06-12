import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerSceneTools(server: McpServer): void {
	server.registerTool(
		"get_scene_hierarchy",
		{
			title: "Get scene hierarchy",
			description:
				"Retrieve the hierarchy of nodes in the current scene as a tree of `{ id, name, type, children[] }`. " +
				"This is the starting point for almost every task: call it first to understand what already exists, find existing meshes/lights/cameras to reuse, and get the `id` of nodes you want to modify. " +
				"Most other tools accept a `nodeId` (preferred) or `nodeName` taken from this tree. " +
				"Typical workflow to build a scene: `get_scene_hierarchy` to inspect, then `create_primitive_mesh`/`create_light`/`create_camera`/`instantiate_mesh_asset` to add content, then `get_screenshot` to verify the result.",
			inputSchema: z.object({
				rootNodeName: z.string().optional().describe("Name of the root node to get the hierarchy from. If not provided, the whole scene hierarchy is returned."),
			}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("get_scene_hierarchy", args)
	);

	server.registerTool(
		"list_scenes",
		{
			title: "List scenes",
			description: "List all `.scene` assets in the project, including which one is currently active. A project can contain multiple scenes that share the same assets.",
			inputSchema: z.object({}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("list_scenes", args)
	);

	server.registerTool(
		"get_active_scene",
		{
			title: "Get active scene",
			description:
				"Get the name/path of the currently edited scene plus counts of meshes, lights and materials. Useful to gauge scene complexity before adding more content.",
			inputSchema: z.object({}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("get_active_scene", args)
	);

	server.registerTool(
		"save_scene",
		{
			title: "Save scene",
			description: "Save the current scene/project to disk. Call this once you are satisfied with the result so the user's work is persisted.",
			inputSchema: z.object({}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("save_scene", args)
	);

	server.registerTool(
		"get_scene_settings",
		{
			title: "Get scene settings",
			description:
				"Get scene-level settings: clear color, ambient color, environment texture, fog and active camera. Inspect these before tuning the overall mood/lighting of a scene.",
			inputSchema: z.object({}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("get_scene_settings", args)
	);

	server.registerTool(
		"set_scene_settings",
		{
			title: "Set scene settings",
			description:
				"Set scene-level settings via dotted property paths (e.g. `clearColor`, `ambientColor`, `fogMode`, `fogColor`, `fogDensity`). " +
				"Color values can be passed as `[r,g,b]` arrays and are coerced to the existing property type. " +
				"Use this for atmosphere tuning, e.g. a warm clear color for a sunset scene.",
			inputSchema: z.object({
				properties: z
					.record(z.string(), z.any())
					.describe(
						"Map of dotted property path to value. Arrays like `[r,g,b]` are coerced to Color3/Color4 and `[x,y,z]` to Vector3 based on the existing property type."
					),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("set_scene_settings", args)
	);
}
