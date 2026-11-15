import { pathExists } from "fs-extra";
import { dirname, extname, isAbsolute, join, relative } from "path/posix";

import { Color3, Scene, Texture } from "babylonjs";

import { executeSimpleWorker } from "../../tools/worker";
import { ensureTemporaryDirectoryExists } from "../../tools/project";

import { projectConfiguration } from "../../project/configuration";

import { configureImportedTexture } from "../../editor/layout/preview/import/import";
import { computeDefaultValuesForObject, VisibleInInspectorDecoratorObject } from "../../editor/layout/inspector/script/tools";

import { getKeyMapValue } from "../play/keys";
import { resolveNode } from "../tools/resolve";

/**
 * Defines a property of a script shown in the inspector (a "@visibleAs*" decorated property), with its current value.
 */
export interface IScriptProperty {
	key: string;
	type: string;
	label?: string;
	description?: string;
	entityType?: string;
	assetType?: string;
	typeRestriction?: string;
	min?: number;
	max?: number;
	value: any;
}

/**
 * Defines the extensions of the files each type of "@visibleAsAsset" accepts.
 */
const assetExtensions: Record<string, string[]> = {
	json: [".json"],
	material: [".material"],
	gui: [".gui"],
	scene: [".scene"],
	nodeParticleSystemSet: [".npss"],
	navmesh: [".navmesh"],
	cinematic: [".cinematic"],
	ragdoll: [".ragdoll"],
};

function getProjectDirectory(): string {
	if (!projectConfiguration.path) {
		throw new Error("No project is currently open.");
	}

	return dirname(projectConfiguration.path.replace(/\\/g, "/"));
}

/**
 * Compiles the given attached script like the inspector does to find its "@visibleAs*" decorated properties, and
 * updates the values saved in the metadata of the object: the missing ones get their default value, the ones of
 * removed properties are removed. The loader of the game requires these values for scripts with such properties.
 * @param script defines the script attached to an object, from "object.metadata.scripts".
 * @returns the decorated properties of the script.
 */
export async function updateScriptValues(script: any): Promise<VisibleInInspectorDecoratorObject[]> {
	const srcAbsolutePath = join(getProjectDirectory(), "src", script.key);
	const temporaryDirectory = await ensureTemporaryDirectoryExists(projectConfiguration.path!);
	const outputAbsolutePath = join(temporaryDirectory, "scripts", `${script.key.replace(/\//g, "_")}.cjs`);

	const compilation = await executeSimpleWorker<{ success: boolean; error?: string }>("workers/script.js", {
		action: "compile",
		srcAbsolutePath,
		outputAbsolutePath,
	});

	if (!compilation.success) {
		throw new Error(`Failed to compile "src/${script.key}":\n${compilation.error}`);
	}

	const output =
		(await executeSimpleWorker<VisibleInInspectorDecoratorObject[] | null>("workers/script.js", {
			action: "extract",
			outputAbsolutePath,
		})) ?? [];

	computeDefaultValuesForObject(script, output);

	return output;
}

/**
 * Returns the decorated properties of the given script with their current values.
 */
export function getScriptProperties(script: any, output: VisibleInInspectorDecoratorObject[]): IScriptProperty[] {
	return output.map((property) => {
		const configuration = property.configuration as any;
		const value = script.values?.[property.propertyKey]?.value;

		return {
			key: property.propertyKey,
			type: configuration.type,
			label: property.label,
			description: configuration.description,
			entityType: configuration.entityType,
			assetType: configuration.assetType,
			typeRestriction: configuration.typeRestriction,
			min: configuration.min,
			max: configuration.max,
			// Textures are saved serialized: only their name is useful.
			value: configuration.type === "texture" ? (value?.name ?? null) : value,
		};
	});
}

function toNumberArray(value: any, keys: string[], name: string): number[] {
	const array = Array.isArray(value) ? value : value && typeof value === "object" ? keys.map((key) => value[key]) : null;

	if (!array || array.length < keys.length || array.slice(0, keys.length).some((component) => typeof component !== "number" || !Number.isFinite(component))) {
		throw new Error(`Invalid ${name}: ${JSON.stringify(value)}. Give an array of ${keys.length} numbers, or an object { ${keys.join(", ")} }.`);
	}

	return array.slice(0, keys.length);
}

