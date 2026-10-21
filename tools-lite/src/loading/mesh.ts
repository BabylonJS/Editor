import {
	cloneTransformNode,
	createMeshFromData,
	createMorphTargets,
	createStandardMaterial,
	decomposeMat4,
	EngineContext,
	getCameraPosition,
	Material,
	Mesh,
	SceneContext,
	SceneNode,
	setMorphTargetWeights,
	setThinInstances,
} from "@babylonjs/lite";

import { setClassName } from "../tools/guards";
import { getSceneData } from "../tools/scene";
import { babylonEulerToQuaternion } from "../tools/maths";
import { _markNodeAsInternal, _markNodeAsSubMesh, _refreshNodeVisibility, _setNodeHiddenByLod, getOnDisposeObservable, isNodeHiddenByLod } from "../tools/node";

import { extractSubMeshGeometry, IMeshGeometryData } from "./geometry";

/**
 * Defines the billboard modes of Babylon.js, emulated by the tools for the meshes as Babylon Lite meshes have no billboard mode.
 */
export const BillboardMode = {
	BILLBOARDMODE_NONE: 0,
	BILLBOARDMODE_X: 1,
	BILLBOARDMODE_Y: 2,
	BILLBOARDMODE_Z: 4,
	BILLBOARDMODE_ALL: 7,
	BILLBOARDMODE_USE_POSITION: 128,
} as const;

/**
 * Applies the transform (position, rotation and scaling) of the given serialized node to the given node.
 * The Euler rotations are converted using the Babylon.js convention.
 * @param node defines the reference to the node to configure.
 * @param data defines the serialized node.
 */
export function applySerializedTransform(node: SceneNode, data: any): void {
	if (data.position) {
		node.position.set(data.position[0], data.position[1], data.position[2]);
	}

	if (data.rotationQuaternion) {
		node.rotationQuaternion.set(data.rotationQuaternion[0], data.rotationQuaternion[1], data.rotationQuaternion[2], data.rotationQuaternion[3]);
	} else if (data.rotation) {
		const q = babylonEulerToQuaternion(data.rotation[0], data.rotation[1], data.rotation[2]);
		node.rotationQuaternion.set(q[0], q[1], q[2], q[3]);
	}

	if (data.scaling) {
		node.scaling.set(data.scaling[0], data.scaling[1], data.scaling[2]);
	}
}

/**
 * Returns wether or not the given serialized node is mirrored (negative scaling determinant).
 * @param data defines the serialized node.
 */
export function isSerializedNodeMirrored(data: any): boolean {
	const scaling = data.scaling;
	return scaling ? scaling[0] * scaling[1] * scaling[2] < 0 : false;
}

const defaultMaterials = new WeakMap<EngineContext, Material>();

/**
 * Returns the default material used by the meshes that have no material, as Babylon.js does with its default material.
 * @param scene defines the reference to the scene.
 */
export function getDefaultMaterial(scene: SceneContext): Material {
	const engine = scene.surface.engine;

	let material = defaultMaterials.get(engine);
	if (!material) {
		material = createStandardMaterial();
		material.name = "default material";
		defaultMaterials.set(engine, material);
	}

	return material;
}

const morphTargetsInfluences = new WeakMap<Mesh, IMorphTargetInfluence[]>();

/**
 * Defines a morph target of a mesh, which influence can be animated or set by scripts.
 */
export interface IMorphTargetInfluence {
	/**
	 * Defines the id of the morph target as set in the editor.
	 */
	readonly id: string;
	/**
	 * Defines the name of the morph target as set in the editor.
	 */
	readonly name: string;
	/**
	 * Defines the influence of the morph target in [0, 1].
	 */
	influence: number;
}

/**
 * Returns the morph targets of the given mesh, which influences can be animated or set by scripts.
 * @param mesh defines the reference to the mesh.
 */
export function getMeshMorphTargets(mesh: Mesh): IMorphTargetInfluence[] {
	return morphTargetsInfluences.get(mesh) ?? [];
}

