import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

const nodeRef = {
	nodeId: z.string().optional().describe("Id of the terrain (preferred)."),
	nodeName: z.string().optional().describe("Name of the terrain."),
};
const point2 = z.array(z.number()).length(2);
const layerRef = z.union([z.number().int().min(0).max(7), z.string()]).describe("Layer index (0 = first), id or name.");
const falloff = z.enum(["smooth", "linear", "spherical", "sharp", "constant", "gaussian"]);
const subdivisions = z.union([z.literal(64), z.literal(128), z.literal(256), z.literal(512), z.literal(1024)]);
const textureSize = z.union([z.literal(256), z.literal(512), z.literal(1024), z.literal(2048)]);
const band = z.object({ min: z.number(), max: z.number(), feather: z.number().min(0).optional() });
const strokeCommon = {
	points: z
		.array(point2)
		.min(1)
		.max(10000)
		.describe(
			"World [x, z] points in centimeters along the stroke. The brush follows the terrain vertically; one point gives one dab; long segments are filled with dabs every `spacing`."
		),
	radius: z.number().positive().max(100000).describe("Brush radius in world centimeters."),
	strength: z.number().min(0).max(1).optional().describe("0..1, default per tool."),
	hardness: z.number().min(0).max(0.95).optional(),
	falloff: falloff.optional(),
	spacing: z.number().min(0.02).max(2).optional().describe("Dab spacing as a fraction of the brush diameter (default 0.15)."),
	brush: z.string().optional().describe("Brush id from `list_terrain_brushes` (default `builtin:round`)."),
	rotation: z.number().optional().describe("Brush rotation in degrees."),
	filters: z
		.object({
			height: band.optional().describe("Only affect world heights (cm) inside [min, max]."),
			slope: band.optional().describe("Only affect slopes (degrees) inside [min, max]."),
			layer: z.object({ layer: layerRef, threshold: z.number().min(0).max(1).optional(), invert: z.boolean().optional() }).optional(),
		})
		.optional(),
	autoFixSharing: z.boolean().optional().describe("Make a shared geometry/material unique automatically (default true)."),
};

/**
 * Registers the 15 terrain tools (SPEC §8.1): each one forwards its arguments to the editor endpoint of the same name, which runs it on
 * the same engine as the editor's Terrain tab (every edit is undoable).
 * @param server defines the MCP server to register the tools on.
 */
