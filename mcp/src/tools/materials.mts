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
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("list_materials", args)
	);

	server.registerTool(
		"list_material_types",
		{
			title: "List material types",
			description:
				"List every material type the editor can create — including the Babylon.js Materials Library (sky, grid, normal, water, lava, triplanar, cell, fire, gradient) — with each type's purpose and its KEY controllable properties. " +
				"Call this to discover what's available before `create_material`, and to learn which properties to pass to `set_material_properties` (e.g. a SkyMaterial's `inclination`/`azimuth`/`luminance`/`turbidity`). " +
				"Use these specialized materials for authored, hand-editable effects (procedural sky, water, lava, toon shading, reference grid) instead of faking them in code.",
			inputSchema: z.object({}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("list_material_types", args)
	);

	server.registerTool(
		"create_material",
		{
			title: "Create material",
			description:
				"Create a new material and persist it as a `.material` asset so it appears in the editor's assets browser. " +
				"Prefer `pbr` for realistic surfaces and `standard` for simple ones. The Materials Library types are for authored special effects: " +
				"`sky` (procedural sky on a skybox), `water` (lakes/oceans), `lava`, `fire`, `cell` (toon shading), `grid` (blueprint floor), `gradient`, `triplanar` (texturing meshes without UVs), `normal`. " +
				"Call `list_material_types` first to see each type's key properties. Returns `{ id, name, path }`; assign it with `set_mesh_material` and tune it with `set_material_properties` " +
				"(e.g. a sunset sky: create a `sky` material on a `skybox` mesh, then set `inclination`/`azimuth`/`luminance`/`turbidity`).",
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
				"Color values can be `[r,g,b]` arrays and are coerced to Color3. Use this to tune a skybox's colors for a sunset, make a surface metallic, etc. " +
				"Materials Library types are tuned here too, each via its own properties (so you usually do NOT need a separate `list_material_types` call); most common: " +
				"`sky` -> `inclination` (sun height / time of day), `azimuth`, `luminance`, `turbidity`; " +
				"`water` -> `waveHeight`, `waveLength`, `windForce`, `waveSpeed`, `bumpHeight`, `waterColor` (animated waves work out of the box); " +
				"`gradient` -> `topColor`, `bottomColor`, `offset`; `grid` -> `mainColor`, `lineColor`, `gridRatio`. Call `list_material_types` only when you need the full per-type list. " +
				'You can also reach nested objects — e.g. tile a ground texture with `{ "albedoTexture.uScale": 20, "albedoTexture.vScale": 20 }` (after assigning it via `assign_texture_to_material`).',
			inputSchema: z.object({
				materialId: z.string().describe("Id of the material to modify."),
				properties: z.record(z.string(), z.any()).describe("Map of dotted property path to value. `[r,g,b]` arrays are coerced to Color3."),
			}),
			annotations: { idempotentHint: true },
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
			annotations: { idempotentHint: true },
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
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("set_environment_texture", args)
	);
}
