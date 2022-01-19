import { INumberDictionary, IStringDictionary, Undefinable } from "../../../../../shared/types";

import { FBXReaderNode } from "fbx-parser";
import {
	Node, Matrix, AnimationGroup, Vector3, Quaternion, Animation,
	Tools as BabylonTools, Bone, TransformNode, Tools,
} from "babylonjs";

import { FBXUtils } from "../utils";
import { IFBXLoaderRuntime } from "../loader";
import { IFBXConnections } from "../connections";

import { IFBXSkeleton } from "../mesh/skeleton";

interface IFBXAnimationCurve {
	id: number;

	times: number[];
	values: number[];
}

interface IFBXAnimationRawCurveNode {
	id: number;
	attrName: string;
	curves: IStringDictionary<IFBXAnimationCurve>;
}

interface IFBXLayerCurve {
	id: number;
	modelId: number;
	modelName: string;
	eulerOrder: string;

	transform: Matrix;

	preRotation?: Vector3;
	postRotation?: Vector3;

	T?: IFBXAnimationRawCurveNode;
	R?: IFBXAnimationRawCurveNode;
	S?: IFBXAnimationRawCurveNode;
}

interface IFBXClip {
	name: string;
	layers: IFBXLayerCurve[];
}

export class FBXAnimations {
	/**
	 * Creates the animation groups available in the FBX file, ignored if no clip defined.
	 * @param runtime defines the reference to the current FBX runtime.
	 */
	public static ParseAnimationGroups(runtime: IFBXLoaderRuntime): void {
		const animationCurveNodes = runtime.objects.nodes("AnimationCurve");
		if (!animationCurveNodes.length) {
			return;
		}

		const curveNodesMap = this._PrepareAnimationCurves(runtime.objects);
		this._ParseAnimationCurves(runtime.objects, runtime.connections, curveNodesMap);

		const layersMap = this._ParseAnimationLayers(runtime.objects, runtime.connections, runtime.cachedModels, runtime.cachedSkeletons, curveNodesMap);
		const rawClips = this._ParseAnimationStacks(runtime.objects, runtime.connections, layersMap);

		return this._CreateAnimationGroups(runtime, rawClips);
	}

	/**
	 * Creates the animation groups according to the given parsed clips.
	 */
	private static _CreateAnimationGroups(runtime: IFBXLoaderRuntime, clips: Map<number, IFBXClip>): void {
		clips.forEach((c) => {
			const animationGroup = new AnimationGroup(c.name, runtime.scene);
			runtime.result.animationGroups.push(animationGroup);

			c.layers.forEach((l) => {
				this._AddClip(animationGroup, l, runtime.cachedModels, runtime.cachedSkeletons);
			});
		});
	}

