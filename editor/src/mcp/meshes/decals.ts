import { dirname, extname, isAbsolute, join } from "path/posix";

import { AbstractMesh, Material, Mesh, MeshBuilder, Ray, Scene, Tools, Vector3 } from "babylonjs";

import { UniqueNumber } from "../../tools/tools";
import { isAbstractMesh, isMesh } from "../../tools/guards/nodes";
import { setNodeSerializable, setNodeVisibleInGraph } from "../../tools/node/metadata";

import { projectConfiguration } from "../../project/configuration";

import { loadImportedMaterial } from "../../editor/layout/preview/import/import";

import { IMCPActionOptions } from "../action";
import { resolveMaterial, resolveNode, toNodeSummary, toVector3 } from "../tools/resolve";

/**
 * Defines the default width, height and depth of a decal, in centimeters, like the decals painted in the editor.
 */
export const defaultDecalSize = 100;

/**
 * Defines the configuration of a decal saved in the metadata of its mesh. It is the one the decals painted in the
 * editor have, so the inspector edits both the same way.
 */
export interface IDecalConfiguration {
	angle: number;
	sizeX: number;
	sizeY: number;
	sizeZ: number;
	meshId: string;
	position: number[];
	normal: number[];
}

interface IDecalPlacement {
	position: Vector3;
	normal: Vector3;
}

function getDecalConfiguration(node: AbstractMesh): IDecalConfiguration {
	const configuration = node.metadata?.decal;
	if (!configuration) {
		throw new Error(`Node "${node.name}" is not a decal.`);
	}

	if (!configuration.meshId || !configuration.position) {
		throw new Error(`Decal "${node.name}" can't be edited: it was merged with the other decals of its material when the scene was saved.`);
	}

	return configuration;
}

/**
 * Resolves the mesh a decal is projected on. Decals need the geometry of the mesh.
 */
function resolveDecalTarget(scene: Scene, nodeId?: string, nodeName?: string): AbstractMesh {
	const node = resolveNode({ scene, nodeId, nodeName });
	if (!isAbstractMesh(node) || !node.getTotalVertices()) {
		throw new Error(`Node "${node.name}" is not a mesh with geometry: decals are projected on the faces of a mesh.`);
	}

	if (node.metadata?.decal) {
		throw new Error(`Node "${node.name}" is a decal: project the decal on the mesh under it instead.`);
	}

	return node;
}

/**
 * Resolves the material of a new decal: a material of the scene, or a ".material" asset of the project.
 */
async function resolveDecalMaterial(scene: Scene, data: any): Promise<Material> {
	if (!data.materialAssetPath) {
		return resolveMaterial({ scene, materialId: data.materialId, materialName: data.materialName });
	}

	if (!projectConfiguration.path) {
		throw new Error("No project is open.");
	}

	const path = data.materialAssetPath.replace(/\\/g, "/");
	const absolutePath = isAbsolute(path) ? path : join(dirname(projectConfiguration.path.replace(/\\/g, "/")), path);

	if (extname(absolutePath).toLowerCase() !== ".material") {
		throw new Error(`"${data.materialAssetPath}" is not a ".material" asset.`);
	}

	const material = await loadImportedMaterial(scene, absolutePath);
	if (!material) {
		throw new Error(`Failed to load the material asset "${data.materialAssetPath}".`);
	}

	return material;
}

/**
 * Returns where the decal goes on the surface of the given mesh. Without a normal, rays are cast towards the given
 * point from the active camera and along each axis, and the point of the surface they hit the closest to the given
 * point is used, with the normal of its face: the point doesn't need to be exactly on the surface. Only the front
 * faces count, the decal being invisible on the back of a face.
 */
function getDecalPlacement(scene: Scene, target: AbstractMesh, position: Vector3, normal?: Vector3): IDecalPlacement {
	if (normal) {
		if (normal.lengthSquared() === 0) {
			throw new Error("The normal of the decal can't be a zero vector.");
		}

		return { position, normal: normal.normalizeToNew() };
	}

	const boundingSphere = target.getBoundingInfo().boundingSphere;
	const distance = Vector3.Distance(position, boundingSphere.centerWorld) + Math.max(boundingSphere.radiusWorld, 1) * 2;

	const origins = [Vector3.Up(), Vector3.Down(), Vector3.Right(), Vector3.Left(), Vector3.Forward(), Vector3.Backward()].map((axis) => position.add(axis.scale(distance)));

	const camera = scene.activeCamera;
	if (camera) {
		camera.computeWorldMatrix();
		origins.unshift(camera.globalPosition.clone());
	}

	let placement: IDecalPlacement | null = null;
	let placementDistance = Number.MAX_VALUE;

	for (const origin of origins) {
		const direction = position.subtract(origin);
		if (direction.lengthSquared() === 0) {
			continue;
		}

		const ray = new Ray(origin, direction.normalize(), Number.MAX_VALUE);
		const pick = scene.pickWithRay(ray, (mesh) => mesh === target, false);
		if (!pick?.hit || !pick.pickedPoint) {
			continue;
		}

		// The picking info turns the normal towards the ray when it hits the back of a face: read it as is.
		pick.ray = null;
		const pickedNormal = pick.getNormal(true, true);

		if (pickedNormal && Vector3.Dot(pickedNormal, ray.direction) < 0) {
			const pickedDistance = Vector3.Distance(pick.pickedPoint, position);
			if (pickedDistance < placementDistance) {
				placement = { position: pick.pickedPoint, normal: pickedNormal };
				placementDistance = pickedDistance;
			}
		}
	}

	if (!placement) {
		throw new Error(`Failed to project the decal on "${target.name}": give a \`position\` on its surface, or the \`normal\` of the surface at this position.`);
	}

	return placement;
}

