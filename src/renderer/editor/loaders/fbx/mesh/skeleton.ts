import { IStringDictionary } from "../../../../../shared/types";

import { FBXReaderNode } from "fbx-parser";
import { Matrix, Skeleton, Scene, Bone, AbstractMesh } from "babylonjs";

import { IFBXLoaderRuntime } from "../loader";
import { IFBXConnections } from "../connections";

import { FBXTransform } from "../node/transform";

export interface IRawBone {
	id: number;

	indices: number[];
	weights: number[];

	transform: Matrix;
	transformLink: Matrix;
}

export interface IFBXSkeleton {
	id: number;

	bones: Bone[];
	rawBones: IRawBone[];

	skeletonInstance: Skeleton;
}

export class FBXSkeleton {
	/**
	 * Parses the raw skeletons.
	 * @param runtime defines the reference to the current FBX runtime.
	 */
	public static ParseRawSkeletons(runtime: IFBXLoaderRuntime): void {
		for (const d of runtime.deformers) {
            const deformerId = d.prop(0, "number")!;
            const deformerType = d.prop(2, "string");

            const relationShips = runtime.connections.get(deformerId);

            if (deformerType === "Skin") {
                const id = d.prop(0, "number")!;
                const name = d.prop(1, "string")!;

                const existingSkeleton = runtime.cachedSkeletons[id];

                if (!existingSkeleton) {
                    const bones = runtime.deformers.filter((d) => relationShips?.children.find((r) => r.id === d.prop(0, "number")));
                    const skeleton = this._GetRawSkeleton(id, name, bones, runtime.scene);

                    runtime.cachedSkeletons[id] = skeleton;
                    runtime.result.skeletons.push(skeleton.skeletonInstance);
                }
            }
        }
	}

	/**
	 * Returns the parsed raw skeleton to be built later inline with the geometries.
	 */
	private static _GetRawSkeleton(id: number, name: string, deformers: FBXReaderNode[], scene: Scene): IFBXSkeleton {
		const rawBones: IRawBone[] = [];

		deformers.forEach((d) => {
			if (d.prop(2, "string") !== "Cluster") {
				return;
			}

			const rawBone: IRawBone = {
				id: d.prop(0, "number")!,

				indices: d.node("Indexes")?.prop(0, "number[]") ?? [],
				weights: d.node("Weights")?.prop(0, "number[]") ?? [],

				transform: Matrix.FromArray(d.node("Transform")!.prop(0, "number[]")!),
				transformLink: Matrix.FromArray(d.node("TransformLink")!.prop(0, "number[]")!),
			};

			rawBones.push(rawBone);
		});

		const skeletonInstance = new Skeleton(name, 0 as any, scene);

		return {
			id,
			rawBones,
			bones: [],
			skeletonInstance,
		};
	}

	/**
	 * Checks the given connections to compute bones.
	 * @param runtime defines the reference to the current FBX runtime.
	 * @param name defines the name of the bone.
	 * @param connections defines the relationships of the FBX model node.
	 * @returns the reference to the last bone created.
	 */
	public static CheckSkeleton(runtime: IFBXLoaderRuntime, model: FBXReaderNode, name: string, connections: IFBXConnections): void {
		connections.parents.forEach((p) => {
			for (const skeletonId in runtime.cachedSkeletons) {
				const skeleton = runtime.cachedSkeletons[skeletonId];

				skeleton.rawBones.forEach((b, index) => {
					if (b.id !== p.id) {
						return;
					}

					const boneId = model.prop(0, "number")!.toString();
					const boneName = `${skeleton.skeletonInstance.name}-${name}`;

					if (skeleton.skeletonInstance.bones.find((b) => b.name === boneName)) {
						return;
					}

					const bone = new Bone(boneName, skeleton.skeletonInstance);
					bone.id = boneId;
					bone._index = index;
					
					// Bones can be shared, let's parse transform here.
					FBXTransform.ParseTransform(bone, model);
					bone.metadata.connections = connections;

					skeleton.bones[index] = bone;
				});
			}
		});
	}

	/**
	 * Binds the given skeletons to the associated meshes.
	 * @param runtime defines the reference to the current FBX runtime.
	 */
	public static BindSkeletons(runtime: IFBXLoaderRuntime): void {
		const poseMatrices: IStringDictionary<Matrix> = {};

		// Parse pose matrices
		const bindPoseNodes = runtime.objects.nodes("Pose");
		bindPoseNodes.forEach((bpn) => {
			const poseNodes = bpn.nodes("PoseNode");
			poseNodes.forEach((pn) => {
				const nodeId = pn.node("Node")!.prop(0, "number")!;
				const matrix = pn.node("Matrix")!.prop(0, "number[]")!;

				poseMatrices[nodeId] = Matrix.FromArray(matrix);
			});
		});

		// Compute parenting, matrices and assign
		for (const skeletonId in runtime.cachedSkeletons) {
			const skeleton = runtime.cachedSkeletons[skeletonId];

			for (const b of skeleton.skeletonInstance.bones) {
				const boneIndex = b._index ?? -1;
				const rawBone = skeleton.rawBones[boneIndex];
				if (!rawBone) {
					continue;
				}

				// Parenting
				const connections = b.metadata.connections as IFBXConnections;
				connections?.parents.forEach((p) => {
					const parentBone = skeleton.skeletonInstance.bones.find((b) => b.id === p.id.toString());
					if (parentBone) {
						b.setParent(parentBone);
					}
				});
				
				// const transformData = FBXTransform.GetTransformData(b);
				FBXTransform.ApplyTransform(b);

				/*
				let baseMatrix = Matrix.Identity();
				if (rawBone.transformLink && boneIndex !== -1) {
					baseMatrix.copyFrom(FBXUtils.GetMatrix(rawBone.transformLink, transformData));
				}

				const parentBone = b.getParent();
				if (parentBone) {
					baseMatrix.multiplyToRef(parentBone.getInvertedAbsoluteTransform(), baseMatrix);
				}
				*/

				b.setRestPose(b.getLocalMatrix());
				b.updateMatrix(b.getLocalMatrix(), false, false);

				b._updateDifferenceMatrix(undefined, true);
			}
			
			// Assign
			const parents = runtime.connections.get(parseInt(skeletonId))?.parents;
			parents?.forEach((p) => {
				const parents2 = runtime.connections.get(p.id)?.parents;
				parents2?.forEach((p) => {
					const model = runtime.cachedModels[p.id];
					if (model && model instanceof AbstractMesh) {
						const poseMatrix = poseMatrices[p.id];
						if (poseMatrix && !poseMatrix.isIdentity()) {
							model.updatePoseMatrix(poseMatrix);
							skeleton.skeletonInstance.needInitialSkinMatrix = true;
						}
						
						model.skeleton = skeleton.skeletonInstance;

						model.skeleton.bones.forEach((b) => {
							b.name = `${model.name}-${b.name}`;
						});

						// model.skeleton.sortBones();
						// model.skeleton.returnToRest();
					}
				});
			});
		}
	}
}
