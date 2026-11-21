import { BaseTexture, Bone, Geometry, Material, Mesh, MorphTarget, Node, Scene, Skeleton, Tools, TransformNode } from "babylonjs";

import { UniqueNumber } from "../../../../../tools/tools";
import { isMesh } from "../../../../../tools/guards/nodes";

import { matchSkeletonBones } from "../match/bones";
import { getGeometryMesh } from "../match/geometry";
import { matchMorphTargets } from "../match/morph-targets";

import { IUpdateResourcesAnalysis, IUpdateResourcesCopy, IUpdateResourcesReport } from "../types";

/**
 * Defines the copy objects belong to in the maps of the context: null for the nodes of the scene that are not part of a
 * copy of the asset (matched manually by the user).
 */
export type UpdateResourcesCopyKey = IUpdateResourcesCopy | null;

/**
 * Stores everything known about the correspondences between the objects of the asset and the objects of the scene while
 * updating the resources, per copy of the asset: the matched nodes, the bones and morph targets created from the asset,
 * the joints created in the scene, etc. Used to retarget the animations of the asset to the scene.
 */
export class UpdateResourcesContext {
	/**
	 * Defines the reference to the scene being updated.
	 */
	public readonly scene: Scene;
	/**
	 * Defines the analysis of the edited hierarchy, with the choices of the user.
	 */
	public readonly analysis: IUpdateResourcesAnalysis;
	/**
	 * Defines the report of what was done, filled while updating.
	 */
	public readonly report: IUpdateResourcesReport = {
		geometries: 0,
		skeletons: 0,
		morphTargetManagers: 0,
		transforms: 0,
		createdNodes: 0,
		updatedAnimationGroups: 0,
		addedAnimationGroups: 0,
		materials: 0,
		lods: 0,
		removedLods: 0,
		removedNodes: 0,
		warnings: [],
	};

	/**
	 * Defines the materials of the asset moved to the scene (see updateMeshMaterial).
	 */
	public readonly adoptedMaterials = new Set<Material>();
	/**
	 * Defines the textures of the asset moved to the scene with the materials using them.
	 */
	public readonly adoptedTextures = new Set<BaseTexture>();
	/**
	 * Defines the materials of the scene replaced by materials of the asset: disposed at the end of the update if no mesh uses
	 * them anymore.
	 */
	public readonly replacedMaterials = new Set<Material>();

	private readonly _nodes = new Map<UpdateResourcesCopyKey, Map<Node, TransformNode>>();
	private readonly _bones = new Map<UpdateResourcesCopyKey, Map<Bone, Bone>>();
	private readonly _morphTargets = new Map<UpdateResourcesCopyKey, Map<MorphTarget, MorphTarget>>();

	private readonly _geometries = new Map<UpdateResourcesCopyKey, Map<Geometry, Geometry>>();

	private readonly _assetBonesByJoint = new Map<Node, Bone>();
	private readonly _assetMeshesByMorphTarget = new Map<MorphTarget, Mesh>();

	private readonly _boneMatches = new Map<string, Map<Bone, Bone>>();
	private readonly _morphTargetMatches = new Map<string, Map<MorphTarget, MorphTarget>>();

	/**
	 * Constructor.
	 * @param scene defines the reference to the scene to update.
	 * @param analysis defines the analysis of the edited hierarchy, with the choices of the user.
	 */
	public constructor(scene: Scene, analysis: IUpdateResourcesAnalysis) {
		this.scene = scene;
		this.analysis = analysis;

		analysis.nodes.forEach((item) => {
			if (item.match) {
				this.registerNode(item.copy, item.match, item.node);
			}
		});

		analysis.container.skeletons.forEach((skeleton) => {
			skeleton.bones.forEach((bone) => {
				const joint = bone.getTransformNode();
				if (joint && !this._assetBonesByJoint.has(joint)) {
					this._assetBonesByJoint.set(joint, bone);
				}
			});
		});

		analysis.container.meshes.forEach((mesh) => {
			const manager = isMesh(mesh) ? mesh.morphTargetManager : null;
			for (let i = 0; i < (manager?.numTargets ?? 0); ++i) {
				this._assetMeshesByMorphTarget.set(manager!.getTarget(i), mesh as Mesh);
			}
		});
	}

	/**
	 * Adds a problem met during the update to the report.
	 * @param message defines the message describing the problem.
	 */
	public warn(message: string): void {
		this.report.warnings.push(message);
	}

