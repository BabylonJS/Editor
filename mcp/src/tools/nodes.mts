import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerNodeTools(server: McpServer): void {
	server.registerTool(
		"get_node",
		{
			title: "Get node",
			description:
				"Get full details of a single node: id, name, className, position, rotation, scaling, enabled/visible state, parent id, material id and metadata. " +
				"Address the node by `nodeId` (preferred, the Babylon `node.id`) or `nodeName`. Use it to read current values before modifying them.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred). Get it from `get_scene_hierarchy`."),
				nodeName: z.string().optional().describe("Name of the target node. Used only if `nodeId` is not provided or does not resolve."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("get_node", args)
	);

	server.registerTool(
		"set_node_transform",
		{
			title: "Set node transform",
			description:
				"Set a node's transform. Works for meshes/transform nodes (position/rotation/scaling), lights (position and/or direction) and cameras (position, rotation and/or target). " +
				"Positions/targets are in editor units (centimeters); rotation/direction are in radians/world units. Only the provided and node-supported fields are applied; " +
				"the change is reflected live in the editor inspector. Use `get_node` first to see which of these properties a given node exposes.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				position: z.array(z.number()).length(3).optional().describe("World position `[x,y,z]` in centimeters (meshes, cameras, point/spot/directional lights)."),
				rotation: z.array(z.number()).length(3).optional().describe("Euler rotation `[x,y,z]` in radians (meshes, transform nodes, free/universal cameras)."),
				scaling: z.array(z.number()).length(3).optional().describe("Scaling `[x,y,z]` (meshes and transform nodes only)."),
				direction: z.array(z.number()).length(3).optional().describe("Direction vector `[x,y,z]` for directional/spot/hemispheric lights (the way the light points)."),
				target: z.array(z.number()).length(3).optional().describe("Point `[x,y,z]` (centimeters) a camera looks at. Applies to cameras that support `setTarget`."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("set_node_transform", args)
	);

	server.registerTool(
		"set_node_properties",
		{
			title: "Set node properties",
			description:
				'Deep-set arbitrary node properties by dotted path, e.g. `"material.albedoColor"`, `"isVisible"`, `"receiveShadows"`. ' +
				"Values may be numbers, strings, booleans, or `[r,g,b]`/`[x,y,z]` arrays which are coerced to Color3/Vector3 based on the existing property type. " +
				"This is the catch-all for DEEP customization not covered by a dedicated tool — including built-in collisions: " +
				'`"checkCollisions"` (true to make a mesh block moveWithCollisions), `"ellipsoid"`/`"ellipsoidOffset"` ([x,y,z], the collider used for character-style movement), `"isPickable"`, `"applyGravity"`. ' +
				"For Havok rigid-body physics use `set_mesh_physics` instead. You can set many properties at once via the `properties` map, and many nodes at once via `execute_batch`.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				properties: z.record(z.string(), z.any()).describe("Map of dotted property path to value."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("set_node_properties", args)
	);

	server.registerTool(
		"set_node_parent",
		{
			title: "Set node parent",
			description:
				"Reparent a node while preserving its world transform. Pass `parentId`/`parentName` to set the new parent, or omit both to move the node to the scene root. " +
				"Note: a non-shadow light should live in the ClusteredLightContainer for performance; reparenting such a light into the container attaches it correctly.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the node to reparent (preferred)."),
				nodeName: z.string().optional().describe("Name of the node to reparent."),
				parentId: z.string().optional().describe("Id of the new parent. Omit (and omit parentName) to move to the scene root."),
				parentName: z.string().optional().describe("Name of the new parent."),
				preserveWorldTransform: z.boolean().optional().describe("Keep the node's world transform after reparenting. Defaults to true."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("set_node_parent", args)
	);

	server.registerTool(
		"rename_node",
		{
			title: "Rename node",
			description: "Rename a node. The new name appears immediately in the editor's scene graph.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				newName: z.string().describe("The new name for the node."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("rename_node", args)
	);

	server.registerTool(
		"delete_node",
		{
			title: "Delete node",
			description: "Remove a node and all of its descendants from the scene. This is destructive; verify the target with `get_node` first if unsure.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("delete_node", args)
	);

	server.registerTool(
		"select_node",
		{
			title: "Select node",
			description: "Select and focus a node in the editor (UX only, no scene change). Helps the user follow what the agent is doing.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("select_node", args)
	);

	server.registerTool(
		"get_selected_nodes",
		{
			title: "Get selected nodes",
			description:
				"Get the nodes the user has currently selected in the editor's scene graph, as an array of node summaries (id, name, className, transform, …). " +
				"Use this whenever the user refers to \"the selected node(s)\" — e.g. \"instantiate the selected node 100 times to build a forest\". " +
				"Returns `{ count, nodes }`; if `count` is 0, ask the user to select a node in the editor first. " +
				"Then drive instancing with the returned `id` (prefer `create_instance` over `clone_mesh` for performance) and scatter the copies with `set_node_transform`.",
			inputSchema: z.object({}),
		},
		async (args): Promise<CallToolResult> => callTextTool("get_selected_nodes", args)
	);
}
