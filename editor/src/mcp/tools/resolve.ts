import { AdvancedDynamicTexture } from "babylonjs-gui";
import { Scene, Node, Light, Material, Color3, Color4, Vector2, Vector3, Vector4, AbstractMesh, IParticleSystem, Skeleton, Sprite } from "babylonjs";

import { isSpriteManagerNode } from "../../tools/guards/sprites";
import { isNodeVisibleInGraph } from "../../tools/node/metadata";
import { isAdvancedDynamicTexture } from "../../tools/guards/texture";
import { isParticleSystemVisibleInGraph } from "../../tools/particles/metadata";
import { isGPUParticleSystem, isParticleSystem } from "../../tools/guards/particles";
import { isAbstractMesh, isAnyTransformNode, isCamera, isClusteredLightContainer, isEditorCamera, isMesh, isNode } from "../../tools/guards/nodes";

/**
 * Defines the objects shown in the graph of the editor.
 */
export type GraphObject = Node | IParticleSystem | Sprite | Skeleton | AdvancedDynamicTexture;

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
	direction?: [number, number, number];
	parentId?: string | null;
	materialId?: string | null;
	isEnabled: boolean;
	isVisible?: boolean;
}

/**
 * Returns the lights of the clustered light container of the given scene. The container takes them out of `scene.lights`,
 * so the `get*` functions of the scene don't find them.
 * @param scene defines the reference to the scene to get the clustered lights from.
 */
function getClusteredLights(scene: Scene): readonly Light[] {
	return scene.lights.find((light) => isClusteredLightContainer(light))?.lights ?? [];
}

/**
 * Finds a node in the given scene using its id first, then its name.
 * @param options defines the scene and the id/name to find the node from.
 */
function findNode(options: IResolveNodeOptions): Node | null {
	const { scene, nodeId, nodeName } = options;

	const clusteredLights = getClusteredLights(scene);

	let node: Node | null = null;

	if (nodeId) {
		node = scene.getNodeById(nodeId) ?? clusteredLights.find((light) => light.id === nodeId) ?? null;
	}

	if (!node && nodeName) {
		node = scene.getNodeByName(nodeName) ?? clusteredLights.find((light) => light.name === nodeName) ?? null;
	}

	return node;
}

/**
 * Resolves a node from the given scene using its id first, then its name.
 * @param options defines the scene and the id/name to resolve the node from.
 */
export function resolveNode(options: IResolveNodeOptions): Node {
	const node = findNode(options);

	if (!node) {
		throw new Error(`Node not found: ${options.nodeId ?? options.nodeName}`);
	}

	return node;
}

/**
 * Returns wether or not the given particle system is shown in the graph of the editor.
 * @param particleSystem defines the reference to the particle system to check.
 */
export function isParticleSystemInGraph(particleSystem: IParticleSystem): boolean {
	return (isParticleSystem(particleSystem) || isGPUParticleSystem(particleSystem)) && isParticleSystemVisibleInGraph(particleSystem);
}

/**
 * Returns wether or not the given node is shown in the graph of the editor, using the same rules as `EditorGraph._parseSceneNode`.
 * This excludes the nodes internal to the editor (its camera, collision meshes, LODs, ...) and the removed nodes: they stay
 * in memory, attached to their parent, so the user can undo their removal.
 * @param node defines the reference to the node to check.
 */
export function isNodeInGraph(node: Node): boolean {
	if (isClusteredLightContainer(node)) {
		return true;
	}

	if (!isNode(node) || isEditorCamera(node) || node.reservedDataStore?.hidden) {
		return false;
	}

	if (isMesh(node) && (node._masterMesh || !isNodeVisibleInGraph(node))) {
		return false;
	}

	const scene = node.getScene();

	if (isAnyTransformNode(node)) {
		return scene.transformNodes.includes(node);
	}

	if (isAbstractMesh(node)) {
		return scene.meshes.includes(node);
	}

	if (isCamera(node)) {
		return scene.cameras.includes(node);
	}

	return scene.lights.includes(node as Light) || getClusteredLights(scene).includes(node as Light);
}