	/**
	 * Registers the given node of the scene as the node corresponding to the given node of the asset in the given copy.
	 * @param copy defines the copy of the asset the node of the scene belongs to.
	 * @param assetNode defines the reference to the node of the asset.
	 * @param sceneNode defines the reference to the node of the scene.
	 */
	public registerNode(copy: UpdateResourcesCopyKey, assetNode: Node, sceneNode: TransformNode): void {
		this._getMap(this._nodes, copy).set(assetNode, sceneNode);
	}

	/**
	 * Returns whether or not a node of the scene is already registered for the given node of the asset in the given copy.
	 * @param copy defines the copy of the asset.
	 * @param assetNode defines the reference to the node of the asset.
	 */
	public hasNode(copy: UpdateResourcesCopyKey, assetNode: Node): boolean {
		return this._getMap(this._nodes, copy).has(assetNode);
	}

	/**
	 * Returns the node of the scene corresponding to the given node of the asset in the given copy: the matched or created
	 * node, or for a joint, the node linked to the corresponding bone of the skeleton of the scene.
	 * @param copy defines the copy of the asset.
	 * @param assetNode defines the reference to the node of the asset.
	 */
	public resolveNode(copy: UpdateResourcesCopyKey, assetNode: Node): TransformNode | null {
		const nodes = this._getMap(this._nodes, copy);

		const sceneNode = nodes.get(assetNode);
		if (sceneNode) {
			return sceneNode;
		}

		const assetBone = this._assetBonesByJoint.get(assetNode);
		const sceneJoint = assetBone ? this.resolveBone(copy, assetBone)?.getTransformNode() : null;

		if (sceneJoint) {
			nodes.set(assetNode, sceneJoint);
			return sceneJoint;
		}

		return null;
	}

	/**
	 * Registers the given bone of the scene as the bone corresponding to the given bone of the asset in the given copy.
	 * @param copy defines the copy of the asset the bone of the scene belongs to.
	 * @param assetBone defines the reference to the bone of the asset.
	 * @param sceneBone defines the reference to the bone of the scene.
	 */
	public registerBone(copy: UpdateResourcesCopyKey, assetBone: Bone, sceneBone: Bone): void {
		this._getMap(this._bones, copy).set(assetBone, sceneBone);
	}

	/**
	 * Returns the bone of the scene corresponding to the given bone of the asset in the given copy: the bone created from it
	 * when the skeleton was updated, or the matching bone of the current skeleton of the meshes of the copy.
	 * @param copy defines the copy of the asset.
	 * @param assetBone defines the reference to the bone of the asset.
	 */
	public resolveBone(copy: UpdateResourcesCopyKey, assetBone: Bone): Bone | null {
		const sceneBone = this._getMap(this._bones, copy).get(assetBone);
		if (sceneBone) {
			return sceneBone;
		}

		const assetSkeleton = assetBone.getSkeleton();

		for (const sceneMesh of this.getSceneMeshes(copy, (assetMesh) => assetMesh.skeleton === assetSkeleton)) {
			if (sceneMesh.skeleton) {
				const bone = this.getBoneMatches(copy, sceneMesh.skeleton, assetSkeleton).get(assetBone);
				if (bone) {
					return bone;
				}
			}
		}

		return null;
	}

	/**
	 * Returns the bones of the given skeleton of the scene matched with the bones of the given skeleton of the asset, per bone
	 * of the asset. Computed once per couple of skeletons.
	 * @param copy defines the copy of the asset the skeleton of the scene belongs to.
	 * @param sceneSkeleton defines the reference to the skeleton of the scene.
	 * @param assetSkeleton defines the reference to the skeleton of the asset.
	 */
	public getBoneMatches(copy: UpdateResourcesCopyKey, sceneSkeleton: Skeleton, assetSkeleton: Skeleton): Map<Bone, Bone> {
		const key = `${copy?.index ?? "none"}/${sceneSkeleton.uniqueId}/${assetSkeleton.uniqueId}`;

		let matches = this._boneMatches.get(key);
		if (!matches) {
			const nodes = this._getMap(this._nodes, copy);
			matches = matchSkeletonBones(sceneSkeleton, assetSkeleton, (assetNode) => nodes.get(assetNode) ?? null);

			this._boneMatches.set(key, matches);
		}

		return matches;
	}

	/**
	 * Registers the given morph target of the scene as the morph target corresponding to the given morph target of the asset
	 * in the given copy.
	 * @param copy defines the copy of the asset the morph target of the scene belongs to.
	 * @param assetTarget defines the reference to the morph target of the asset.
	 * @param sceneTarget defines the reference to the morph target of the scene.
	 */
	public registerMorphTarget(copy: UpdateResourcesCopyKey, assetTarget: MorphTarget, sceneTarget: MorphTarget): void {
		this._getMap(this._morphTargets, copy).set(assetTarget, sceneTarget);
	}

