import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerMeshTools(server: McpServer): void {
	server.registerTool(
		"create_primitive_mesh",
		{
			title: "Create primitive mesh",
			description:
				"Create a built-in primitive mesh (box, sphere, ground, plane, cylinder, capsule, torus, torusknot, skybox) or an `empty` transform node used for grouping. " +
				"Returns the created node summary including its `id`, which you can pass to other tools (set material, set transform, create instances from it, etc.). " +
				"Positions are in centimeters. To build a scene, chain `create_primitive_mesh` calls (or `instantiate_mesh_asset`), then assign materials, then verify with `get_screenshot`.",
			inputSchema: z.object({
				type: z.enum(["box", "sphere", "ground", "plane", "cylinder", "capsule", "torus", "torusknot", "skybox", "empty"]).describe("The primitive type to create."),
				name: z.string().optional().describe("Name for the new mesh. A default is used if omitted."),
				parentId: z.string().optional().describe("Id of the parent node. Omit to add at the scene root."),
				position: z.array(z.number()).length(3).optional().describe("World position `[x,y,z]` in centimeters."),
				options: z
					.record(z.string(), z.any())
					.optional()
					.describe("Babylon MeshBuilder options for the chosen type (e.g. `{ size, diameter, width, height, subdivisions }`)."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("create_primitive_mesh", args)
	);

	server.registerTool(
		"create_instance",
		{
			title: "Create instanced mesh(es)",
			description:
				"Create one or more InstancedMesh objects from an existing source mesh. PREFER THIS over cloning whenever many copies share the same geometry AND material (e.g. 100 trees, a field of grass, repeated walls): instances are far cheaper than clones. " +
				"Provide either `count` (to create N instances) and/or `transforms` (per-instance position/rotation/scaling in centimeters/radians). " +
				"Instances always share the source mesh's material; if some copies need a DIFFERENT material, use `clone_mesh` for those variants instead and create instances from each clone.",
			inputSchema: z.object({
				sourceNodeId: z.string().optional().describe("Id of the source mesh to instance (preferred)."),
				sourceNodeName: z.string().optional().describe("Name of the source mesh to instance."),
				name: z.string().optional().describe("Base name for the created instances."),
				count: z.number().optional().describe("Number of instances to create. Per-instance transforms can be supplied via `transforms`."),
				parentId: z.string().optional().describe("Id of the parent node for the created instances."),
				transforms: z
					.array(
						z.object({
							position: z.array(z.number()).length(3).optional().describe("Position `[x,y,z]` in centimeters."),
							rotation: z.array(z.number()).length(3).optional().describe("Euler rotation `[x,y,z]` in radians."),
							scaling: z.array(z.number()).length(3).optional().describe("Scaling `[x,y,z]`."),
						})
					)
					.optional()
					.describe("Per-instance transforms. The number of instances created matches this array when `count` is omitted."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("create_instance", args)
	);

	server.registerTool(
		"clone_mesh",
		{
			title: "Clone mesh",
			description:
				"Clone a mesh. Use this ONLY when a copy must have a DIFFERENT material than the source; otherwise prefer `create_instance` for performance. " +
				"Keep `cloneGeometry=false` (the default) so the clone shares the source geometry and only the material can diverge — this keeps memory low. " +
				"Typical pattern: clone once per material variant, then `create_instance` from each clone for the many copies of that variant.",
			inputSchema: z.object({
				sourceNodeId: z.string().optional().describe("Id of the source mesh to clone (preferred)."),
				sourceNodeName: z.string().optional().describe("Name of the source mesh to clone."),
				name: z.string().optional().describe("Name for the cloned mesh."),
				cloneGeometry: z.boolean().optional().describe("If true, duplicates the geometry too. Default false (share geometry, only material differs)."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("clone_mesh", args)
	);

	server.registerTool(
		"set_mesh_material",
		{
			title: "Set mesh material",
			description:
				"Assign an existing material to a mesh. Get material ids from `list_materials` or create one with `create_material`. " +
				"Remember: assigning a material to an instanced mesh affects all instances sharing it; clone the mesh first if a subset needs a different material.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target mesh (preferred)."),
				nodeName: z.string().optional().describe("Name of the target mesh."),
				materialId: z.string().describe("Id of the material to assign."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("set_mesh_material", args)
	);

	server.registerTool(
		"set_mesh_visibility",
		{
			title: "Set mesh visibility",
			description: "Toggle a mesh's visibility/enabled state or set its `visibility` factor (0..1 for transparency). Only the provided fields are changed.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target mesh (preferred)."),
				nodeName: z.string().optional().describe("Name of the target mesh."),
				isVisible: z.boolean().optional().describe("Whether the mesh is visible."),
				isEnabled: z.boolean().optional().describe("Whether the mesh (and its children) is enabled."),
				visibility: z.number().optional().describe("Visibility factor between 0 (transparent) and 1 (opaque)."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("set_mesh_visibility", args)
	);
}