	/**
	 * Adds the given clip to the animation group.
	 */
	private static _AddClip(animationGroup: AnimationGroup, layer: IFBXLayerCurve, cachedModels: INumberDictionary<Node>, cachedSkeletons: INumberDictionary<IFBXSkeleton>): void {
		// Check targets
		const targets = this._GetTargets(layer.modelId, cachedModels, cachedSkeletons);
		if (!targets.length) {
			return;
		}

		// Initial transform
		let position = Vector3.Zero();
		let rotation = Quaternion.Identity();
		let scaling = Vector3.One();

		if (layer.transform) {
			layer.transform.decompose(scaling, rotation, position);
		}

		let initialScale = scaling.asArray();
		let initialPosition = position.asArray();
		let initialRotation = rotation.toEulerAngles().asArray();

		// Position
		if (layer.T && Object.keys(layer.T.curves).length > 0) {
			const curves = layer.T.curves;
			const positionTimes = this._GetTimes(curves);
			const positions = this._GetKeyFrameAnimationValues(positionTimes, curves, initialPosition);
			positions.forEach((p) => p.x = -p.x);

			targets.forEach((t) => {
				const animation = new Animation(`${t.name}.position`, "position", 1, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE, false);
				animation.setKeys(positionTimes.map((t, index) => ({
					frame: t,
					value: positions[index],
				})));

				animationGroup.addTargetedAnimation(animation, t);
			});
		}

		// Rotation
		if (layer.R && Object.keys(layer.R.curves).length > 0) {
			const curves = layer.R.curves;

			if (curves.x) {
				this._InterpolateRotations(curves.x);
				curves.x.values = curves.x.values.map((v) => BabylonTools.ToRadians(v));
			}

			if (curves.y) {
				this._InterpolateRotations(curves.y);
				curves.y.values = curves.y.values.map((v) => BabylonTools.ToRadians(v));
			}

			if (curves.z) {
				this._InterpolateRotations(curves.z);
				curves.z.values = curves.z.values.map((v) => BabylonTools.ToRadians(v));
			}

			const rotationTimes = this._GetTimes(curves);
			const rotations = this._GetKeyFrameAnimationValues(rotationTimes, curves, initialRotation);

			const rotationQuaternions = rotations.map((r) => {
				let finalRotation: Quaternion;

				const preRotation = layer.preRotation;
				const postRotation = layer.postRotation;

				if (preRotation || postRotation) {
					finalRotation = FBXUtils.GetFinalRotationQuaternionFromVector(r);
					
					if (preRotation) {
						const pre = FBXUtils.GetFinalRotationQuaternionFromVector(preRotation);
						finalRotation = pre.multiply(finalRotation);
					}
					
					if (postRotation) {
						const post = FBXUtils.GetFinalRotationQuaternionFromVector(postRotation);
						finalRotation = finalRotation.multiply(Quaternion.Inverse(post));
					}
				} else {
					finalRotation = FBXUtils.GetFinalRotationQuaternionFromVector(r);
				}

				return finalRotation;
			});

			targets.forEach((target) => {
				const animation = new Animation(`${target.name}.rotationQuaternion`, "rotationQuaternion", 1, Animation.ANIMATIONTYPE_QUATERNION, Animation.ANIMATIONLOOPMODE_CYCLE, false);
				animation.setKeys(rotationTimes.map((frame, index) => {
					const value = rotationQuaternions[index];
					return { frame, value };
				}));

				animationGroup.addTargetedAnimation(animation, target);
			});
		}

		// Scaling
		if (layer.S && Object.keys(layer.S.curves).length > 0) {
			const curves = layer.S.curves;
			const scalingTimes = this._GetTimes(curves);
			const scalings = this._GetKeyFrameAnimationValues(scalingTimes, curves, initialScale);

			targets.forEach((t) => {
				const animation = new Animation(`${t.name}.scaling`, "scaling", 1, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE, false);
				animation.setKeys(scalingTimes.map((t, index) => ({
					frame: t,
					value: scalings[index],
				})));

				animationGroup.addTargetedAnimation(animation, t);
			});
		}
	}

	/**
	 * Interpolates the given rotation curve.
	 */
	private static _InterpolateRotations(curve: IFBXAnimationCurve): void {
		const inject = (a1: number[], index: number, a2: number[]) => {
			return a1.slice(0, index).concat(a2).concat(a1.slice(index));
		};

		for (let i = 1; i < curve.values.length; i++) {
			const initialValue = curve.values[i - 1];
			const valuesSpan = curve.values[i] - initialValue;
			const absoluteSpan = Math.abs(valuesSpan);

			if (absoluteSpan >= 180) {
				const numSubIntervals = absoluteSpan / 180;

				const step = valuesSpan / numSubIntervals;
				let nextValue = initialValue + step;

				const initialTime = curve.times[i - 1];
				const timeSpan = curve.times[i] - initialTime;
				const interval = timeSpan / numSubIntervals;
				let nextTime = initialTime + interval;

				const interpolatedTimes: number[] = [];
				const interpolatedValues: number[] = [];

				while (nextTime < curve.times[i]) {
					interpolatedTimes.push(nextTime);
					nextTime += interval;

					interpolatedValues.push(nextValue);
					nextValue += step;
				}

				curve.times = inject(curve.times, i, interpolatedTimes);
				curve.values = inject(curve.values, i, interpolatedValues);
			}
		}
	}

