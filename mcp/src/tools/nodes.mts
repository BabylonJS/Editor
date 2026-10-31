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
				"Address the node by `nodeId` (preferred, the id given by `get_scene_hierarchy`) or `nodeName`. Use it to read current values before modifying them. " +
				"Particle systems, sprites, skeletons and GUI only return their id, name and className.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred). Get it from `get_scene_hierarchy`."),
				nodeName: z.string().optional().describe("Name of the target node. Used only if `nodeId` is not provided or does not resolve."),
			}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("get_node", args)
	);

	server.registerTool(
		"set_node_transform",
		{
			title: "Set node transform",
			description:
				"Set a node's transform. Works for meshes/transform nodes (position/rotation/scaling), lights (position and/or direction) and cameras (position, rotation and/or target). " +
				"Values are relative to the node's parent, like the values shown in the inspector: positions/targets are in editor units (centimeters), rotation/direction in radians/world units. " +
				"Only the provided and node-supported fields are applied; the change is reflected live in the editor inspector. Use `get_node` first to see which of these properties a given node exposes.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				position: z
					.array(z.number())
					.length(3)
					.optional()
					.describe("Position `[x,y,z]` relative to the parent of the node, in centimeters (meshes, cameras, point/spot/directional lights)."),
				rotation: z.array(z.number()).length(3).optional().describe("Euler rotation `[x,y,z]` in radians (meshes, transform nodes, free/universal cameras)."),
				scaling: z.array(z.number()).length(3).optional().describe("Scaling `[x,y,z]` (meshes and transform nodes only)."),
				direction: z.array(z.number()).length(3).optional().describe("Direction vector `[x,y,z]` for directional/spot/hemispheric lights (the way the light points)."),
				target: z.array(z.number()).length(3).optional().describe("Point `[x,y,z]` (centimeters) a camera looks at. Applies to cameras that support `setTarget`."),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("set_node_transform", args)
	);

	server.registerTool(
		"set_node_properties",
		{
			title: "Set node properties",
			description:
				'Deep-set arbitrary node properties by dotted path, e.g. `"material.albedoColor"`, `"isVisible"`, `"receiveShadows"`. ' +
				'`"isEnabled"` (true/false) enables or disables the node; other methods can\'t be set. ' +
				"Values may be numbers, strings, booleans, or `[r,g,b]`/`[x,y,z]` arrays which are coerced to Color3/Vector3 based on the existing property type. " +
				'`"metadata.isLocked"` and `"metadata.doNotSerialize"` (true/false) are the "Locked" and "Do not serialize" options of the graph. ' +
				"This is the catch-all for DEEP customization not covered by a dedicated tool — including built-in collisions: " +
				'`"checkCollisions"` (true to make a mesh block moveWithCollisions), `"ellipsoid"`/`"ellipsoidOffset"` ([x,y,z], the collider used for character-style movement), `"isPickable"`, `"applyGravity"`. ' +
				"For Havok rigid-body physics use `set_mesh_physics` instead. You can set many properties at once via the `properties` map, and many nodes at once via `execute_batch`.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				properties: z.record(z.string(), z.any()).describe("Map of dotted property path to value."),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("set_node_properties", args)
	);

	server.registerTool(
		"set_node_parent",
		{
			title: "Set node parent",
			description:
				"Move nodes in the hierarchy, like dragging them in the editor's graph. Pass `parentId`/`parentName` to set the new parent, or omit both to move them to the scene root. " +
				"Use `nodeIds` to move several nodes at once: the user undoes it in a single Ctrl+Z, so prefer it to `execute_batch`, for example to group nodes under an `empty` from `create_primitive_mesh`. " +
				"Also moves particle systems to another mesh (it becomes their emitter), and point/spot lights without shadows into the ClusteredLightContainer and out of it. " +
				"A node can't move under itself or its descendants. Fails while the game plays.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the node to move (preferred)."),
				nodeName: z.string().optional().describe("Name of the node to move."),
				nodeIds: z.array(z.string()).optional().describe("Ids of the nodes to move, to move several at once. Replaces `nodeId`/`nodeName`."),
				parentId: z.string().optional().describe("Id of the new parent. Omit (and omit parentName) to move to the scene root."),
				parentName: z.string().optional().describe("Name of the new parent."),
				preserveWorldTransform: z
					.boolean()
					.optional()
					.describe(
						"Keep the nodes where they are in the world, by updating their transform. Defaults to true. Cameras and lights leaving the ClusteredLightContainer always keep their local transform."
					),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("set_node_parent", args)
	);

	server.registerTool(
		"rename_node",
		{
			title: "Rename node",
			description:
				"Rename anything listed by `get_scene_hierarchy`: nodes, clustered lights, particle systems, sprites, skeletons and GUI. The new name appears immediately in the editor's graph, and the user can undo it with Ctrl+Z. Fails while the game plays.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				newName: z.string().min(1).describe("The new name for the node."),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("rename_node", args)
	);

	server.registerTool(
		"delete_node",
		{
			title: "Delete node",
			description:
				'Remove nodes and all of their descendants from the scene, like the "Remove" action of the editor\'s graph: what depends on them goes too (particle systems they emit, skeletons no other mesh uses, their animations), and the user can restore everything with Ctrl+Z. ' +
				"Also removes clustered lights, particle systems, sprites, skeletons and GUI. Use `nodeIds` to remove several at once: a single Ctrl+Z restores them, so prefer it to `execute_batch`. " +
				"The ClusteredLightContainer can't be removed. Fails while the game plays.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				nodeIds: z.array(z.string()).optional().describe("Ids of the nodes to remove, to remove several at once. Replaces `nodeId`/`nodeName`."),
			}),
			annotations: { destructiveHint: true, idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("delete_node", args)
	);

	server.registerTool(
		"clone_node",
		{
			title: "Clone node",
			description:
				'Duplicate a node WITH ITS CHILDREN, like the "Clone" action of the editor\'s graph: a group of meshes, a light, a camera, a sound, a sprite, a particle system... Use it to copy a whole hierarchy (a building, a prop with its lights); the user can undo it with Ctrl+Z. ' +
				"The clone keeps the parent and transform of the source: move it with `set_node_transform`. Returns the clone: read the ids of its children with `get_scene_hierarchy`. " +
				"For many copies of one mesh use `create_instance` instead. Fails while the game plays.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the node to clone (preferred)."),
				nodeName: z.string().optional().describe("Name of the node to clone."),
				name: z.string().optional().describe('Name of the clone. Defaults to the source name followed by "(Clone)".'),
				cloneMaterial: z.boolean().optional().describe("Give the cloned meshes their own copy of their material, to edit it apart. Default false (materials are shared)."),
				cloneGeometry: z.boolean().optional().describe("Give the cloned meshes their own copy of their geometry. Default false (geometries are shared)."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("clone_node", args)
	);

	server.registerTool(
		"select_node",
		{
			title: "Select node",
			description: "Select and focus anything listed by `get_scene_hierarchy` in the editor (UX only, no scene change). Helps the user follow what the agent is doing.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
			}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("select_node", args)
	);

	server.registerTool(
		"get_selected_nodes",
		{
			title: "Get selected nodes",
			description:
				"Get the nodes the user has currently selected in the editor's scene graph, as an array of node summaries (id, name, className, transform, …). " +
				'Use this whenever the user refers to "the selected node(s)" — e.g. "instantiate the selected node 100 times to build a forest". ' +
				"Returns `{ count, nodes }`; if `count` is 0, ask the user to select a node in the editor first. " +
				"Then drive instancing with the returned `id` (prefer `create_instance` over `clone_mesh` for performance) and scatter the copies with `set_node_transform`.",
			inputSchema: z.object({}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("get_selected_nodes", args)
	);
}