export function registerTerrainTools(server: McpServer): void {
	server.registerTool(
		"get_terrain_info",
		{
			title: "Get terrain info",
			description:
				"Describe a terrain (size, resolution, height range, holes, texture layers with coverage, physics, decals, warnings) or, without a node, list the terrains of the scene. " +
				"Every length is in world centimeters: `width`/`depth`, `center` and `worldBounds` (the world [x, z] rectangle covered by the terrain) tell where stroke points go, `worldHeightRange` gives the lowest and highest points. " +
				"Pass `heightSamples` (e.g. 16) to also get a grid of world heights to reason about the relief.",
			inputSchema: z.object({
				...nodeRef,
				heightSamples: z
					.number()
					.int()
					.min(0)
					.max(64)
					.optional()
					.describe("Return an N x N grid of world heights (row 0 = +Z edge, column 0 = -X edge); 0 or omitted = none."),
			}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("get_terrain_info", args)
	);

	server.registerTool(
		"create_terrain",
		{
			title: "Create terrain",
			description:
				"Create a new flat terrain (default 10240 x 10240 cm, 256 subdivisions): the only meshes the terrain tools sculpt and paint (grounds and other meshes can't become terrains; the editor's Add → Terrain Mesh menu creates the same). " +
				'Its new terrain material starts with one grey "Base" layer (index 0) covering everything: set it with set_terrain_layer (layer 0) before adding other layers. ' +
				"Sizes are world centimeters; 256 subdivisions suit about 100 m, 1024 is heavy (1M vertices). The creation itself is not undoable: delete_node removes the terrain.",
			inputSchema: z.object({
				name: z.string().optional().describe('Name of the new terrain (default "New Terrain").'),
				width: z.number().positive().max(1000000).optional().describe("World cm along X (default 10240)."),
				depth: z.number().positive().max(1000000).optional().describe("World cm along Z (default 10240)."),
				subdivisions: subdivisions.optional().describe("Default: getDefaultTerrainSubdivisions (about 40 cm cells, 64..512; 256 for the default 10240 cm)."),
				position: z.array(z.number()).length(3).optional().describe("Position [x, y, z] in cm of the new terrain (relative to its parent)."),
				parentId: z.string().optional().describe("Id of the parent node of the new terrain."),
				weightMapSize: textureSize.optional().describe("Resolution of the painted weights (default 1024)."),
				layerTextureSize: textureSize.optional().describe("Resolution of the layer textures (default 1024)."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("create_terrain", args)
	);

	server.registerTool(
		"sculpt_terrain",
		{
			title: "Sculpt terrain",
			description:
				"Sculpt the relief of a terrain along a stroke of world points: raise/lower, smooth/sharpen, flatten, set height, ramp, noise, terrace, erode, stamp a brush image, cut or fill holes. " +
				"`points` are world [x, z] centimeters inside the terrain's `worldBounds` (`get_terrain_info`) and `radius` is in world centimeters; one call = one undo entry. " +
				"flatten: `flatten.target` `stroke_start` (default), `fixed` (with `targetHeight`) or `slope`; set_height: `targetHeight` (world cm, required); `flatten.mode` restricts both to raising or lowering. " +
				"ramp: a straight slope from the first to the last point, as wide as the brush (`ramp.startHeight`/`endHeight` force the end heights). " +
				"stamp: the brush image as a height stamp of `stamp.height` cm (one stamp for one point, spaced along longer strokes). " +
				"hole / fill_hole cut or fill holes (physics, navigation and picking fall through them). " +
				"`filters` limit the effect to heights, slopes or where a layer is painted. Verify with `get_screenshot` or `get_terrain_info` (`heightSamples`).",
			inputSchema: z.object({
				...nodeRef,
				tool: z.enum(["raise", "lower", "smooth", "sharpen", "flatten", "set_height", "ramp", "noise", "terrace", "erode", "stamp", "hole", "fill_hole"]),
				...strokeCommon,
				seed: z.number().int().optional(),
				targetHeight: z.number().optional().describe("World cm: flatten with a fixed target, set_height."),
				flatten: z.object({ target: z.enum(["stroke_start", "fixed", "slope"]).optional(), mode: z.enum(["both", "raise", "lower"]).optional() }).optional(),
				noise: z
					.object({
						type: z.enum(["fbm", "ridged", "billow"]).optional(),
						scale: z.number().positive().optional(),
						amplitude: z.number().optional(),
						octaves: z.number().int().min(1).max(10).optional(),
						persistence: z.number().min(0).max(1).optional(),
						lacunarity: z.number().min(1).max(4).optional(),
						mode: z.enum(["bipolar", "raise"]).optional(),
					})
					.optional()
					.describe("noise: `scale` (cm, default 500) and `amplitude` (cm, default 50)."),
				stamp: z
					.object({ height: z.number().optional(), blend: z.enum(["add", "max", "min", "replace"]).optional() })
					.optional()
					.describe("stamp: `height` in cm (default 200)."),
				terrace: z
					.object({ step: z.number().positive().optional(), sharpness: z.number().min(0).max(1).optional(), offset: z.number().optional() })
					.optional()
					.describe("terrace: `step` in cm (default 100)."),
				erode: z
					.object({
						type: z.enum(["thermal", "hydraulic"]).optional(),
						talus: z.number().min(0).max(89).optional(),
						iterations: z.number().int().min(1).max(50).optional(),
						droplets: z.number().int().min(1).max(200000).optional(),
					})
					.optional(),
				ramp: z.object({ startHeight: z.number().optional(), endHeight: z.number().optional(), sideFalloff: z.number().min(0).max(1).optional() }).optional(),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("sculpt_terrain", args)
	);

	server.registerTool(
		"paint_terrain",
		{
			title: "Paint terrain",
			description:
				"Paint a texture layer on a terrain along a stroke of world points (paint, erase, blend or replace). " +
				"`layer` is a layer index (0 = first), id or name from `get_terrain_info`; add layers with `set_terrain_layer` first. " +
				"`opacity` caps the coverage one stroke can reach; `erase` gives the layer's weight to the other layers, `blend` smooths the transitions, `replace` moves weight from `fromLayer` to `layer`. " +
				"Points and radius are world centimeters; one call = one undo entry. Waits for weights that are still loading and for the terrain to render the result; returns the coverage (0..1) of every layer.",
			inputSchema: z.object({
				...nodeRef,
				layer: layerRef,
				tool: z.enum(["paint", "erase", "blend", "replace"]).optional(),
				fromLayer: layerRef.optional().describe("replace: the layer replaced by the painted layer."),
				opacity: z.number().min(0).max(1).optional(),
				...strokeCommon,
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("paint_terrain", args)
	);

	server.registerTool(
		"set_terrain_layer",
		{
			title: "Set terrain layer",
			description:
				'Add, update, move or remove a texture layer of a terrain (albedo, normal, roughness, AO and height maps, tiling, tint, PBR values), optionally from an existing PBR or Standard material. Layer 0 is the "Base" layer that covers the terrain at first: update it (e.g. grass) instead of painting everything with a new layer. ' +
				"Omit `layer` to add a layer (8 maximum), pass `remove: true` to remove it, `index` to move it. " +
				"Map paths are project-relative or absolute (files outside the project are copied into `assets/terrain-textures/`; null clears a map); textures from the project or the marketplace work best with albedo + normal maps. " +
				"`tileSize` / `tileOffset` are world centimeters covered by one texture repetition (e.g. 200). A terrain without terrain material gets one first (`enabledTexturePainting: true`). " +
				"Waits until the terrain renders the layer, so `get_screenshot` right after shows it.",
			inputSchema: z.object({
				...nodeRef,
				layer: layerRef.optional().describe("Layer to update; omit to add a layer."),
				remove: z.boolean().optional(),
				index: z.number().int().min(0).max(7).optional().describe("Position for a new or moved layer."),
				name: z.string().optional(),
				albedo: z.string().nullable().optional().describe("Project-relative or absolute image path; null clears it."),
				normal: z.string().nullable().optional().describe("Project-relative or absolute image path; null clears it."),
				roughnessMap: z.string().nullable().optional().describe("Project-relative or absolute image path; null clears it."),
				aoMap: z.string().nullable().optional().describe("Project-relative or absolute image path; null clears it."),
				heightMap: z.string().nullable().optional().describe("Project-relative or absolute image path; null clears it."),
				normalConvention: z.enum(["opengl", "directx"]).optional(),
				roughnessChannel: z.enum(["r", "g", "b", "a", "luminance"]).optional(),
				aoChannel: z.enum(["r", "g", "b", "a", "luminance"]).optional(),
				heightChannel: z.enum(["r", "g", "b", "a", "luminance"]).optional(),
				roughnessInvert: z.boolean().optional(),
				fromMaterialId: z.string().optional(),
				fromMaterialAssetPath: z.string().optional(),
				tileSize: z.union([z.number().positive(), point2]).optional().describe("World cm covered by one texture repeat (converted to the terrain's local cm)."),
				tileOffset: point2.optional().describe("World cm."),
				tint: z.array(z.number().min(0).max(1)).length(3).optional(),
				roughness: z.number().min(0).max(1).optional(),
				metallic: z.number().min(0).max(1).optional(),
				aoStrength: z.number().min(0).max(1).optional(),
				normalStrength: z.number().min(0).max(2).optional(),
				heightScale: z.number().min(0).max(2).optional(),
				heightOffset: z.number().min(-1).max(1).optional(),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("set_terrain_layer", args)
	);

	server.registerTool(
		"generate_terrain",
		{
			title: "Generate terrain",
			description:
				"Generate a whole terrain relief procedurally (fBm, ridged, billow, islands) with optional erosion and terraces. " +
				"Heights are world centimeters from `minHeight` (default 0) to `maxHeight` (default 8 % of the terrain size); `scale` is the size of the features in cm (default a quarter of the terrain). " +
				"`mode: add` adds the relief to the current heights. Returns the `seed` used: pass it again to reproduce a result. One undo entry.",
			inputSchema: z.object({
				...nodeRef,
				type: z.enum(["fbm", "ridged", "billow", "islands"]).optional(),
				seed: z.number().int().optional(),
				scale: z.number().positive().optional(),
				minHeight: z.number().optional(),
				maxHeight: z.number().optional(),
				octaves: z.number().int().min(1).max(10).optional(),
				persistence: z.number().min(0).max(1).optional(),
				lacunarity: z.number().min(1).max(4).optional(),
				warp: z.number().min(0).max(2).optional(),
				edgeFalloff: z.enum(["none", "island"]).optional(),
				erosionDroplets: z.number().int().min(0).max(200000).optional(),
				terraceSteps: z.number().int().min(0).max(64).optional(),
				mode: z.enum(["replace", "add"]).optional(),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("generate_terrain", args)
	);

	server.registerTool(
		"modify_terrain",
		{
			title: "Modify terrain",
			description:
				"Apply a whole-terrain operation: smooth, erode, terrace, flatten, offset, scale, normalize heights, clear holes, resample, resize, fill a layer or normalize the layer weights. " +
				"Arguments per operation: smooth (`iterations`, `strength`), erode_thermal (`iterations`, `talus` degrees, `amount`), erode_hydraulic (`droplets`, `seed`), terrace (`step`, `sharpness`, `offset` cm), " +
				"flatten (`height` world cm), offset (`height` cm added), scale (`factor`, `pivot` world cm, default the lowest point), normalize (`minHeight`, `maxHeight` world cm), clear_holes, resample (`subdivisions`), " +
				"resize (`width`, `depth` world cm and/or `subdivisions`; the relief stretches), fill_layer (`layer`), normalize_weights. One undo entry (none, with `changed` empty, when resample / resize asks for the current size and resolution).",
			inputSchema: z.object({
				...nodeRef,
				operation: z.enum([
					"smooth",
					"erode_thermal",
					"erode_hydraulic",
					"terrace",
					"flatten",
					"offset",
					"scale",
					"normalize",
					"clear_holes",
					"resample",
					"resize",
					"fill_layer",
					"normalize_weights",
				]),
				layer: layerRef.optional().describe("fill_layer: the layer that covers the whole terrain."),
				iterations: z.number().int().min(1).max(50).optional(),
				strength: z.number().min(0).max(1).optional(),
				talus: z.number().min(0).max(89).optional(),
				amount: z.number().min(0).max(1).optional(),
				droplets: z.number().int().min(1).max(200000).optional(),
				seed: z.number().int().optional(),
				step: z.number().positive().optional(),
				sharpness: z.number().min(0).max(1).optional(),
				offset: z.number().optional(),
				height: z.number().optional().describe("flatten: world height; offset: amount (cm)."),
				factor: z.number().positive().optional(),
				pivot: z.number().optional(),
				minHeight: z.number().optional(),
				maxHeight: z.number().optional(),
				subdivisions: subdivisions.optional(),
				width: z.number().positive().optional(),
				depth: z.number().positive().optional(),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("modify_terrain", args)
	);

	server.registerTool(
		"import_terrain_heightmap",
		{
			title: "Import terrain heightmap",
			description:
				"Import heights from a heightmap image (black = minHeight, white = maxHeight, image top = +Z). " +
				"16-bit PNG or TIFF recommended (8-bit files give visible steps). `mode`: replace (default), add, max or min. One undo entry.",
			inputSchema: z.object({
				...nodeRef,
				path: z.string().describe("Project-relative or absolute path of a PNG (8/16-bit), TIFF, JPG or RAW16 (.raw/.r16) heightmap."),
				minHeight: z.number().optional().describe("World cm for black. Default: the <file>.heightmap.json sidecar written by export_terrain_heightmap."),
				maxHeight: z.number().optional().describe("World cm for white. Default: the sidecar."),
				mode: z.enum(["replace", "add", "max", "min"]).optional(),
				flipY: z.boolean().optional(),
				rawWidth: z.number().int().positive().optional(),
				rawHeight: z.number().int().positive().optional(),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("import_terrain_heightmap", args)
	);

	server.registerTool(
		"export_terrain_heightmap",
		{
			title: "Export terrain heightmap",
			description:
				"Export the terrain heights as a 16-bit heightmap with a JSON sidecar giving the height range. " +
				'The destination must be inside the project folder and outside `*.scene` folders. Its extension gives the format: ".png" (png16), ".r16" or ".raw" (raw16); any other path gets ".png" (".r16" for raw16) added. ' +
				"An existing file is only replaced when it is a heightmap exported before (it has its sidecar). `import_terrain_heightmap` reads the range from the sidecar.",
			inputSchema: z.object({
				...nodeRef,
				path: z.string().describe("Destination inside the project folder."),
				format: z.enum(["png16", "raw16"]).optional().describe("Default: from the extension (png16 without a heightmap extension); must match the extension."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("export_terrain_heightmap", args)
	);

	server.registerTool(
		"list_terrain_brushes",
		{
			title: "List terrain brushes",
			description: "List the brushes available to sculpt_terrain and paint_terrain. Pass a brush `id` as `brush`.",
			inputSchema: z.object({}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("list_terrain_brushes", args)
	);

	server.registerTool(
		"sample_terrain",
		{
			title: "Sample terrain",
			description:
				"Read the terrain surface at world points: height, normal, slope, holes and the dominant painted layer. Use it to place objects on the relief. " +
				"`y` is null outside the terrain; over a hole `hole` is true and `y` is the surface the hole cuts.",
			inputSchema: z.object({
				...nodeRef,
				points: z.array(point2).min(1).max(10000).describe("World [x, z] points in centimeters."),
				layerWeights: z.boolean().optional().describe("Also return the weight of every layer (default false)."),
			}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("sample_terrain", args)
	);

	server.registerTool(
		"snap_nodes_to_terrain",
		{
			title: "Snap nodes to terrain",
			description:
				"Move nodes vertically onto the terrain surface (optionally aligned to the slope), e.g. trees, rocks and buildings after sculpting. " +
				"Nodes outside the terrain or over a hole are skipped. One undo entry for all the nodes.",
			inputSchema: z.object({
				...nodeRef,
				nodeIds: z.array(z.string()).min(1).max(1000),
				alignToNormal: z.boolean().optional().describe("Tilt each node so its up axis follows the surface normal (default false; snapping again keeps it aligned)."),
				offset: z.number().optional().describe("World cm added along +Y after snapping (default 0)."),
				anchor: z
					.enum(["bottom", "origin"])
					.optional()
					.describe("bottom (default): the bottom of the node's world bounding box rests on the surface; origin: the node's position is placed on the surface."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("snap_nodes_to_terrain", args)
	);

	server.registerTool(
		"set_terrain_material",
		{
			title: "Set terrain material",
			description:
				"Enable or disable texture painting on a terrain and change its material settings (weight map and layer texture resolutions, anisotropy, height blending). " +
				"`weightMapSize` resamples the painted weights; `heightBlend` blends the layers by their height maps. Each change is one undo entry; returns the settings and the GPU texture budget.",
			inputSchema: z.object({
				...nodeRef,
				texturePainting: z
					.enum(["enable", "disable"])
					.optional()
					.describe(
						"enable: create a terrain material (or convert the current one with fromCurrentMaterial); disable: give the terrain back its previous material (a plain material made from layer 0 when it had none)."
					),
				fromCurrentMaterial: z.boolean().optional(),
				enabled: z.boolean().optional().describe("false hides the layers (plain PBR look) without removing them."),
				weightMapSize: textureSize.optional(),
				layerTextureSize: textureSize.optional(),
				anisotropy: z.number().int().min(1).max(16).optional(),
				heightBlend: z.boolean().optional(),
				heightBlendTransition: z.number().min(0.01).max(1).optional(),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("set_terrain_material", args)
	);
}