	/**
	 * Returns the animationt's values as Vector3.
	 */
	private static _GetKeyFrameAnimationValues(times: number[], curves: IStringDictionary<IFBXAnimationCurve>, initialValue: number[]): Vector3[] {
		const values: number[] = [];
		const prevValue = initialValue;

		let xIndex = - 1;
		let yIndex = - 1;
		let zIndex = - 1;

		times.forEach(function (time) {
			if (curves.x) xIndex = curves.x.times.indexOf(time);
			if (curves.y) yIndex = curves.y.times.indexOf(time);
			if (curves.z) zIndex = curves.z.times.indexOf(time);

			if (xIndex !== -1) {
				const xValue = curves.x.values[xIndex];
				values.push(xValue);
				prevValue[0] = xValue;
			} else {
				values.push(prevValue[0]);
			}

			if (yIndex !== -1) {
				const yValue = curves.y.values[yIndex];
				values.push(yValue);
				prevValue[1] = yValue;
			} else {
				values.push(prevValue[1]);
			}

			if (zIndex !== -1) {
				const zValue = curves.z.values[zIndex];
				values.push(zValue);
				prevValue[2] = zValue;
			} else {
				values.push(prevValue[2]);
			}
		});

		const result: Vector3[] = [];
		for (let i = 0; i < values.length; i += 3) {
			result.push(new Vector3(values[i], values[i + 1], values[i + 2]));
		}

		return result;
	}

	/**
	 * Noramlizes times for all axis.
	 */
	private static _GetTimes(curves: IStringDictionary<IFBXAnimationCurve>): number[] {
		let times: number[] = [];

		// first join together the times for each axis, if defined
		if (curves.x !== undefined) times = times.concat(curves.x.times);
		if (curves.y !== undefined) times = times.concat(curves.y.times);
		if (curves.z !== undefined) times = times.concat(curves.z.times);

		times = times.sort((a, b) => {
			return a - b;
		});

		if (times.length > 1) {
			let targetIndex = 1;
			let lastValue = times[0];

			for (let i = 1; i < times.length; i++) {
				const currentValue = times[i];

				if (currentValue !== lastValue) {
					times[targetIndex] = currentValue;
					lastValue = currentValue;
					targetIndex++;
				}
			}

			times = times.slice(0, targetIndex);
		}

		return times;
	}

	/**
	 * Parses the animation staks.
	 */
	private static _ParseAnimationStacks(objects: FBXReaderNode, connections: Map<number, IFBXConnections>, layersMap: Map<number, IFBXLayerCurve[]>): Map<number, IFBXClip> {
		const rawClips = new Map<number, IFBXClip>();
		const stackNodes = objects.nodes("AnimationStack");

		for (const a of stackNodes) {
			const id = a.prop(0, "number")!;
			const children = connections.get(id)?.children;
			if (!children) {
				continue;
			}

			const layers = layersMap.get(children[0].id);
			if (!layers) {
				continue;
			}

			rawClips.set(id, {
				layers,
				name: a.prop(1, "string")!,
			});
		}

		return rawClips;
	}

	/**
	 * Parses the animation layers.
	 */
	private static _ParseAnimationLayers(objects: FBXReaderNode, connections: Map<number, IFBXConnections>, cachedModels: INumberDictionary<Node>, cachedSkeletons: INumberDictionary<IFBXSkeleton>, curveNodesMap: Map<number, IFBXAnimationRawCurveNode>): Map<number, IFBXLayerCurve[]> {
		const layersMap = new Map<number, IFBXLayerCurve[]>();
		const animationLayerNodes = objects.nodes("AnimationLayer");

		for (const a of animationLayerNodes) {
			const id = a.prop(0, "number")!;
			const layerCurveNodes: IFBXLayerCurve[] = [];

			const connection = connections.get(id);
			if (!connection?.children.length) {
				continue;
			}

			connection.children.forEach((c, index) => {
				const curveNode = curveNodesMap.get(c.id);
				if (!curveNode) {
					return;
				}

				if (!curveNode.curves.x && !curveNode.curves.y && !curveNode.curves.z) {
					return;
				}

				if (!layerCurveNodes[index]) {
					const modelId = connections.get(c.id)!.parents.filter(function (parent) {
						return parent.relationship !== undefined;
					})[0].id;

					if (modelId !== undefined) {
						const model = objects.nodes("Model").find((m) => m.prop(0, "number") === modelId);
						if (!model) {
							return;
						}

						const nodeId = model.prop(0, "number")!;
						const modelName = model.prop(1, "string")!;

						const modelRef = this._GetTargets(nodeId, cachedModels, cachedSkeletons)[0];

						let transform = Matrix.Identity();
						if (modelRef) {
							if (modelRef instanceof Bone) {
								transform = modelRef.getRestPose().clone();
							} else if (modelRef instanceof TransformNode) {
								transform = modelRef._localMatrix.clone();
							}
						}

						const propertiesNode = model.node("Properties70");
						const properties = propertiesNode?.nodes("P");

						let preRotation: Undefinable<Vector3>;
						let postRotation: Undefinable<Vector3>;

						if (properties?.length) {
							const preRotationNode = properties.find((p) => p.prop(0, "string") === "PreRotation");
							const postRotationNode = properties.find((p) => p.prop(0, "string") === "PostRotation");

							if (preRotationNode) {
								preRotation = new Vector3(
									Tools.ToRadians(preRotationNode.prop(4, "number") ?? 0),
									Tools.ToRadians(preRotationNode.prop(5, "number") ?? 0),
									Tools.ToRadians(preRotationNode.prop(6, "number") ?? 0),
								);
							}

							if (postRotationNode) {
								postRotation = new Vector3(
									Tools.ToRadians(postRotationNode.prop(4, "number") ?? 0),
									Tools.ToRadians(postRotationNode.prop(5, "number") ?? 0),
									Tools.ToRadians(postRotationNode.prop(6, "number") ?? 0),
								);
							}
						}

						const node: IFBXLayerCurve = {
							modelId,
							transform,
							modelName,

							preRotation,
							postRotation,

							id: nodeId,
							eulerOrder: modelRef?.metadata?.transformData?.eulerOrder ?? "ZYX",
						};

						layerCurveNodes[index] = node;
					}
				}

				if (layerCurveNodes[index]) {
					layerCurveNodes[index][curveNode.attrName] = curveNode;
				}
			});

			layersMap.set(id, layerCurveNodes);
		}

		return layersMap;
	}

