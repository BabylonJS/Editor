import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callImageTool, callTextTool } from "./helpers.mjs";

export function registerAssetTools(server: McpServer): void {
	server.registerTool(
		"list_assets",
		{
			title: "List assets",
			description:
				"List the project's assets, optionally filtered by `type` and/or `folder`. Each entry reports `hasPreview` indicating whether the containing folder has an `editor_preview` image. " +
				"Always check existing assets BEFORE downloading from the marketplace — reuse what is already in the project when it fits the request.",
			inputSchema: z.object({
				type: z.enum(["texture", "cube-texture", "mesh", "sound", "material", "particle", "json", "navmesh"]).optional().describe("Filter by asset type."),
				folder: z.string().optional().describe("Project-relative folder to list. Defaults to the whole assets tree."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("list_assets", args)
	);

	server.registerTool(
		"get_asset_preview",
		{
			title: "Get asset preview",
			description:
				"Return the preview image for an asset/folder (the folder's `editor_preview.png/jpg/bmp`, or a generated thumbnail) as an image. " +
				"BEFORE using an existing asset in the scene, view its preview here to confirm it visually matches the user's description.",
			inputSchema: z.object({
				path: z.string().describe("Project-relative or absolute path to the asset (or its folder)."),
			}),
		},
		async (args): Promise<CallToolResult> => callImageTool("get_asset_preview", args)
	);

	server.registerTool(
		"instantiate_mesh_asset",
		{
			title: "Instantiate mesh asset",
			description:
				"Load a mesh asset (`.glb/.gltf/.babylon/.fbx`) into the scene — the equivalent of drag'n'dropping it in the editor preview. This is the main way to bring in rich, hand-editable content: trees, rocks, buildings, props, characters, vehicles, weapons, etc. glTF/glb assets are auto-scaled (x100) to editor units; do NOT re-apply scaling. " +
				"IMPORTANT for performance: import a mesh ONCE, then use `create_instance` to place many copies (e.g. a forest of trees, a street of identical buildings, a crowd). Importing the same asset repeatedly duplicates the geometry and is wasteful. " +
				"Find assets with `list_assets`, or download new ones via the visible marketplace tools. Returns `{ rootNodeId, createdNodes[] }`. Some assets ship multiple LOD meshes named `name_LOD0`, `name_LOD1`, ...; the editor does not wire LODs automatically.",
			inputSchema: z.object({
				path: z.string().describe("Project-relative or absolute path to the mesh asset."),
				name: z.string().optional().describe("Name for the instantiated root node."),
				parentId: z.string().optional().describe("Id of the parent node. Omit to add at the scene root."),
				position: z.array(z.number()).length(3).optional().describe("World position `[x,y,z]` in centimeters."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("instantiate_mesh_asset", args)
	);
}
