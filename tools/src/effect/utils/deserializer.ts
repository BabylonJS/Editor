import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import type { IData, IParticleSystemConfig, ITransform, IGroup, IEmitter } from "../types";

/**
 * Deserialize Color4 from JSON (supports both object {r,g,b,a} and array [r,g,b,a] formats)
 */
export function deserializeColor4(value: any): Color4 | undefined {
	if (!value) {
		return undefined;
	}
	if (value instanceof Color4) {
		return value;
	}
	if (Array.isArray(value)) {
		return new Color4(value[0] ?? 1, value[1] ?? 1, value[2] ?? 1, value[3] ?? 1);
	}
	if (typeof value === "object") {
		return new Color4(value.r ?? value[0] ?? 1, value.g ?? value[1] ?? 1, value.b ?? value[2] ?? 1, value.a ?? value[3] ?? 1);
	}
	return undefined;
}

/**
 * Deserialize Vector3 from JSON (supports both object {x,y,z} and array [x,y,z] formats)
 */
export function deserializeVector3(value: any): Vector3 | undefined {
	if (!value) {
		return undefined;
	}
	if (value instanceof Vector3) {
		return value;
	}
	if (Array.isArray(value)) {
		return new Vector3(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
	}
	if (typeof value === "object") {
		return new Vector3(value.x ?? value[0] ?? 0, value.y ?? value[1] ?? 0, value.z ?? value[2] ?? 0);
	}
	return undefined;
}

/**
 * Deserialize Quaternion from JSON (supports both object {x,y,z,w} and array [x,y,z,w] formats)
 */
export function deserializeQuaternion(value: any): Quaternion | undefined {
	if (!value) {
		return undefined;
	}
	if (value instanceof Quaternion) {
		return value;
	}
	if (Array.isArray(value)) {
		return new Quaternion(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0, value[3] ?? 1);
	}
	if (typeof value === "object") {
		return new Quaternion(value.x ?? value[0] ?? 0, value.y ?? value[1] ?? 0, value.z ?? value[2] ?? 0, value.w ?? value[3] ?? 1);
	}
	return undefined;
}

/**
 * Deserialize ITransform from JSON
 */
export function deserializeTransform(transform: any): ITransform {
	if (!transform) {
		return {
			position: Vector3.Zero(),
			rotation: Quaternion.Identity(),
			scale: Vector3.One(),
		};
	}

	return {
		position: deserializeVector3(transform.position) || Vector3.Zero(),
		rotation: deserializeQuaternion(transform.rotation) || Quaternion.Identity(),
		scale: deserializeVector3(transform.scale) || Vector3.One(),
	};
}

/**
 * Deserialize IParticleSystemConfig from JSON
 * Converts Color4, Vector3 from plain objects/arrays to proper class instances
 */
export function deserializeParticleSystemConfig(config: any): IParticleSystemConfig {
	if (!config) {
		return {
			systemType: "base",
		};
	}

	const deserialized: IParticleSystemConfig = {
		...config,
	};

	// Deserialize colors
	if (config.color1 !== undefined) {
		deserialized.color1 = deserializeColor4(config.color1);
	}
	if (config.color2 !== undefined) {
		deserialized.color2 = deserializeColor4(config.color2);
	}
	if (config.colorDead !== undefined) {
		deserialized.colorDead = deserializeColor4(config.colorDead);
	}

	// Deserialize vectors
	if (config.gravity !== undefined) {
		deserialized.gravity = deserializeVector3(config.gravity);
	}
	if (config.noiseStrength !== undefined) {
		deserialized.noiseStrength = deserializeVector3(config.noiseStrength);
	}

	return deserialized;
}

/**
 * Deserialize IEmitter from JSON
 */
export function deserializeEmitter(emitter: any): IEmitter {
	if (!emitter) {
		throw new Error("Cannot deserialize null emitter");
	}

	return {
		...emitter,
		transform: deserializeTransform(emitter.transform),
		config: deserializeParticleSystemConfig(emitter.config),
	};
}

/**
 * Deserialize IGroup from JSON (recursively)
 */
export function deserializeGroup(group: any): IGroup {
	if (!group) {
		throw new Error("Cannot deserialize null group");
	}

	return {
		...group,
		transform: deserializeTransform(group.transform),
		children:
			group.children?.map((child: any) => {
				if (child.children !== undefined) {
					return deserializeGroup(child);
				}
				return deserializeEmitter(child);
			}) || [],
	};
}

/**
 * Deserialize IData from JSON
 * Converts all Color4, Vector3, Quaternion from plain objects/arrays to proper class instances
 */
export function deserializeData(data: any): IData {
	if (!data) {
		return {
			root: null,
			materials: [],
			textures: [],
			images: [],
			geometries: [],
		};
	}

	const deserialized: IData = {
		materials: data.materials || [],
		textures: data.textures || [],
		images: data.images || [],
		geometries: data.geometries || [],
		root: null,
	};

	// Deserialize root (can be IGroup or IEmitter)
	if (data.root) {
		if (data.root.children !== undefined) {
			deserialized.root = deserializeGroup(data.root);
		} else {
			deserialized.root = deserializeEmitter(data.root);
		}
	}

	return deserialized;
}
