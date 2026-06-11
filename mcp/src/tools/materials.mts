import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerMaterialTools(server: McpServer): void {
	server.registerTool(
		"list_materials",
		{
			title: "List materials",
			description: "List all materials in the scene/project (including `.material` assets). Use the returned `id` with `set_mesh_material` or `set_material_properties`.",
			inputSchema: z.object({}),
		},
		async (args): Promise<CallToolResult> => callTextTool("list_materials", args)
	);

	server.registerTool(
		"create_material",
		{
			title: "Create material",
			description:
				"Create a new material and persist it as a `.material` asset so it appears in the editor's assets browser. " +
				"Prefer `pbr` for realistic surfaces and `standard` for simple ones; specialized types (sky, grid, water, lava, etc.) exist for specific effects. " +
				"Returns `{ id, name, path }`; assign it to meshes with `set_mesh_material` and tune it with `set_material_properties`.",
			inputSchema: z.object({
				type: z
					.enum(["pbr", "standard", "sky", "grid", "normal", "water", "lava", "triplanar", "cell", "fire", "gradient", "node"])
					.describe("The material type to create."),
				name: z.string().optional().describe("Name for the new material."),
				folder: z.string().optional().describe("Project-relative folder to store the `.material` asset in. Defaults to the assets root."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("create_material", args)
	);

	server.registerTool(
		"set_material_properties",
		{
			title: "Set material properties",
			description:
				"Deep-set material properties by dotted path: `albedoColor`, `metallic`, `roughness`, `emissiveColor`, `alpha`, `wireframe` (PBR) or `diffuseColor`, `specularColor`, etc. (Standard). " +
				"Color values can be `[r,g,b]` arrays and are coerced to Color3. Use this to tune a skybox's colors for a sunset, make a surface metallic, etc.",
			inputSchema: z.object({
				materialId: z.string().describe("Id of the material to modify."),
				properties: z.record(z.string(), z.any()).describe("Map of dotted property path to value. `[r,g,b]` arrays are coerced to Color3."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("set_material_properties", args)
	);

	server.registerTool(
		"assign_texture_to_material",
		{
			title: "Assign texture to material",
			description:
				"Load a texture asset from the project and assign it to a material channel (albedoTexture, bumpTexture, metallicTexture, emissiveTexture, diffuseTexture, opacityTexture, ...). " +
				"Use `list_assets` to find available textures, or download new ones via the visible marketplace tools.",
			inputSchema: z.object({
				materialId: z.string().describe("Id of the target material."),
				channel: z
					.string()
					.describe("Material texture channel, e.g. `albedoTexture`, `bumpTexture`, `metallicTexture`, `emissiveTexture`, `diffuseTexture`, `opacityTexture`."),
				texturePath: z.string().describe("Project-relative or absolute path to the texture asset."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("assign_texture_to_material", args)
	);

	server.registerTool(
		"set_environment_texture",
		{
			title: "Set environment texture",
			description:
				"Set the scene's environment/skybox from a `.env`/`.hdr` cube texture asset, optionally creating a skybox. Great for establishing ambient lighting and the sky backdrop.",
			inputSchema: z.object({
				texturePath: z.string().describe("Project-relative or absolute path to the `.env`/`.hdr` cube texture."),
				createSkybox: z.boolean().optional().describe("Also create a skybox mesh using this texture."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("set_environment_texture", args)
	);
}
