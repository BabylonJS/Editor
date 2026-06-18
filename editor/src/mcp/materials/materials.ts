import { dirname, join, isAbsolute, basename, relative, extname } from "path/posix";
import { ensureDir, writeJSON } from "fs-extra";

import { Scene, Material, Texture, CubeTexture } from "babylonjs";

import { findAvailableFilename } from "../../tools/fs";
import { configureImportedTexture } from "../../editor/layout/preview/import/import";

import {
	addPBRMaterial,
	addStandardMaterial,
	addNodeMaterial,
	addSkyMaterial,
	addGridMaterial,
	addNormalMaterial,
	addWaterMaterial,
	addLavaMaterial,
	addTriPlanarMaterial,
	addCellMaterial,
	addFireMaterial,
	addGradientMaterial,
} from "../../project/add/material";

import { projectConfiguration } from "../../project/configuration";

import { IMCPActionOptions } from "../action";
import { resolveMaterial, deepSet } from "../tools/resolve";

/**
 * Returns the absolute path of the project directory.
 */
function getProjectDirectory(): string {
	if (!projectConfiguration.path) {
		throw new Error("No project is currently open.");
	}

	return dirname(projectConfiguration.path);
}

/**
 * Resolves an absolute path from a project-relative or absolute path.
 */
function resolveProjectPath(path: string): string {
	return isAbsolute(path) ? path : join(getProjectDirectory(), path);
}

/**
 * Lists all the materials available in the scene/project.
 */
export function listMaterials(scene: Scene): any {
	return {
		materials: scene.materials.map((material) => ({
			id: material.id,
			name: material.name,
			className: material.getClassName(),
		})),
	};
}

/**
 * Catalog of the material types the editor can create, with their key controllable properties.
 * The "library" materials come from the Babylon.js Materials Library (babylonjs-materials) and mirror
 * the editor's dedicated inspectors. Properties listed here can all be set with `set_material_properties`.
 */
const materialTypesCatalog = [
	{
		type: "pbr",
		className: "PBRMaterial",
		library: false,
		use: "Realistic physically-based surfaces (metal, plastic, wood, stone). The default choice for most meshes.",
		keyProperties: ["albedoColor [r,g,b]", "metallic (0..1)", "roughness (0..1)", "emissiveColor [r,g,b]", "alpha (0..1)", "albedoTexture", "bumpTexture", "metallicTexture"],
	},
	{
		type: "standard",
		className: "StandardMaterial",
		library: false,
		use: "Simple, cheap non-PBR surfaces and unlit/flat looks.",
		keyProperties: ["diffuseColor [r,g,b]", "specularColor [r,g,b]", "emissiveColor [r,g,b]", "alpha (0..1)", "diffuseTexture", "bumpTexture"],
	},
	{
		type: "node",
		className: "NodeMaterial",
		library: false,
		use: "Custom shader graphs (advanced). Prefer authoring these by hand in the Node Material Editor.",
		keyProperties: [],
	},
	{
		type: "sky",
		className: "SkyMaterial",
		library: true,
		use: "Procedural physically-based sky (no HDR needed). Apply it to a `skybox` mesh. Animate `inclination` for a day/night cycle.",
		keyProperties: [
			"inclination (-0.6..0.6, sun height / time of day)",
			"azimuth (0..1, sun horizontal direction)",
			"luminance (>=0.01, overall brightness)",
			"turbidity (>=0, haziness)",
			"rayleigh (sky scattering)",
			"mieCoefficient (0..1)",
			"mieDirectionalG (0..1)",
			"useSunPosition (bool)",
			"sunPosition [x,y,z]",
			"dithering (bool)",
		],
	},
	{
		type: "grid",
		className: "GridMaterial",
		library: true,
		use: "Blueprint / editor-style reference grid. Great for prototyping floors and level blockouts.",
		keyProperties: ["mainColor [r,g,b]", "lineColor [r,g,b]", "gridRatio", "majorUnitFrequency", "minorUnitVisibility (0..1)", "opacity (0..1)"],
	},
	{
		type: "normal",
		className: "NormalMaterial",
		library: true,
		use: "Renders surface normals as colors. Useful for debugging or a stylized look.",
		keyProperties: ["diffuseColor [r,g,b]", "diffuseTexture"],
	},
	{
		type: "water",
		className: "WaterMaterial",
		library: true,
		use: "Animated water for lakes/oceans/rivers. Apply to a ground or plane.",
		keyProperties: ["waterColor [r,g,b]", "waveHeight", "waveLength", "windForce", "windDirection [x,y]", "bumpHeight", "colorBlendFactor (0..1)", "waveSpeed"],
	},
	{
		type: "lava",
		className: "LavaMaterial",
		library: true,
		use: "Animated lava / flowing molten surfaces (needs a noise/diffuse texture for the full effect).",
		keyProperties: ["speed", "movingSpeed", "lowFrequencySpeed", "fogColor [r,g,b]", "diffuseTexture", "noiseTexture"],
	},
	{
		type: "triplanar",
		className: "TriPlanarMaterial",
		library: true,
		use: "Texture meshes that have no UVs (terrain, voxels, CSG) by projecting on the 3 axes.",
		keyProperties: ["tileSize", "diffuseColor [r,g,b]", "diffuseTextureX", "diffuseTextureY", "diffuseTextureZ", "normalTextureX/Y/Z"],
	},
	{
		type: "cell",
		className: "CellMaterial",
		library: true,
		use: "Toon / cel shading for stylized games.",
		keyProperties: ["diffuseColor [r,g,b]", "computeHighLevel (bool)", "diffuseTexture"],
	},
	{
		type: "fire",
		className: "FireMaterial",
		library: true,
		use: "Animated fire surface (needs diffuse/distortion/opacity textures for the full effect).",
		keyProperties: ["speed", "diffuseTexture", "distortionTexture", "opacityTexture"],
	},
	{
		type: "gradient",
		className: "GradientMaterial",
		library: true,
		use: "Two-color gradient (sky-like / stylized backgrounds and surfaces).",
		keyProperties: ["topColor [r,g,b]", "bottomColor [r,g,b]", "offset", "smoothness", "scale"],
	},
];