	/**
	 * Returns the list of all animation targets for the given id.
	 */
	private static _GetTargets(id: number, cachedModels: INumberDictionary<Node>, cachedSkeletons: INumberDictionary<IFBXSkeleton>): (TransformNode | Bone)[] {
		const target = cachedModels[id];
		if (target && target instanceof TransformNode) {
			return [target];
		}

		// Check shared bones
		const targets: (TransformNode | Bone)[] = [];
		for (const skeletonId in cachedSkeletons) {
			const skeleton = cachedSkeletons[skeletonId];
			const targetBone = skeleton.skeletonInstance.bones.find((b) => b.id === id.toString());
			if (targetBone) {
				targets.push(targetBone);
			}
		}

		return targets;
	}

	/**
	 * Parses the animation curves.
	 */
	private static _ParseAnimationCurves(objects: FBXReaderNode, connections: Map<number, IFBXConnections>, curveNodesMap: Map<number, IFBXAnimationRawCurveNode>): void {
		const animationCurves = objects.nodes("AnimationCurve");
		for (const a of animationCurves) {
			const id = a.prop(0, "number")!;

			const animationCurve: IFBXAnimationCurve = {
				id,
				times: a.node("KeyTime")!.prop(0, "number[]")!.map((t) => t / 46186158000),
				values: a.node("KeyValueFloat")!.prop(0, "number[]")!,
			};

			const relationships = connections.get(animationCurve.id);
			if (!relationships?.parents?.[0].relationship) {
				continue;
			}

			const animationCurveId = relationships.parents[0].id;
			const animationCurveRelationship = relationships.parents[0].relationship;

			const curveNode = curveNodesMap.get(animationCurveId);
			if (!curveNode) {
				continue;
			}

			if (animationCurveRelationship.match(/X/)) {
				curveNode.curves["x"] = animationCurve;
			} else if (animationCurveRelationship.match(/Y/)) {
				curveNode.curves['y'] = animationCurve;
			} else if (animationCurveRelationship.match(/Z/)) {
				curveNode.curves['z'] = animationCurve;
			} else if (animationCurveRelationship.match(/d|DeformPercent/) && curveNodesMap.has(animationCurveId)) {
				curveNode.curves['morph'] = animationCurve;
			}
		}
	}

	/**
	 * Prepares parsing the animation curves.
	 */
	private static _PrepareAnimationCurves(objects: FBXReaderNode): Map<number, IFBXAnimationRawCurveNode> {
		const map = new Map<number, IFBXAnimationRawCurveNode>();

		const animationCurveNodes = objects.nodes("AnimationCurveNode");
		if (!animationCurveNodes.length) {
			return map;
		}

		animationCurveNodes.forEach((cvn) => {
			const attrName = cvn.prop(1, "string")!.replace("AnimCurveNode::", "");

			if (attrName.match(/S|R|T|DeformPercent/) !== null) {
				const id = cvn.prop(0, "number")!;
				map.set(id, { id, attrName, curves: {} });
			}
		});

		return map;
	}
}