/**
 * Creates the morph targets of the given mesh from the given serialized morph target manager. Babylon.js stores the
 * absolute positions and normals of each target while Babylon Lite expects the deltas from the base geometry.
 * Babylon Lite supports up to 4 morph targets per mesh and only for the meshes using PBR materials.
 * @param engine defines the reference to the engine.
 * @param mesh defines the reference to the mesh.
 * @param geometry defines the base geometry of the mesh.
 * @param targets defines the serialized targets (with their positions and normals already loaded).
 */
export function createMeshMorphTargets(engine: EngineContext, mesh: Mesh, geometry: IMeshGeometryData, targets: any[]): void {
	const vertexCount = geometry.positions.length / 3;

	const effectiveTargets = targets.slice(0, 4);
	if (targets.length > 4) {
		console.warn(`Babylon.js Editor Tools Lite: mesh "${mesh.name}" has ${targets.length} morph targets, Babylon Lite supports up to 4 morph targets.`);
	}

	const deltas = effectiveTargets.map((target) => {
		const positions = new Float32Array(vertexCount * 3);
		const targetPositions = target.positions as ArrayLike<number> | undefined;

		if (targetPositions?.length === positions.length) {
			for (let i = 0; i < positions.length; ++i) {
				positions[i] = targetPositions[i] - geometry.positions[i];
			}
		}

		let normals: Float32Array | null = null;
		const targetNormals = target.normals as ArrayLike<number> | undefined;

		if (geometry.normals && targetNormals?.length === positions.length) {
			normals = new Float32Array(vertexCount * 3);
			for (let i = 0; i < normals.length; ++i) {
				normals[i] = targetNormals[i] - geometry.normals[i];
			}
		}

		return { positions, normals };
	});

	const weights = effectiveTargets.map((target) => target.influence ?? 0);
	const morphTargets = createMorphTargets(engine, deltas, vertexCount, weights);

	mesh.morphTargets = morphTargets;

	const influences: IMorphTargetInfluence[] = effectiveTargets.map((target, index) => {
		let influence = target.influence ?? 0;

		return {
			id: target.id,
			name: target.name,
			get influence() {
				return influence;
			},
			set influence(value: number) {
				influence = value;
				weights[index] = value;
				setMorphTargetWeights(engine, morphTargets, weights);
			},
		};
	});

	morphTargetsInfluences.set(mesh, influences);
}

/**
 * Defines the result of the creation of a mesh from its serialized data.
 */
export interface ICreatedMesh {
	/**
	 * Defines the main mesh: the one created for the first sub-mesh, holding the transform of the serialized mesh.
	 */
	mesh: Mesh;
	/**
	 * Defines the extra meshes created for the other sub-meshes when the mesh uses a multi-material (children of the main mesh).
	 */
	subMeshes: Mesh[];
}

/**
 * Creates the Babylon Lite mesh for the given serialized mesh and geometry. Babylon Lite meshes are drawn with a
 * single material: when the mesh uses a multi-material, one extra mesh is created for each other sub-mesh, as a child
 * of the main mesh with an identity transform. These extra meshes are internal to the tools.
 * @param scene defines the reference to the scene.
 * @param data defines the serialized mesh.
 * @param geometry defines the geometry of the mesh.
 * @param getMaterial defines the function returning the material of a sub-mesh from its material index.
 */
export function createMeshFromSerializedData(scene: SceneContext, data: any, geometry: IMeshGeometryData, getMaterial: (materialIndex: number) => Material | null): ICreatedMesh {
	const engine = scene.surface.engine;

	const materials = geometry.subMeshes.map((subMesh) => getMaterial(subMesh.materialIndex));
	const singleMaterial = materials.every((material) => material === materials[0]);

	const createMesh = (name: string, meshGeometry: IMeshGeometryData, material: Material | null) => {
		const mesh = createMeshFromData(
			engine,
			name,
			meshGeometry.positions,
			meshGeometry.normals!,
			meshGeometry.indices,
			meshGeometry.uvs ?? undefined,
			meshGeometry.uvs2 ?? undefined,
			meshGeometry.tangents ?? undefined,
			meshGeometry.colors ?? undefined
		);

		mesh.material = material ?? getDefaultMaterial(scene);
		mesh.receiveShadows = data.receiveShadows ?? false;
		mesh.pickable = data.pickable ?? data.isPickable ?? true;
		mesh.hasVertexAlpha = data.hasVertexAlpha ?? false;

		return mesh;
	};

	if (singleMaterial || geometry.subMeshes.length === 1) {
		const mesh = createMesh(data.name, geometry, materials[0]);
		return { mesh, subMeshes: [] };
	}

	const mesh = createMesh(data.name, extractSubMeshGeometry(geometry, geometry.subMeshes[0]), materials[0]);

	const subMeshes = geometry.subMeshes.slice(1).map((subMesh, index) => {
		const subMeshMesh = createMesh(`${data.name}_sub${index + 1}`, extractSubMeshGeometry(geometry, subMesh), materials[index + 1]);

		subMeshMesh.id = `${data.id}_sub${index + 1}`;
		subMeshMesh.parent = mesh;
		mesh.children.push(subMeshMesh);

		_markNodeAsSubMesh(subMeshMesh);
		setClassName(subMeshMesh, "Mesh");

		return subMeshMesh;
	});

	return { mesh, subMeshes };
}