function getDecalSize(value: unknown, fallback?: IDecalConfiguration): Vector3 {
	if (!Array.isArray(value)) {
		return fallback ? new Vector3(fallback.sizeX, fallback.sizeY, fallback.sizeZ) : new Vector3(defaultDecalSize, defaultDecalSize, defaultDecalSize);
	}

	const [width, height, depth] = value;
	return new Vector3(width ?? defaultDecalSize, height ?? defaultDecalSize, depth ?? fallback?.sizeZ ?? defaultDecalSize);
}

/**
 * Builds the geometry of a decal, the same way the editor does when the user paints it with the decals tool.
 */
function buildDecalMesh(name: string, target: AbstractMesh, placement: IDecalPlacement, size: Vector3, angle: number): Mesh {
	const decal = MeshBuilder.CreateDecal(name, target, {
		localMode: true,
		captureUVS: false,
		cullBackFaces: true,
		size,
		angle,
		position: placement.position,
		normal: placement.normal,
	});

	if (!decal.getTotalVertices()) {
		decal.dispose(false, false);
		throw new Error(`The decal doesn't cover any face of "${target.name}": check that \`position\` is on its surface and that \`size\` is large enough (centimeters).`);
	}

	return decal;
}

function getDecalSummary(decal: AbstractMesh): any {
	return {
		...toNodeSummary(decal),
		decal: decal.metadata.decal,
	};
}

function showDecal(decal: AbstractMesh, options: IMCPActionOptions): void {
	options.editor.layout.graph.refresh();
	options.editor.layout.graph.setSelectedNode(decal);
	options.editor.layout.inspector.setEditedObject(decal);
	options.editor.layout.inspector.forceUpdate();
}

/**
 * Projects a decal (a sticker made of a material: a logo, a crack, a stain, a poster, a road marking...) on a mesh. The
 * decal is parented to the mesh and follows it.
 */
export async function createDecal(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const target = resolveDecalTarget(scene, data.targetNodeId, data.targetNodeName);
	const material = await resolveDecalMaterial(scene, data);

	if (!data.position) {
		throw new Error("The `position` of the decal is required.");
	}

	const placement = getDecalPlacement(scene, target, toVector3(data.position), data.normal ? toVector3(data.normal) : undefined);
	const size = getDecalSize(data.size);
	const angle = data.angle ?? 0;

	const decal = buildDecalMesh(data.name ?? material.name, target, placement, size, angle);

	decal.id = Tools.RandomId();
	decal.uniqueId = UniqueNumber.Get();
	decal.isPickable = false;
	decal.receiveShadows = true;

	// Draws the decal over the faces of the mesh without z-fighting, like the decals painted in the editor.
	if (material.zOffset === 0) {
		material.zOffset = -3;
	}

	decal.material = material;

	decal.metadata = {
		decal: {
			angle,
			sizeX: size.x,
			sizeY: size.y,
			sizeZ: size.z,
			meshId: target.id,
			position: placement.position.asArray(),
			normal: placement.normal.asArray(),
		} as IDecalConfiguration,
	};

	setNodeSerializable(decal, true);
	setNodeVisibleInGraph(decal, true);

	showDecal(decal, options);

	return getDecalSummary(decal);
}

/**
 * Changes the size, the angle or the place of a decal, building its geometry again on the mesh it is projected on.
 */
export function updateDecal(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });
	if (!isMesh(node)) {
		throw new Error(`Node "${node.name}" is not a decal.`);
	}

	const configuration = getDecalConfiguration(node);

	const target = scene.getMeshById(configuration.meshId);
	if (!target) {
		throw new Error(`The mesh decal "${node.name}" is projected on doesn't exist anymore.`);
	}

	const placement: IDecalPlacement = data.position
		? getDecalPlacement(scene, target, toVector3(data.position), data.normal ? toVector3(data.normal) : undefined)
		: {
				position: Vector3.FromArray(configuration.position),
				normal: data.normal ? toVector3(data.normal).normalizeToNew() : Vector3.FromArray(configuration.normal ?? [0, 1, 0]),
			};

	const size = getDecalSize(data.size, configuration);
	const angle = data.angle ?? configuration.angle;

	const decal = buildDecalMesh(node.name, target, placement, size, angle);

	node.geometry?.releaseForMesh(node);
	decal.geometry?.applyToMesh(node);
	decal.dispose(false, false);

	node.refreshBoundingInfo(true, true);

	Object.assign(configuration, {
		angle,
		sizeX: size.x,
		sizeY: size.y,
		sizeZ: size.z,
		position: placement.position.asArray(),
		normal: placement.normal.asArray(),
	});

	showDecal(node, options);

	return getDecalSummary(node);
}
