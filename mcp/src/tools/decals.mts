import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

const vector3 = z.array(z.number()).length(3);

export function registerDecalTools(server: McpServer): void {
	server.registerTool(
		"create_decal",
		{
			title: "Create decal",
			description:
				"Project a decal on the surface of a mesh: a sticker made of a material, for logos, posters, graffiti, cracks, stains, bullet holes, footprints, road markings, dirt or moss patches. " +
				"The decal is a real, hand-editable mesh of the scene, parented to the target mesh (it follows it), with a Decal section in the inspector — exactly like the decals the user paints with the editor's decals tool. " +
				"MATERIAL: create it first with `create_material` (`pbr` or `standard`) + `assign_texture_to_material` (albedo/diffuse), then pass its `materialId`; or pass the project path of an existing `.material` asset in `materialAssetPath`. " +
				"For an image with transparency (a logo, a crack), make the texture's alpha visible with `set_material_properties` (`albedoTexture.hasAlpha: true` + `useAlphaFromAlbedoTexture: true` for PBR, `diffuseTexture.hasAlpha: true` for standard). " +
				"Several decals should share the same material: the editor merges the static decals of a material into one mesh when saving. " +
				"PLACEMENT: `position` is a point on the surface of the target, in world space and centimeters. Pass the surface `normal` at this point when you know it (e.g. `[0,1,0]` on a floor, `[0,0,-1]` on a wall facing -Z); " +
				"otherwise the closest point of the surface is found (looking from the active camera and along each axis) and the normal of its face is used. Use `get_mesh_bounding_info` on the target to find its surfaces. " +
				"`size` is `[width, height, depth]` in centimeters (default 100 each): the depth is how far the decal reaches into curved surfaces. `angle` rotates the decal around the normal, in radians. " +
				"Verify the result with `get_screenshot` (`focus_node` on the decal first), and adjust it with `update_decal`.",
			inputSchema: z.object({
				targetNodeId: z.string().optional().describe("Id of the mesh to project the decal on (preferred)."),
				targetNodeName: z.string().optional().describe("Name of the mesh to project the decal on."),
				materialId: z.string().optional().describe("Id of the material of the decal, e.g. the `id` returned by `create_material`."),
				materialName: z.string().optional().describe("Name of the material of the decal, when its id is not known."),
				materialAssetPath: z
					.string()
					.optional()
					.describe("Project-relative path of a `.material` asset to use as the material of the decal, e.g. `assets/materials/logo.material`."),
				position: vector3.describe("Point on the surface of the target mesh where the center of the decal goes, `[x,y,z]` in world space and centimeters."),
				normal: vector3
					.optional()
					.describe("Normal of the surface at `position`, `[x,y,z]` in world space: the decal faces this direction. Omit it to compute it from the surface."),
				size: z.array(z.number()).min(2).max(3).optional().describe("Size of the decal `[width, height, depth?]` in centimeters. Defaults to `[100, 100, 100]`."),
				angle: z.number().optional().describe("Rotation of the decal around the normal, in radians. Defaults to 0."),
				name: z.string().optional().describe("Name of the decal. Defaults to the name of its material."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("create_decal", args)
	);

	server.registerTool(
		"update_decal",
		{
			title: "Update decal",
			description:
				"Change the size, the angle or the place of a decal created with `create_decal` or painted in the editor: its geometry is projected again on the mesh it belongs to. " +
				"Only the given values change. Pass a new `position` (world space, centimeters, on the surface of the same mesh) to move the decal, with the `normal` of the surface there when you know it. " +
				"To change its material use `set_mesh_material`, and to remove it use `delete_node`. Decals merged when the scene was saved (a single mesh per material) can't be updated.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the decal (preferred)."),
				nodeName: z.string().optional().describe("Name of the decal."),
				position: vector3.optional().describe("New point on the surface of the mesh where the center of the decal goes, `[x,y,z]` in world space and centimeters."),
				normal: vector3.optional().describe("Normal of the surface at the position of the decal, `[x,y,z]` in world space."),
				size: z.array(z.number()).min(2).max(3).optional().describe("New size of the decal `[width, height, depth?]` in centimeters."),
				angle: z.number().optional().describe("New rotation of the decal around the normal, in radians."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("update_decal", args)
	);
}