/**
 * Applies the thin instances saved with the given serialized mesh, if any.
 * @param mesh defines the reference to the mesh.
 * @param data defines the serialized mesh.
 */
export function applySerializedThinInstances(mesh: Mesh, data: any): void {
	const thinInstances = data.thinInstances;
	if (!thinInstances?.instancesCount || !thinInstances.matrixData) {
		return;
	}

	setThinInstances(mesh, new Float32Array(thinInstances.matrixData), thinInstances.instancesCount);
}

/**
 * Creates the instances of the given mesh. Babylon Lite doesn't support instanced meshes: each instance is a clone of
 * the source mesh sharing its geometry and material, available through `instance.sourceMesh`. The clones are drawn
 * separately (no GPU instancing).
 * @param mesh defines the reference to the source mesh.
 * @param data defines the serialized source mesh.
 * @returns the list of the created instances, in the same order as the serialized instances.
 */
export function createMeshInstances(mesh: Mesh, data: any): Mesh[] {
	return (data.instances ?? []).map((instanceData: any) => {
		const instance = cloneTransformNode(mesh) as Mesh;

		instance.name = instanceData.name;
		instance.id = instanceData.id;
		instance.uniqueId = instanceData.uniqueId;
		instance.metadata = instanceData.metadata ?? {};
		instance.sourceMesh = mesh;
		instance.pickable = instanceData.isPickable ?? mesh.pickable;

		applySerializedTransform(instance, instanceData);

		// The clone of the sub-meshes of the source mesh are internal too.
		instance.children.forEach((child) => {
			_markNodeAsSubMesh(child);
			setClassName(child, "Mesh");
		});

		setClassName(instance, "InstancedMesh");

		return instance;
	});
}

interface _ILodLevel {
	distance: number;
	mesh: Mesh | null;
}

interface _ILodEntry {
	node: Mesh;
	levels: _ILodLevel[];
	current: Mesh | null;
}

/**
 * Defines the levels of detail of a mesh (or instance), as set in the editor.
 */
export interface IMeshLodLevel {
	/**
	 * Defines the distance from which the level is used.
	 */
	distanceOrScreenCoverage: number;
	/**
	 * Defines the mesh displayed for the level, null when the mesh is culled from this distance.
	 */
	mesh: Mesh | null;
}

const meshesLods = new WeakMap<Mesh, _ILodEntry>();
const sceneLodEntries = new WeakMap<SceneContext, _ILodEntry[]>();

/**
 * Returns the levels of detail of the given mesh (Babylon.js `mesh.getLODLevels()`).
 * @param mesh defines the reference to the mesh.
 */
export function getMeshLodLevels(mesh: Mesh): IMeshLodLevel[] {
	return (meshesLods.get(mesh)?.levels ?? []).map((level) => ({
		distanceOrScreenCoverage: level.distance,
		mesh: level.mesh,
	}));
}

/**
 * Sets the distance of the given level of detail of the given mesh.
 * @param mesh defines the reference to the mesh.
 * @param index defines the index of the level in the levels returned by `getMeshLodLevels`.
 * @param distance defines the new distance of the level.
 */
export function setMeshLodLevelDistance(mesh: Mesh, index: number, distance: number): void {
	const entry = meshesLods.get(mesh);
	const level = entry?.levels[index];

	// Same as Babylon.js: the levels are not sorted again when the distance of a level changes.
	if (level) {
		level.distance = distance;
	}
}

