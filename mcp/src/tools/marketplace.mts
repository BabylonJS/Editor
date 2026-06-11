import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerMarketplaceTools(server: McpServer): void {
	server.registerTool(
		"open_marketplace",
		{
			title: "Open marketplace",
			description:
				"Open the marketplace browser tab inside the editor. ALWAYS go through the visible marketplace UI for searching/downloading assets — never call marketplace APIs in the background — so the user can watch the assets and download progress in the editor.",
			inputSchema: z.object({
				source: z
					.enum(["polyhaven", "ambientcg", "sketchfab"])
					.optional()
					.describe("Which marketplace to open. Poly Haven: textures/meshes/cube textures; Ambient CG: mostly cube textures; Sketchfab: meshes."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("open_marketplace", args)
	);

	server.registerTool(
		"search_marketplace",
		{
			title: "Search marketplace",
			description:
				"Search a marketplace, driven through the editor's visible marketplace browser (not background APIs). Returns results with ids you can pass to `download_marketplace_asset`. " +
				"Keep assets web-friendly: textures up to 4K (the editor can compress to KTX2) and meshes with a reasonable polygon count.",
			inputSchema: z.object({
				source: z.enum(["polyhaven", "ambientcg", "sketchfab"]).describe("The marketplace to search."),
				query: z.string().describe("Search query, e.g. 'rusty metal', 'oak tree'."),
				type: z.enum(["texture", "mesh", "cube-texture"]).optional().describe("Filter results by asset type."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("search_marketplace", args)
	);

	server.registerTool(
		"download_marketplace_asset",
		{
			title: "Download marketplace asset",
			description:
				"Trigger a VISIBLE download of a marketplace asset into the project via the editor's marketplace browser, so the user sees the progress. Returns the downloaded asset path. " +
				"Choose a reasonable resolution (max 4K for textures) to keep the scene performant. After downloading, use `list_assets`/`get_asset_preview` then place it with `instantiate_mesh_asset` or `assign_texture_to_material`.",
			inputSchema: z.object({
				source: z.enum(["polyhaven", "ambientcg", "sketchfab"]).describe("The marketplace the asset comes from."),
				assetId: z.string().describe("Id of the asset to download (from `search_marketplace`)."),
				resolution: z.string().optional().describe("Desired resolution, e.g. '2k', '4k'. Keep it web-friendly (max 4K)."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("download_marketplace_asset", args)
	);
}