/**
 * Returns the id of the given object of the graph, the one `resolveGraphObject` resolves. Sprites and GUI have no id
 * of their own: the graph identifies them by their unique id.
 * @param object defines the reference to the object of the graph.
 */
export function getGraphObjectId(object: any): string | null {
	return object.id ?? object.uniqueId?.toString() ?? null;
}

/**
 * Resolves an object from what the graph of the editor shows: a node, or a particle system, a sprite, a skeleton or a GUI.
 * @param options defines the scene and the id/name to resolve the object from.
 */
export function resolveGraphObject(options: IResolveNodeOptions): GraphObject {
	const { scene, nodeId, nodeName } = options;

	const node = findNode(options);
	if (node) {
		return node;
	}

	const objects: GraphObject[] = [
		...scene.particleSystems.filter((particleSystem) => isParticleSystemInGraph(particleSystem)),
		...scene.transformNodes.filter((transformNode) => isSpriteManagerNode(transformNode)).flatMap((spriteManagerNode) => spriteManagerNode.spriteManager?.sprites ?? []),
		...scene.skeletons,
		...scene.textures.filter((texture) => isAdvancedDynamicTexture(texture)),
	];

	const object = objects.find((o) => getGraphObjectId(o) === nodeId) ?? objects.find((o) => o.name === nodeName);
	if (!object) {
		throw new Error(`Node not found: ${nodeId ?? nodeName}`);
	}

	return object;
}

/**
 * Resolves an object of the graph the user can modify, refusing the nodes internal to the editor.
 * @param options defines the scene and the id/name to resolve the object from.
 */
export function resolveEditableGraphObject(options: IResolveNodeOptions): GraphObject {
	const object = resolveGraphObject(options);

	if (object instanceof Node && !isNodeInGraph(object)) {
		throw new Error(`"${object.name}" is internal to the editor: it isn't part of the scene shown in the graph.`);
	}

	return object;
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

	// Transform-like properties are read by duck-typing so they also cover cameras and lights
	// (which expose position/direction without being TransformNodes).
	const anyNode = node as any;

	if (anyNode.position?.x !== undefined) {
		summary.position = [anyNode.position.x, anyNode.position.y, anyNode.position.z];
	}
	if (anyNode.rotation?.x !== undefined) {
		summary.rotation = [anyNode.rotation.x, anyNode.rotation.y, anyNode.rotation.z];
	}
	if (anyNode.scaling?.x !== undefined) {
		summary.scaling = [anyNode.scaling.x, anyNode.scaling.y, anyNode.scaling.z];
	}
	if (anyNode.direction?.x !== undefined) {
		summary.direction = [anyNode.direction.x, anyNode.direction.y, anyNode.direction.z];
	}

	if (isAbstractMesh(node)) {
		const mesh = node as AbstractMesh;
		summary.isVisible = mesh.isVisible;
		summary.materialId = mesh.material?.id ?? null;
	}

	return summary;
}

/**
 * Produces the summary of the given object of the graph: the contract's node-summary shape for nodes.
 * @param object defines the reference to the object of the graph to summarize.
 */
export function toGraphObjectSummary(object: GraphObject): INodeSummary | (Pick<INodeSummary, "name" | "className"> & { id: string | null }) {
	if (object instanceof Node) {
		return toNodeSummary(object);
	}

	return {
		id: getGraphObjectId(object),
		name: object.name,
		className: object.getClassName(),
	};
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
 * Methods are never replaced: "isEnabled" is set through "setEnabled", and other methods throw.
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

	// A method is never replaced by a value: the engine calls it, like "isEnabled()" on each frame.
	if (typeof current[key] === "function") {
		const setterName = key.replace(/^is(?=[A-Z])/, "set");
		if (setterName !== key && typeof current[setterName] === "function") {
			current[setterName](value);
			return;
		}

		throw new Error(`Cannot set property "${path}": "${key}" is a method, not a property.`);
	}

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