/**
 * Configures the levels of detail of the given mesh or instance. Babylon Lite has no levels of detail: they are
 * emulated by the tools, each frame the mesh to display is selected according to the distance to the camera, the
 * same way Babylon.js does. As in Babylon.js, the meshes of the levels are displayed using the transform of the
 * mesh: they are attached to the mesh with an identity transform.
 * @param scene defines the reference to the scene.
 * @param node defines the reference to the mesh or instance.
 * @param levels defines the levels of detail.
 */
export function configureMeshLods(scene: SceneContext, node: Mesh, levels: IMeshLodLevel[]): void {
	if (!levels.length) {
		return;
	}

	levels.forEach((level) => {
		if (!level.mesh) {
			return;
		}

		const previousParent = level.mesh.parent as SceneNode | null;
		if (previousParent !== node) {
			const index = previousParent?.children?.indexOf(level.mesh) ?? -1;
			if (index !== -1) {
				previousParent!.children.splice(index, 1);
			}

			level.mesh.parent = node;
			node.children.push(level.mesh);
		}

		level.mesh.position.set(0, 0, 0);
		level.mesh.rotationQuaternion.set(0, 0, 0, 1);
		level.mesh.scaling.set(1, 1, 1);

		_markNodeAsInternal(level.mesh);
		_setNodeHiddenByLod(level.mesh, true);
	});

	const entry: _ILodEntry = {
		node,
		current: node,
		levels: levels.map((level) => ({ distance: level.distanceOrScreenCoverage, mesh: level.mesh })).sort((a, b) => b.distance - a.distance),
	};

	meshesLods.set(node, entry);

	const data = getSceneData(scene);
	let entries = sceneLodEntries.get(scene);

	if (!entries) {
		const newEntries: _ILodEntry[] = [];
		entries = newEntries;
		sceneLodEntries.set(scene, newEntries);

		data.onAfterAnimationsObservable.add(() => updateLods(scene, newEntries));
	}

	entries.push(entry);

	getOnDisposeObservable(node).addOnce(() => {
		const index = entries!.indexOf(entry);
		if (index !== -1) {
			entries!.splice(index, 1);
		}

		meshesLods.delete(node);
	});
}

function getMeshWorldCenter(mesh: Mesh): [number, number, number] {
	const m = mesh.worldMatrix;
	const min = mesh.boundMin ?? [0, 0, 0];
	const max = mesh.boundMax ?? [0, 0, 0];

	const x = (min[0] + max[0]) * 0.5;
	const y = (min[1] + max[1]) * 0.5;
	const z = (min[2] + max[2]) * 0.5;

	return [x * m[0] + y * m[4] + z * m[8] + m[12], x * m[1] + y * m[5] + z * m[9] + m[13], x * m[2] + y * m[6] + z * m[10] + m[14]];
}

function setLodMeshShown(mesh: Mesh, shown: boolean): void {
	if (isNodeHiddenByLod(mesh) === !shown) {
		return;
	}

	_setNodeHiddenByLod(mesh, !shown);
	_refreshNodeVisibility(mesh);
}

function updateLods(scene: SceneContext, entries: _ILodEntry[]): void {
	const camera = scene.camera;
	if (!camera) {
		return;
	}

	const cameraPosition = getCameraPosition(camera);

	for (const entry of entries) {
		const center = getMeshWorldCenter(entry.node);
		const dx = center[0] - cameraPosition.x;
		const dy = center[1] - cameraPosition.y;
		const dz = center[2] - cameraPosition.z;
		const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

		// Same as Babylon.js "Mesh.getLOD": the levels are sorted from the farthest to the closest.
		let selected: Mesh | null = entry.node;
		const closest = entry.levels[entry.levels.length - 1];

		if (closest.distance <= distance) {
			for (const level of entry.levels) {
				if (level.distance < distance) {
					selected = level.mesh;
					break;
				}
			}
		}

		if (selected === entry.current) {
			continue;
		}

		if (entry.current) {
			setLodMeshShown(entry.current, false);
		}

		if (selected) {
			setLodMeshShown(selected, true);
		}

		entry.current = selected;
	}
}

