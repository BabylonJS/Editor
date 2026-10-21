import { isPbrMaterial, LightBase, markMaterialUboDirty, setLightDiffuseColor, setLightIntensity } from "@babylonjs/lite";

import { isAbstractMesh, isCamera, isHemisphericLight, isLight } from "../tools/guards";
import { babylonEulerToQuaternion, quaternionToBabylonEuler } from "../tools/maths";
import { isMeshVisible, setMeshVisibleState } from "../tools/node";

/**
 * Defines a binding between an animated value and the property of a target object.
 */
export interface IAnimatedPropertyBinding {
	/**
	 * Returns the current value of the property: a number or an array of numbers.
	 */
	read(): number | number[] | null;
	/**
	 * Writes the given value to the property: a number or an array of numbers.
	 */
	write(value: number | number[]): void;
}

/**
 * Returns the name of the property of the given owner that matches the given Babylon.js property name: the
 * properties of the Babylon Lite objects don't always have the same names as their Babylon.js equivalents.
 */
function getEffectivePropertyName(owner: any, property: string): string {
	if (isCamera(owner)) {
		switch (property) {
			case "minZ":
				return "nearPlane";
			case "maxZ":
				return "farPlane";
		}
	}

	if (isHemisphericLight(owner)) {
		switch (property) {
			case "diffuse":
				return "diffuseColor";
			case "specular":
				return "specularColor";
		}
	}

	if (owner && typeof owner === "object" && "_buildGroup" in owner && isPbrMaterial(owner)) {
		switch (property) {
			case "albedoColor":
				return "baseColorFactor";
			case "metallic":
				return "metallicFactor";
			case "roughness":
				return "roughnessFactor";
		}
	}

	return property;
}

/**
 * Notifies Babylon Lite that the given object changed so the change is visible on the next frame.
 */
function notifyChanged(owner: any): void {
	if (isLight(owner)) {
		const light = owner as LightBase & { intensity: number };
		const intensity = light.intensity;

		// Lights refresh their GPU data when their version changes, which only the public setters do.
		setLightIntensity(light, intensity + 1);
		setLightIntensity(light, intensity);
	} else if (owner && typeof owner === "object" && "_buildGroup" in owner) {
		markMaterialUboDirty(owner);
	}
}

function toArray(value: any, stride: number): number[] {
	if (Array.isArray(value)) {
		return value.slice(0, stride);
	}

	if (value && typeof value === "object") {
		if ("r" in value) {
			return stride === 4 ? [value.r, value.g, value.b, value.a] : [value.r, value.g, value.b];
		}

		return [value.x, value.y, value.z, value.w].slice(0, stride);
	}

	return [];
}

function writeVector(owner: any, property: string, value: number[]): void {
	const current = owner[property];

	if (current && typeof current.set === "function") {
		current.set(...value);
	} else if (Array.isArray(current) || ArrayBuffer.isView(current)) {
		for (let i = 0; i < value.length; ++i) {
			(current as number[])[i] = value[i];
		}
	} else if (current && typeof current === "object") {
		if ("r" in current) {
			current.r = value[0];
			current.g = value[1];
			current.b = value[2];
			if (value.length > 3) {
				current.a = value[3];
			}
		} else {
			current.x = value[0];
			current.y = value[1];
			if (value.length > 2) {
				current.z = value[2];
			}
			if (value.length > 3) {
				current.w = value[3];
			}
		}
	} else {
		owner[property] = value.slice();
	}
}

/**
 * Creates a binding between the property located at the given path of the given target and the values of an
 * animation. The paths are the ones of the Babylon.js objects (ie. "position", "rotation.y", "intensity",
 * "material.alpha", etc.) and are mapped to the equivalent properties of the Babylon Lite objects. The rotations
 * expressed as Euler angles follow the Babylon.js convention.
 * @param target defines the reference to the animated object.
 * @param path defines the path of the animated property.
 * @param stride defines the number of components of the animated values (1 for floats).
 * @returns the binding or null if the path can't be resolved.
 */