function toColorArray(value: any, withAlpha: boolean): number[] {
	if (typeof value === "string" && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) {
		const color = Color3.FromHexString(value.substring(0, 7));
		const alpha = value.length === 9 ? parseInt(value.substring(7), 16) / 255 : 1;

		return withAlpha ? [color.r, color.g, color.b, alpha] : [color.r, color.g, color.b];
	}

	return toNumberArray(value, withAlpha ? ["r", "g", "b", "a"] : ["r", "g", "b"], withAlpha ? "color4" : "color3");
}

function getEntityValue(scene: Scene, entityType: string, value: any): string {
	switch (entityType) {
		case "node":
		case "sound":
			return resolveNode({ scene, nodeId: value, nodeName: value }).id;

		case "animationGroup": {
			const animationGroup = scene.animationGroups.find((group) => group.name === value || group.uniqueId.toString() === String(value));
			if (!animationGroup) {
				throw new Error(`Animation group not found: ${value}. Available: ${scene.animationGroups.map((group) => group.name).join(", ") || "none"}.`);
			}

			// Animation groups are linked by name.
			return animationGroup.name;
		}

		case "particleSystem": {
			const particleSystem = scene.particleSystems.find((system) => system.id === value || system.name === value);
			if (!particleSystem) {
				throw new Error(`Particle system not found: ${value}.`);
			}

			return particleSystem.id;
		}

		default:
			throw new Error(`Unsupported entity type "${entityType}".`);
	}
}

async function getAssetValue(assetType: string, value: any): Promise<string> {
	if (typeof value !== "string") {
		throw new Error(`Invalid asset: ${JSON.stringify(value)}. Give the path of the asset in the project, e.g. "assets/weapon.json".`);
	}

	const projectDirectory = getProjectDirectory();
	const path = value.replace(/\\/g, "/");
	const relativePath = isAbsolute(path) ? relative(projectDirectory, path) : path.replace(/^\.\//, "");

	const extensions = assetExtensions[assetType];
	if (extensions && !extensions.includes(extname(relativePath).toLowerCase())) {
		throw new Error(`"${value}" is not a ${assetType} asset: expected a ${extensions.join(" or ")} file.`);
	}

	if (!(await pathExists(join(projectDirectory, relativePath)))) {
		throw new Error(`Asset not found in the project: ${value}.`);
	}

	// Assets are linked by their path relative to the project, as the inspector does.
	return relativePath;
}

function getTextureValue(scene: Scene, value: any): any {
	if (typeof value !== "string") {
		throw new Error(`Invalid texture: ${JSON.stringify(value)}. Give the path of an image of the project, e.g. "assets/crosshair.png".`);
	}

	const projectDirectory = getProjectDirectory();
	const path = value.replace(/\\/g, "/");
	const absolutePath = isAbsolute(path) ? path : join(projectDirectory, path);

	const texture = configureImportedTexture(new Texture(absolutePath, scene));
	const serializedTexture = texture.serialize();
	texture.dispose();

	return serializedTexture;
}

/**
 * Converts the given value to the value saved for the given decorated property, as the inspector saves it.
 */
export async function getScriptPropertyValue(scene: Scene, property: VisibleInInspectorDecoratorObject, value: any): Promise<any> {
	const configuration = property.configuration as any;

	if (value === null && ["entity", "asset", "texture"].includes(configuration.type)) {
		return null;
	}

	switch (configuration.type) {
		case "number": {
			const number = typeof value === "string" ? parseFloat(value) : value;
			if (typeof number !== "number" || !Number.isFinite(number)) {
				throw new Error(`Invalid number: ${JSON.stringify(value)}.`);
			}

			return number;
		}

		case "boolean":
			return value === true || value === "true";

		case "string":
			return String(value);

		case "vector2":
			return toNumberArray(value, ["x", "y"], "vector2");

		case "vector3":
			return toNumberArray(value, ["x", "y", "z"], "vector3");

		case "color3":
			return toColorArray(value, false);

		case "color4":
			return toColorArray(value, true);

		case "keymap":
			return getKeyMapValue(value);

		case "entity":
			return getEntityValue(scene, configuration.entityType, value);

		case "asset":
			return getAssetValue(configuration.assetType, value);

		case "texture":
			return getTextureValue(scene, value);

		default:
			throw new Error(`Unsupported property type "${configuration.type}".`);
	}
}
