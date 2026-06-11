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
