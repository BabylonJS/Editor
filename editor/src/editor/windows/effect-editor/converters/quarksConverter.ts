import { Tools } from "@babylonjs/core/Misc/tools";
import type { IQuarksJSON, IQuarksObject } from "./quarks/types";
import type { IGroup, IEmitter, IData } from "babylonjs-editor-tools";
import { convertTransform } from "./quarks/transformConverter";
import { convertEmitterConfig } from "./quarks/emitterConfigConverter";
import { convertMaterial, convertTexture, convertImage, convertGeometry } from "./quarks/resourceConverter";

/**
 * Converts Quarks Effect to Babylon.js Effect format
 * All coordinate system conversions happen here, once
 */
export class QuarksConverter {
	/**
	 * Convert Quarks Effect to Babylon.js Effect format
	 * Handles errors gracefully and returns partial data if conversion fails
	 */
	public convert(data: IQuarksJSON): IData {
		let root: IGroup | IEmitter | null = null;

		try {
			root = this._convertObject(data.object, null);
		} catch (error) {
			console.error(`Failed to convert root object: ${error instanceof Error ? error.message : String(error)}`);
		}

		// Convert all resources with error handling
		const materials = this._convertResources(data.materials, (m) => convertMaterial(m), "materials");
		const textures = this._convertResources(data.textures, (t) => convertTexture(t), "textures");
		const images = this._convertResources(data.images, (i) => convertImage(i), "images");
		const geometries = this._convertResources(data.geometries, (g) => convertGeometry(g), "geometries");

		return {
			root,
			materials,
			textures,
			images,
			geometries,
		};
	}

	/**
	 * Helper: Convert resources array with error handling
	 */
	private _convertResources<T, R>(items: T[] | undefined, converter: (item: T) => R, resourceName: string): R[] {
		try {
			return (items || []).map(converter);
		} catch (error) {
			console.error(`Failed to convert ${resourceName}: ${error instanceof Error ? error.message : String(error)}`);
			return [];
		}
	}

	/**
	 * Convert a IQuarks object to Babylon.js format
	 */
	private _convertObject(obj: IQuarksObject, parentUuid: string | null): IGroup | IEmitter | null {
		if (!obj || typeof obj !== "object") {
			return null;
		}

		const transform = convertTransform(obj.matrix, obj.position, obj.rotation, obj.scale);

		if (obj.type === "Group") {
			const group: IGroup = {
				uuid: obj.uuid || Tools.RandomId(),
				name: obj.name || "Group",
				transform,
				children: [],
			};

			// Convert children
			if (obj.children && Array.isArray(obj.children)) {
				for (const child of obj.children) {
					const convertedChild = this._convertObject(child, group.uuid);
					if (convertedChild) {
						group.children.push(convertedChild);
					}
				}
			}

			return group;
		} else if (obj.type === "ParticleEmitter" && obj.ps) {
			// Convert emitter config from IQuarks to format
			const config = convertEmitterConfig(obj.ps);

			const emitter: IEmitter = {
				uuid: obj.uuid || Tools.RandomId(),
				name: obj.name || "ParticleEmitter",
				transform,
				config,
				materialId: obj.ps.material,
				parentUuid: parentUuid ?? undefined,
				systemType: config.systemType, // systemType is set in convertEmitterConfig
				matrix: obj.matrix, // Store original matrix for rotation extraction
			};

			return emitter;
		}

		return null;
	}
}