interface _IMeshBehavior {
	mesh: Mesh;
	billboardMode: number;
	infiniteDistance: boolean;
}

const sceneMeshBehaviors = new WeakMap<SceneContext, _IMeshBehavior[]>();
const meshesBehaviors = new WeakMap<Mesh, _IMeshBehavior>();

/**
 * Returns the behaviors emulated by the tools for the given mesh (billboard mode and infinite distance).
 * @param mesh defines the reference to the mesh.
 */
export function getMeshBehaviors(mesh: Mesh): { billboardMode: number; infiniteDistance: boolean } {
	const behavior = meshesBehaviors.get(mesh);

	return {
		billboardMode: behavior?.billboardMode ?? BillboardMode.BILLBOARDMODE_NONE,
		infiniteDistance: behavior?.infiniteDistance ?? false,
	};
}

/**
 * Registers the behaviors of the given mesh that Babylon Lite doesn't support and are emulated by the tools each frame:
 * the billboard mode (the mesh faces the camera) and the infinite distance (the mesh follows the camera, typically for skyboxes).
 * @param scene defines the reference to the scene.
 * @param mesh defines the reference to the mesh.
 * @param billboardMode defines the billboard mode of the mesh (see `BillboardMode`).
 * @param infiniteDistance defines wether or not the mesh follows the camera.
 */
export function registerMeshBehaviors(scene: SceneContext, mesh: Mesh, billboardMode: number, infiniteDistance: boolean): void {
	if (!billboardMode && !infiniteDistance) {
		return;
	}

	let behaviors = sceneMeshBehaviors.get(scene);
	if (!behaviors) {
		const newBehaviors: _IMeshBehavior[] = [];
		behaviors = newBehaviors;
		sceneMeshBehaviors.set(scene, newBehaviors);

		getSceneData(scene).onAfterAnimationsObservable.add(() => updateMeshBehaviors(scene, newBehaviors));
	}

	const behavior: _IMeshBehavior = { mesh, billboardMode, infiniteDistance };

	behaviors.push(behavior);
	meshesBehaviors.set(mesh, behavior);

	getOnDisposeObservable(mesh).addOnce(() => unregisterMeshBehaviors(scene, mesh));
}

/**
 * Removes the behaviors registered for the given mesh (billboard mode, infinite distance).
 * @param scene defines the reference to the scene.
 * @param mesh defines the reference to the mesh.
 */
export function unregisterMeshBehaviors(scene: SceneContext, mesh: Mesh): void {
	const behaviors = sceneMeshBehaviors.get(scene);
	const index = behaviors?.findIndex((behavior) => behavior.mesh === mesh) ?? -1;

	if (index !== -1) {
		behaviors!.splice(index, 1);
	}

	meshesBehaviors.delete(mesh);
}

function updateMeshBehaviors(scene: SceneContext, behaviors: _IMeshBehavior[]): void {
	const camera = scene.camera;
	if (!camera) {
		return;
	}

	const cameraPosition = getCameraPosition(camera);

	for (const behavior of behaviors) {
		const mesh = behavior.mesh;

		if (behavior.infiniteDistance) {
			mesh.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
		}

		if (!behavior.billboardMode) {
			continue;
		}

		let qx: number, qy: number, qz: number, qw: number;

		if ((behavior.billboardMode & BillboardMode.BILLBOARDMODE_ALL) === BillboardMode.BILLBOARDMODE_ALL) {
			// Same as Babylon.js: the mesh takes the rotation of the camera.
			const rotation = decomposeMat4(camera.worldMatrix).rotation;

			qx = rotation.x;
			qy = rotation.y;
			qz = rotation.z;
			qw = rotation.w;
		} else {
			// Billboard around the Y axis: face the camera on the horizontal plane.
			const meshPosition = mesh.worldMatrix;
			const dx = cameraPosition.x - meshPosition[12];
			const dz = cameraPosition.z - meshPosition[14];
			const angle = Math.atan2(dx, dz) + Math.PI;

			qx = 0;
			qy = Math.sin(angle * 0.5);
			qz = 0;
			qw = Math.cos(angle * 0.5);
		}

		mesh.rotationQuaternion.set(qx, qy, qz, qw);
	}
}
