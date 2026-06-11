import { Scene, Node, Material, Color3, Color4, Vector2, Vector3, Vector4, AbstractMesh, TransformNode } from "babylonjs";

import { isAbstractMesh, isAnyTransformNode } from "../../tools/guards/nodes";

/**
 * Defines the shape of the options used to resolve a node from the scene.
 */
export interface IResolveNodeOptions {
	scene: Scene;
	nodeId?: string;
	nodeName?: string;
}

/**
 * Defines the shape of the options used to resolve a material from the scene.
 */
export interface IResolveMaterialOptions {
	scene: Scene;
	materialId?: string;
	materialName?: string;
}

/**
 * Defines the shape of a node summary as defined by the MCP tools contract.
 */
export interface INodeSummary {
	id: string;
	name: string;
	className: string;
	position?: [number, number, number];
	rotation?: [number, number, number];
	scaling?: [number, number, number];
	parentId?: string | null;
	materialId?: string | null;
	isEnabled: boolean;
	isVisible?: boolean;
}

/**
 * Resolves a node from the given scene using its id first, then its name.
 * @param options defines the scene and the id/name to resolve the node from.
 */
export function resolveNode(options: IResolveNodeOptions): Node {
	const { scene, nodeId, nodeName } = options;

	let node: Node | null = null;

	if (nodeId) {
		node = scene.getNodeById(nodeId);
	}

	if (!node && nodeName) {
		node = scene.getNodeByName(nodeName);
	}

	if (!node) {
		throw new Error(`Node not found: ${nodeId ?? nodeName}`);
	}

	return node;
}

/**
 * Resolves a material from the given scene using its id first, then its name.
 * @param options defines the scene and the id/name to resolve the material from.
 */
export function resolveMaterial(options: IResolveMaterialOptions): Material {
	const { scene, materialId, materialName } = options;

	let material: Material | null = null;

	if (materialId) {
		material = scene.getMaterialById(materialId);
	}

	if (!material && materialName) {
		material = scene.getMaterialByName(materialName);
	}

	if (!material) {
		throw new Error(`Material not found: ${materialId ?? materialName}`);
	}

	return material;
}

/**
 * Produces the contract's node-summary shape for the given node.
 * @param node defines the reference to the node to summarize.
 */
export function toNodeSummary(node: Node): INodeSummary {
	const summary: INodeSummary = {
		id: node.id,
		name: node.name,
		className: node.getClassName(),
		isEnabled: node.isEnabled(false),
		parentId: node.parent?.id ?? null,
	};

	if (isAbstractMesh(node) || isAnyTransformNode(node)) {
		const transform = node as unknown as TransformNode;
		summary.position = [transform.position.x, transform.position.y, transform.position.z];
		summary.rotation = [transform.rotation.x, transform.rotation.y, transform.rotation.z];
		summary.scaling = [transform.scaling.x, transform.scaling.y, transform.scaling.z];
	}

	if (isAbstractMesh(node)) {
		const mesh = node as AbstractMesh;
		summary.isVisible = mesh.isVisible;
		summary.materialId = mesh.material?.id ?? null;
	}

	return summary;
}

/**
 * Coerces the given value to a Color3 instance.
 * @param value defines the value to coerce ([r,g,b] array or Color3).
 */
export function toColor3(value: any): Color3 {
	if (value instanceof Color3) {
		return value;
	}

	if (Array.isArray(value)) {
		return new Color3(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
	}

	throw new Error(`Cannot coerce value to Color3: ${JSON.stringify(value)}`);
}

/**
 * Coerces the given value to a Vector3 instance.
 * @param value defines the value to coerce ([x,y,z] array or Vector3).
 */
export function toVector3(value: any): Vector3 {
	if (value instanceof Vector3) {
		return value;
	}

	if (Array.isArray(value)) {
		return new Vector3(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
	}

	throw new Error(`Cannot coerce value to Vector3: ${JSON.stringify(value)}`);
}

/**
 * Deeply sets a property on the given target using a dotted path (e.g. "material.albedoColor").
 * Arrays are coerced to Color3/Vector3/Color4/Vector2/Vector4 based on the existing property type.
 * @param target defines the root object on which to set the property.
 * @param path defines the dotted path to the property to set.
 * @param value defines the value to set.
 */
export function deepSet(target: any, path: string, value: any): void {
	const parts = path.split(".");

	let current = target;
	for (let i = 0; i < parts.length - 1; i++) {
		if (current === null || current === undefined) {
			throw new Error(`Cannot set property "${path}": "${parts[i]}" is null or undefined.`);
		}
		current = current[parts[i]];
	}

	if (current === null || current === undefined) {
		throw new Error(`Cannot set property "${path}": parent object is null or undefined.`);
	}

	const key = parts[parts.length - 1];
	current[key] = coerceValueForExistingProperty(current[key], value);
}

/**
 * Coerces the given value to match the type of the existing property value when relevant
 * (Color3/Color4/Vector2/Vector3/Vector4). Otherwise returns the value as-is.
 * @param existing defines the current value of the property.
 * @param value defines the new value to coerce.
 */
export function coerceValueForExistingProperty(existing: any, value: any): any {
	if (Array.isArray(value)) {
		if (existing instanceof Color3) {
			return new Color3(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
		}
		if (existing instanceof Color4) {
			return new Color4(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0, value[3] ?? 1);
		}
		if (existing instanceof Vector2) {
			return new Vector2(value[0] ?? 0, value[1] ?? 0);
		}
		if (existing instanceof Vector3) {
			return new Vector3(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
		}
		if (existing instanceof Vector4) {
			return new Vector4(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0, value[3] ?? 0);
		}

		// No existing typed value to infer from: pick by array length.
		if (value.length === 3) {
			return new Vector3(value[0], value[1], value[2]);
		}
	}

	return value;
}