/**
 * Lists the material types the editor can create (including the Materials Library) and their key
 * controllable properties, so the agent knows what is available and how to tune each one.
 */
export function listMaterialTypes(): any {
	return { types: materialTypesCatalog };
}

/**
 * Creates a material and persists it as a `.material` asset so it appears in the assets browser.
 */
export async function createMaterial(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	let material: Material;
	switch (data.type) {
		case "pbr":
			material = addPBRMaterial(scene);
			break;
		case "standard":
			material = addStandardMaterial(scene);
			break;
		case "node":
			material = addNodeMaterial(scene);
			break;
		case "sky":
			material = addSkyMaterial(scene);
			break;
		case "grid":
			material = addGridMaterial(scene);
			break;
		case "normal":
			material = addNormalMaterial(scene);
			break;
		case "water":
			material = addWaterMaterial(scene);
			break;
		case "lava":
			material = addLavaMaterial(scene);
			break;
		case "triplanar":
			material = addTriPlanarMaterial(scene);
			break;
		case "cell":
			material = addCellMaterial(scene);
			break;
		case "fire":
			material = addFireMaterial(scene);
			break;
		case "gradient":
			material = addGradientMaterial(scene);
			break;
		default:
			throw new Error(`Unknown material type: ${data.type}`);
	}

	if (data.name) {
		material.name = data.name;
	}

	const folder = data.folder ? resolveProjectPath(data.folder) : join(getProjectDirectory(), "assets");
	await ensureDir(folder);

	const filename = await findAvailableFilename(folder, material.name, ".material");
	const absolutePath = join(folder, filename);

	await writeJSON(absolutePath, material.serialize(), {
		spaces: "\t",
		encoding: "utf-8",
	});

	options.editor.layout.assets.refresh();

	return {
		id: material.id,
		name: material.name,
		path: relative(getProjectDirectory(), absolutePath),
	};
}

/**
 * Sets deep properties on a material using dotted property paths.
 */
export function setMaterialProperties(scene: Scene, data: any, options: IMCPActionOptions): any {
	const material = resolveMaterial({ scene, materialId: data.materialId });

	const properties = data.properties ?? {};
	for (const path of Object.keys(properties)) {
		deepSet(material, path, properties[path]);
	}

	options.editor.layout.inspector.setEditedObject(material);
	options.editor.layout.inspector.forceUpdate();

	return {
		id: material.id,
		name: material.name,
		className: material.getClassName(),
	};
}

/**
 * Loads a texture asset and assigns it to a material channel.
 */
export function assignTextureToMaterial(scene: Scene, data: any, options: IMCPActionOptions): any {
	const material = resolveMaterial({ scene, materialId: data.materialId });

	const absolutePath = resolveProjectPath(data.texturePath);
	const extension = extname(absolutePath).toLowerCase();

	let texture: Texture | CubeTexture;
	if (extension === ".env") {
		texture = configureImportedTexture(CubeTexture.CreateFromPrefilteredData(absolutePath, scene));
	} else {
		texture = configureImportedTexture(new Texture(absolutePath, scene));
	}

	(material as any)[data.channel] = texture;

	options.editor.layout.inspector.setEditedObject(material);
	options.editor.layout.inspector.forceUpdate();

	return {
		id: material.id,
		name: material.name,
		className: material.getClassName(),
		channel: data.channel,
		texture: basename(absolutePath),
	};
}

/**
 * Sets the scene environment/skybox texture from a `.env`/`.hdr` cube texture asset.
 */
export function setEnvironmentTexture(scene: Scene, data: any, options: IMCPActionOptions): any {
	const absolutePath = resolveProjectPath(data.texturePath);
	const extension = extname(absolutePath).toLowerCase();

	let texture: CubeTexture;
	if (extension === ".env") {
		texture = configureImportedTexture(CubeTexture.CreateFromPrefilteredData(absolutePath, scene));
	} else {
		texture = configureImportedTexture(new CubeTexture(absolutePath, scene));
	}

	scene.environmentTexture = texture;

	if (data.createSkybox) {
		scene.createDefaultSkybox(texture, true, 10_000, 0.3, false);
	}

	options.editor.layout.inspector.forceUpdate();

	return { ok: true };
}