export function createAnimatedPropertyBinding(target: any, path: string, stride: number): IAnimatedPropertyBinding | null {
	const parts = path.split(".");

	let owner = target;
	for (let i = 0; i < parts.length - 1; ++i) {
		const part = parts[i];

		// "rotation.x" on a node: the Euler rotation is computed from the quaternion using the Babylon.js convention.
		if (part === "rotation" && i === parts.length - 2 && owner?.rotationQuaternion) {
			const node = owner;
			const component = ["x", "y", "z"].indexOf(parts[i + 1]);
			if (component === -1) {
				return null;
			}

			return {
				read: () => quaternionToBabylonEuler(node.rotationQuaternion.x, node.rotationQuaternion.y, node.rotationQuaternion.z, node.rotationQuaternion.w)[component],
				write: (value) => {
					const euler = quaternionToBabylonEuler(node.rotationQuaternion.x, node.rotationQuaternion.y, node.rotationQuaternion.z, node.rotationQuaternion.w);
					euler[component] = value as number;
					const q = babylonEulerToQuaternion(euler[0], euler[1], euler[2]);
					node.rotationQuaternion.set(q[0], q[1], q[2], q[3]);
				},
			};
		}

		const effectivePart = getEffectivePropertyName(owner, part);
		owner = owner?.[effectivePart];

		if (owner === undefined || owner === null) {
			return null;
		}
	}

	const leaf = parts[parts.length - 1];

	// Euler rotation of a node, Babylon.js convention.
	if (leaf === "rotation" && owner?.rotationQuaternion) {
		const node = owner;
		return {
			read: () => quaternionToBabylonEuler(node.rotationQuaternion.x, node.rotationQuaternion.y, node.rotationQuaternion.z, node.rotationQuaternion.w),
			write: (value) => {
				const v = value as number[];
				const q = babylonEulerToQuaternion(v[0], v[1], v[2]);
				node.rotationQuaternion.set(q[0], q[1], q[2], q[3]);
			},
		};
	}

	// Visibility of a mesh as set in the editor.
	if (leaf === "isVisible" && isAbstractMesh(owner)) {
		const mesh = owner;
		return {
			read: () => (isMeshVisible(mesh) ? 1 : 0),
			write: (value) => setMeshVisibleState(mesh, !!value),
		};
	}

	const property = getEffectivePropertyName(owner, leaf);

	// Light intensity and color have dedicated setters in Babylon Lite.
	if (isLight(owner) && property === "intensity") {
		const light = owner as LightBase & { intensity: number };
		return {
			read: () => light.intensity,
			write: (value) => setLightIntensity(light, value as number),
		};
	}

	if (isLight(owner) && property === "diffuse" && "diffuse" in owner) {
		const light = owner as LightBase & { diffuse: [number, number, number] };
		return {
			read: () => light.diffuse.slice(),
			write: (value) => setLightDiffuseColor(light, value as [number, number, number]),
		};
	}

	if (!(property in owner)) {
		return null;
	}

	if (stride === 1) {
		return {
			read: () => {
				const value = owner[property];
				return typeof value === "boolean" ? (value ? 1 : 0) : value;
			},
			write: (value) => {
				owner[property] = typeof owner[property] === "boolean" ? !!value : value;
				notifyChanged(owner);
			},
		};
	}

	return {
		read: () => toArray(owner[property], stride),
		write: (value) => {
			writeVector(owner, property, value as number[]);
			notifyChanged(owner);
		},
	};
}

/**
 * Returns the current value of the given property of the given object, using the Babylon.js property names of the
 * editor (ie. "minZ" for the near plane of a camera, "rotation" for the Euler rotation of a node using the
 * Babylon.js convention, etc.).
 * @param target defines the root object where to get the property.
 * @param path defines the path of the property (ie. "position", "position.x", "material.alpha", etc.).
 * @returns the value of the property, or undefined if the path can't be resolved.
 */
export function getAnimatedPropertyValue(target: any, path: string): any {
	const parts = path.split(".");

	let owner = target;
	for (let i = 0; i < parts.length; ++i) {
		if (owner === undefined || owner === null) {
			return undefined;
		}

		const part = parts[i];

		if (part === "rotation" && owner.rotationQuaternion) {
			const q = owner.rotationQuaternion;
			const euler = quaternionToBabylonEuler(q.x, q.y, q.z, q.w);
			owner = { x: euler[0], y: euler[1], z: euler[2] };
			continue;
		}

		owner = owner[getEffectivePropertyName(owner, part)];
	}

	return owner;
}