	/**
	 * Returns the morph target of the scene corresponding to the given morph target of the asset in the given copy: the morph
	 * target created from it when the mesh was updated, or the matching morph target of the current morph target manager of
	 * the mesh of the copy.
	 * @param copy defines the copy of the asset.
	 * @param assetTarget defines the reference to the morph target of the asset.
	 */
	public resolveMorphTarget(copy: UpdateResourcesCopyKey, assetTarget: MorphTarget): MorphTarget | null {
		const sceneTarget = this._getMap(this._morphTargets, copy).get(assetTarget);
		if (sceneTarget) {
			return sceneTarget;
		}

		const assetMesh = this._assetMeshesByMorphTarget.get(assetTarget);
		const assetManager = assetMesh?.morphTargetManager;

		if (!assetMesh || !assetManager) {
			return null;
		}

		for (const sceneMesh of this.getSceneMeshes(copy, (mesh) => mesh === assetMesh)) {
			const sceneManager = sceneMesh.morphTargetManager;
			if (!sceneManager) {
				continue;
			}

			const key = `${sceneManager.uniqueId}/${assetManager.uniqueId}`;

			let matches = this._morphTargetMatches.get(key);
			if (!matches) {
				matches = matchMorphTargets(sceneManager, assetManager);
				this._morphTargetMatches.set(key, matches);
			}

			const target = matches.get(assetTarget);
			if (target) {
				return target;
			}
		}

		return null;
	}

	/**
	 * Returns the object of the scene corresponding to the given target of an animation of the asset in the given copy: a
	 * node, a bone or a morph target. Returns null when the target can't be found in the scene or is not supported.
	 * @param copy defines the copy of the asset.
	 * @param target defines the reference to the target of the animation of the asset.
	 */
	public resolveTarget(copy: UpdateResourcesCopyKey, target: any): any {
		switch (target?.getClassName?.()) {
			case "Mesh":
			case "InstancedMesh":
			case "TransformNode":
				return this.resolveNode(copy, target);

			case "Bone":
				return this.resolveBone(copy, target);

			case "MorphTarget":
				return this.resolveMorphTarget(copy, target);

			default:
				return null;
		}
	}

	/**
	 * Returns the meshes of the scene of the given copy whose matched mesh of the asset satisfies the given predicate.
	 * @param copy defines the copy of the asset.
	 * @param predicate defines the predicate to test the meshes of the asset.
	 */
	public getSceneMeshes(copy: UpdateResourcesCopyKey, predicate: (assetMesh: Mesh) => boolean): Mesh[] {
		const meshes: Mesh[] = [];

		this.analysis.nodes.forEach((item) => {
			const assetMesh = getGeometryMesh(item.match);
			if (item.copy === copy && assetMesh && isMesh(item.node) && predicate(assetMesh)) {
				meshes.push(item.node);
			}
		});

		return meshes;
	}

	/**
	 * Returns the geometry of the scene to give to a mesh of the given copy updated from the given geometry of the asset: a copy
	 * of the geometry of the asset with new identifiers, created once per copy of the asset (as when importing the asset).
	 * The geometries of the asset are never moved to the scene: the glTF loader shares the vertex buffers between the primitives
	 * using the same data, and they are all released with the asset.
	 * @param copy defines the copy of the asset the mesh to update belongs to.
	 * @param assetGeometry defines the reference to the geometry of the asset.
	 * @param exclusive defines whether or not the mesh needs its own geometry: the matrices of the thin instances are stored in
	 * the geometry.
	 */
	public getSceneGeometry(copy: UpdateResourcesCopyKey, assetGeometry: Geometry, exclusive: boolean): Geometry {
		const geometries = this._getMap(this._geometries, copy);

		let geometry = exclusive ? undefined : geometries.get(assetGeometry);
		if (!geometry) {
			geometry = assetGeometry.copy(Tools.RandomId());
			geometry.uniqueId = UniqueNumber.Get();

			if (!exclusive) {
				geometries.set(assetGeometry, geometry);
			}
		}

		return geometry;
	}

	/**
	 * Returns the map of the given copy from the given maps of maps, created if needed.
	 */
	private _getMap<K, V>(maps: Map<UpdateResourcesCopyKey, Map<K, V>>, copy: UpdateResourcesCopyKey): Map<K, V> {
		let map = maps.get(copy);
		if (!map) {
			map = new Map<K, V>();
			maps.set(copy, map);
		}

		return map;
	}
}
