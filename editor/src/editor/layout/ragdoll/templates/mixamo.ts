import { AbstractMesh, AssetContainer, Axis, Bone, Matrix, Node, PhysicsConstraintType, Skeleton, TransformNode, Vector3, VertexBuffer } from "babylonjs";
import { IRagdollRuntimeConfiguration } from "babylonjs-editor-tools";

export interface IMixamoRagdollTemplateOptions {
	/**
	 * Defines the skeleton to configure. Defaults to the first skeleton of the container that has a Mixamo "Hips" bone.
	 */
	skeleton?: Skeleton;
	/**
	 * Defines the total mass of the ragdoll, distributed over the bodies using standard human segment mass ratios.
	 * @default 70
	 */
	totalMass?: number;
	/**
	 * Defines whether or not the torso is split in two bodies (abdomen and chest) instead of one.
	 * @default false
	 */
	splitSpine?: boolean;
	/**
	 * Defines whether or not the hands get their own bodies. Otherwise they are part of the forearms.
	 * @default false
	 */
	includeHands?: boolean;
	/**
	 * Defines whether or not the feet get their own bodies. Otherwise they are part of the legs.
	 * @default true
	 */
	includeFeet?: boolean;
}

export interface IMixamoRagdollTemplateResult {
	/**
	 * Defines the skeleton the configuration was computed for.
	 */
	skeleton: Skeleton;
	/**
	 * Defines the node to pass to the ragdoll as root transform node: the node the skeleton space is relative to.
	 */
	rootNode: TransformNode;
	/**
	 * Defines the computed configuration of the ragdoll, the pelvis first.
	 */
	runtimeConfiguration: IRagdollRuntimeConfiguration[];
}

/**
 * Defines the hinge of a body: the direction, in the frame of the character, towards which the segment moves when the joint
 * flexes, and the limits of the joint in degrees. Positive angles flex the joint, negative angles extend it.
 */
interface IHingeDefinition {
	flexion: "forward" | "backward" | "up" | "down";
	min: number;
	max: number;
}

interface IBodyDefinition {
	name: string;
	/**
	 * Name of the configuration when the left and right bodies are symmetrical and merged in a single configuration.
	 */
	symmetricName?: string;
	/**
	 * Mixamo names of the bones the body can be attached to, by order of preference.
	 */
	bones: string[];
	/**
	 * Fraction of the total mass of a human body (Winter, Biomechanics and Motor Control of Human Movement).
	 */
	massFraction: number;
	hinge: IHingeDefinition | null;
	enabled: boolean;
}

interface IBody {
	definition: IBodyDefinition;
	bone: Bone;
	parent: IBody | null;
	mass: number;
	points: number[];
	position: Vector3;
	/**
	 * Center and half extents of the box, in world space, indexed by axis.
	 */
	center: number[];
	halfExtents: number[];
}

/**
 * Defines the percentiles of the vertices of a body kept to fit its box: this ignores the few vertices of accessories,
 * hair or clothes that would make the boxes much bigger than the body.
 */
const lowPercentile = 0.03;
const highPercentile = 0.97;

/**
 * Defines the factor applied to the extents of the boxes. Slightly smaller boxes avoid the bodies of the ragdoll starting
 * in contact with each other, which makes the simulation jitter as soon as the ragdoll is enabled.
 */
const extentsFactor = 0.9;

/**
 * Defines the minimum number of vertices required to fit a box on the vertices of a body.
 */
const minimumPointCount = 16;

/**
 * Defines the maximum number of vertices read per mesh. Denser meshes are sub-sampled, fitting boxes doesn't need more.
 */
const maximumVerticesPerMesh = 40_000;

/**
 * Computes and returns the ragdoll configuration of a character rigged using Mixamo, fitted on its actual meshes.
 * @see computeMixamoRagdollTemplate for the details of the computation.
 * @param container defines the reference to the asset container containing the Mixamo character.
 * @param options defines the options used to compute the configuration.
 * @returns the configuration, empty if the container doesn't contain a Mixamo skeleton.
 */
export function applyMixamoTemplate(container: AssetContainer, options?: IMixamoRagdollTemplateOptions): IRagdollRuntimeConfiguration[] {
	return computeMixamoRagdollTemplate(container, options)?.runtimeConfiguration ?? [];
}

/**
 * Computes the ragdoll configuration of a character rigged using Mixamo, fitted on its actual meshes, and returns it
 * alongside the skeleton and the root node to use when creating the ragdoll.
 *
 * Each body gets a box computed from the vertices mostly influenced by its bones (or by the bones under them that don't
 * have their own body), in the rest pose. The box is centered on these vertices using an arbitrary offset axis in the
 * space of the bone, its hinge axis follows the anatomy of the character (knees and elbows bend, arms fall along the body)
 * and the masses follow the ratios of a human body.
 *
 * The configuration targets realtime usage with many characters: by default 13 bodies and 12 hinge constraints only.
 *
 * Dimensions are expressed in world units: the container must be in the scene with the transforms (scaling, etc.) that will
 * be used when creating the ragdoll. The skeleton is returned to its rest pose, as expected when creating a ragdoll.
 * The limits of the joints ("min" and "max", in degrees) are not applied by the ragdoll of Babylon.js itself: apply them using
 * "applyRagdollJointLimits" once the ragdoll is created, in its rest pose.
 * @param container defines the reference to the asset container containing the Mixamo character.
 * @param options defines the options used to compute the configuration.
 * @returns the skeleton, the root node and the configuration, or null if the container doesn't contain a Mixamo skeleton.
 */
export function computeMixamoRagdollTemplate(container: AssetContainer, options?: IMixamoRagdollTemplateOptions): IMixamoRagdollTemplateResult | null {
	const skeleton = options?.skeleton ?? container.skeletons.find((skeleton) => getMixamoBonesMap(skeleton).has("hips"));
	if (!skeleton) {
		return null;
	}

	const bonesMap = getMixamoBonesMap(skeleton);
	const hips = bonesMap.get("hips");
	if (!hips) {
		return null;
	}

	const rootNode = getRagdollRootNode(skeleton, container);
	if (!rootNode) {
		return null;
	}

	skeleton.returnToRest();
	computeWorldMatrices(container);
	skeleton.computeAbsoluteMatrices(true);
	skeleton.prepare(true);

	const bodies = createBodies(skeleton, hips, bonesMap, options);
	distributeMasses(bodies, options?.totalMass ?? 70);

	const pointsCount = collectPoints(container, skeleton, rootNode, bodies);

	bodies.forEach((body) => body.bone.getAbsolutePositionToRef(rootNode, body.position));

	const frame = computeCharacterFrame(bodies, bonesMap, rootNode);
	const height = computeCharacterHeight(bodies, frame.up, pointsCount);
	const minimumHalfExtent = Math.max(height * 0.02, 1e-4);

	bodies.forEach((body) => fitBox(body, rootNode, minimumHalfExtent));
	centerRootBox(bodies[0]);
	resolveOverlaps(bodies, minimumHalfExtent);

	const symmetricNames = new Map<IRagdollRuntimeConfiguration, string>();
	const configurations = bodies.map((body) => {
		const configuration = createConfiguration(body, rootNode, frame);
		if (body.definition.symmetricName) {
			symmetricNames.set(configuration, body.definition.symmetricName);
		}

		return configuration;
	});

	return {
		skeleton,
		rootNode,
		runtimeConfiguration: mergeSymmetricConfigurations(configurations, symmetricNames),
	};
}

/**
 * Returns the name of the given bone without its Mixamo prefix ("mixamorig:", "mixamorig1:", "mixamorig_", etc.), lower cased.
 */
export function getMixamoBoneName(name: string): string {
	return name
		.substring(name.lastIndexOf(":") + 1)
		.replace(/^mixamorig\d*_?/i, "")
		.toLowerCase();
}

function getMixamoBonesMap(skeleton: Skeleton): Map<string, Bone> {
	const map = new Map<string, Bone>();
	skeleton.bones.forEach((bone) => {
		const name = getMixamoBoneName(bone.name);
		if (!map.has(name)) {
			map.set(name, bone);
		}
	});

	return map;
}

/**
 * Returns the node the skeleton space is relative to. The glTF loader links the bones to transform nodes: the skeleton
 * space is the space of the parent of the node linked to the root bone. The skinned meshes are siblings of this node.
 */
function getRagdollRootNode(skeleton: Skeleton, container: AssetContainer): TransformNode | null {
	const rootBone = skeleton.bones.find((bone) => !bone.getParent());
	const linkedNodeParent = rootBone?._linkedTransformNode?.parent;

	if (linkedNodeParent && (linkedNodeParent as TransformNode).getWorldMatrix) {
		return linkedNodeParent as TransformNode;
	}

	return container.meshes.find((mesh) => mesh.skeleton === skeleton) ?? null;
}

function computeWorldMatrices(container: AssetContainer): void {
	const nodes: Node[] = [...container.transformNodes, ...container.meshes];
	const computed = new Set<Node>();

	const compute = (node: Node | null) => {
		if (!node || computed.has(node)) {
			return;
		}

		compute(node.parent);
		node.computeWorldMatrix(true);
		computed.add(node);
	};

	nodes.forEach((node) => compute(node));
}

function getBodyDefinitions(options?: IMixamoRagdollTemplateOptions): IBodyDefinition[] {
	const splitSpine = options?.splitSpine ?? false;
	const includeHands = options?.includeHands ?? false;
	const includeFeet = options?.includeFeet ?? true;

	// Ranges of motion of a human body, slightly reduced: a ragdoll reaching the full range looks broken.
	const definitions: IBodyDefinition[] = [
		{ name: "Pelvis", bones: ["hips"], massFraction: 0.142, hinge: null, enabled: true },
		{
			name: splitSpine ? "Abdomen" : "Torso",
			bones: ["spine", "spine1"],
			massFraction: 0.139,
			hinge: { flexion: "forward", min: -25, max: splitSpine ? 40 : 60 },
			enabled: true,
		},
		{ name: "Chest", bones: ["spine2"], massFraction: 0.216, hinge: { flexion: "forward", min: -15, max: 30 }, enabled: splitSpine },
		{ name: "Head", bones: ["head", "neck"], massFraction: 0.081, hinge: { flexion: "forward", min: -40, max: 50 }, enabled: true },
	];

	["Left", "Right"].forEach((side) => {
		const key = side.toLowerCase();

		definitions.push(
			// The limits of the shoulder depend on the rest pose of the arms (T-pose, A-pose): they are computed from it.
			{ name: `${side} Arm`, symmetricName: "Arms", bones: [`${key}arm`], massFraction: 0.028, hinge: { flexion: "down", min: 0, max: 0 }, enabled: true },
			{ name: `${side} Forearm`, symmetricName: "Forearms", bones: [`${key}forearm`], massFraction: 0.016, hinge: { flexion: "forward", min: 0, max: 140 }, enabled: true },
			{ name: `${side} Hand`, symmetricName: "Hands", bones: [`${key}hand`], massFraction: 0.006, hinge: { flexion: "down", min: -60, max: 70 }, enabled: includeHands },
			{ name: `${side} Up Leg`, symmetricName: "Up Legs", bones: [`${key}upleg`], massFraction: 0.1, hinge: { flexion: "forward", min: -25, max: 110 }, enabled: true },
			{ name: `${side} Leg`, symmetricName: "Legs", bones: [`${key}leg`], massFraction: 0.0465, hinge: { flexion: "backward", min: 0, max: 140 }, enabled: true },
			{ name: `${side} Foot`, symmetricName: "Feet", bones: [`${key}foot`], massFraction: 0.0145, hinge: { flexion: "up", min: -40, max: 20 }, enabled: includeFeet }
		);
	});

	return definitions;
}

function createBodies(skeleton: Skeleton, hips: Bone, bonesMap: Map<string, Bone>, options?: IMixamoRagdollTemplateOptions): IBody[] {
	const bodies: IBody[] = [];
	const usedBones = new Set<Bone>();

	getBodyDefinitions(options).forEach((definition, index) => {
		let bone = definition.bones.map((name) => bonesMap.get(name)).find((bone) => bone && !usedBones.has(bone));

		// The ragdoll requires the root bone of the skeleton to have a body: when the hips are not the root (an additional
		// root bone exists), the pelvis body is attached to the root bone instead.
		if (index === 0) {
			const rootBone = skeleton.bones.find((b) => !b.getParent());
			if (rootBone && isBoneAncestorOf(rootBone, hips)) {
				bone = rootBone;
			}
		}

		if (!bone) {
			return;
		}

		usedBones.add(bone);

		bodies.push({
			bone,
			definition,
			parent: null,
			mass: 0,
			points: [],
			position: Vector3.Zero(),
			center: [0, 0, 0],
			halfExtents: [0, 0, 0],
		});
	});

	const enabledBodies = bodies.filter((body) => body.definition.enabled);

	enabledBodies.forEach((body) => {
		body.parent = findBodyForBone(body.bone.getParent(), enabledBodies);
	});

	// Disabled bodies (hands, feet, etc.) are merged into the body of their nearest ancestor: their mass, and their vertices.
	bodies
		.filter((body) => !body.definition.enabled)
		.forEach((body) => {
			const target = findBodyForBone(body.bone, enabledBodies);
			if (target) {
				target.mass += body.definition.massFraction;
			}
		});

	enabledBodies.forEach((body) => (body.mass += body.definition.massFraction));

	return enabledBodies;
}

function isBoneAncestorOf(ancestor: Bone, bone: Bone): boolean {
	for (let current: Bone | null = bone; current; current = current.getParent()) {
		if (current === ancestor) {
			return true;
		}
	}

	return false;
}

function findBodyForBone(bone: Bone | null, bodies: IBody[]): IBody | null {
	for (let current = bone; current; current = current.getParent()) {
		const body = bodies.find((body) => body.bone === current);
		if (body) {
			return body;
		}
	}

	return null;
}

/**
 * Distributes the total mass over the bodies. The ratios are compressed: the mass ratio between two constrained bodies
 * (chest and arm, etc.) is one of the main sources of instability of the constraints solvers.
 */
function distributeMasses(bodies: IBody[], totalMass: number): void {
	const fractionsSum = bodies.reduce((sum, body) => sum + body.mass, 0) || 1;

	bodies.forEach((body) => {
		body.mass = Math.min(0.2, Math.max(0.03, body.mass / fractionsSum));
	});

	const clampedSum = bodies.reduce((sum, body) => sum + body.mass, 0) || 1;

	bodies.forEach((body) => {
		body.mass = Math.round((body.mass / clampedSum) * totalMass * 100) / 100;
	});
}

/**
 * Collects the world positions, in the rest pose, of the vertices of each body.
 * @returns the number of collected points.
 */
function collectPoints(container: AssetContainer, skeleton: Skeleton, rootNode: TransformNode, bodies: IBody[]): number {
	const bonesByIndex = new Map<number, Bone>();
	skeleton.bones.forEach((bone) => bonesByIndex.set(bone.getIndex(), bone));

	const bodyByBone = new Map<Bone, IBody | null>();
	const getBody = (bone: Bone | undefined) => {
		if (!bone) {
			return null;
		}

		if (!bodyByBone.has(bone)) {
			bodyByBone.set(bone, findBodyForBone(bone, bodies));
		}

		return bodyByBone.get(bone)!;
	};

	const bonesByLinkedNode = new Map<Node, Bone>();
	skeleton.bones.forEach((bone) => {
		if (bone._linkedTransformNode) {
			bonesByLinkedNode.set(bone._linkedTransformNode, bone);
		}
	});

	let count = 0;
	const worldPosition = Vector3.Zero();

	container.meshes.forEach((mesh) => {
		const totalVertices = mesh.getTotalVertices();
		if (!totalVertices || !mesh.isVerticesDataPresent(VertexBuffer.PositionKind)) {
			return;
		}

		let meshBody: IBody | null = null;
		const skinned = mesh.skeleton === skeleton && mesh.isVerticesDataPresent(VertexBuffer.MatricesIndicesKind);

		// Meshes attached to a bone (helmet, etc.) belong to the body of this bone.
		if (!skinned) {
			const bone = getAttachedBone(mesh, bonesByLinkedNode, rootNode);
			meshBody = getBody(bone);

			if (!meshBody) {
				return;
			}
		}

		const positions = mesh.getPositionData(skinned, false);
		if (!positions) {
			return;
		}

		const indices = skinned ? mesh.getVerticesData(VertexBuffer.MatricesIndicesKind) : null;
		const weights = skinned ? mesh.getVerticesData(VertexBuffer.MatricesWeightsKind) : null;
		const extraIndices = skinned ? mesh.getVerticesData(VertexBuffer.MatricesIndicesExtraKind) : null;
		const extraWeights = skinned ? mesh.getVerticesData(VertexBuffer.MatricesWeightsExtraKind) : null;

		const worldMatrix = mesh.computeWorldMatrix(true);
		const step = Math.max(1, Math.ceil(totalVertices / maximumVerticesPerMesh));

		for (let vertex = 0; vertex < totalVertices; vertex += step) {
			let body = meshBody;

			if (skinned && indices && weights) {
				body = getBody(bonesByIndex.get(getDominantBoneIndex(vertex, indices, weights, extraIndices, extraWeights)));
			}

			if (!body) {
				continue;
			}

			Vector3.TransformCoordinatesFromFloatsToRef(positions[vertex * 3], positions[vertex * 3 + 1], positions[vertex * 3 + 2], worldMatrix, worldPosition);
			body.points.push(worldPosition.x, worldPosition.y, worldPosition.z);

			++count;
		}
	});

	return count;
}

function getAttachedBone(mesh: AbstractMesh, bonesByLinkedNode: Map<Node, Bone>, rootNode: TransformNode): Bone | undefined {
	for (let current: Node | null = mesh; current && current !== rootNode; current = current.parent) {
		const bone = bonesByLinkedNode.get(current);
		if (bone) {
			return bone;
		}
	}

	return undefined;
}

function getDominantBoneIndex(
	vertex: number,
	indices: ArrayLike<number>,
	weights: ArrayLike<number>,
	extraIndices: ArrayLike<number> | null,
	extraWeights: ArrayLike<number> | null
): number {
	let bestIndex = indices[vertex * 4];
	let bestWeight = weights[vertex * 4];

	for (let i = 1; i < 4; ++i) {
		if (weights[vertex * 4 + i] > bestWeight) {
			bestWeight = weights[vertex * 4 + i];
			bestIndex = indices[vertex * 4 + i];
		}
	}

	if (extraIndices && extraWeights) {
		for (let i = 0; i < 4; ++i) {
			if (extraWeights[vertex * 4 + i] > bestWeight) {
				bestWeight = extraWeights[vertex * 4 + i];
				bestIndex = extraIndices[vertex * 4 + i];
			}
		}
	}

	return bestIndex;
}

interface ICharacterFrame {
	up: Vector3;
	/**
	 * Direction pointing to the left side of the character.
	 */
	left: Vector3;
	forward: Vector3;
}

/**
 * Computes the anatomical axes of the character, in world space, from the positions of its bones.
 */
function computeCharacterFrame(bodies: IBody[], bonesMap: Map<string, Bone>, rootNode: TransformNode): ICharacterFrame {
	const getPosition = (...names: string[]) => {
		const bone = names.map((name) => bonesMap.get(name)).find((bone) => bone);
		return bone?.getAbsolutePosition(rootNode) ?? null;
	};

	const pelvis = bodies[0].position;
	const head = getPosition("head", "neck", "spine2", "spine1", "spine");

	let up = head ? head.subtract(pelvis) : Vector3.Up();
	if (up.lengthSquared() < 1e-12) {
		up = Vector3.Up();
	}
	up.normalize();

	const left = getPosition("leftupleg", "leftarm", "leftshoulder");
	const right = getPosition("rightupleg", "rightarm", "rightshoulder");

	let lateral = left && right ? left.subtract(right) : Vector3.Right();
	lateral.subtractInPlace(up.scale(Vector3.Dot(lateral, up)));

	if (lateral.lengthSquared() < 1e-12) {
		lateral = Math.abs(up.x) < 0.9 ? Vector3.Cross(up, Vector3.Forward()) : Vector3.Cross(up, Vector3.Up());
	}
	lateral.normalize();

	// In a left handed system, the forward direction of a character is "up x left". The feet always point forward, which
	// confirms it (or fixes it for a geometry that would still be right handed).
	const forward = Vector3.Cross(up, lateral).normalize();

	const foot = getPosition("leftfoot", "rightfoot");
	const toes = getPosition("lefttoebase", "righttoebase");

	if (foot && toes) {
		const toesDirection = toes.subtract(foot);
		toesDirection.subtractInPlace(up.scale(Vector3.Dot(toesDirection, up)));

		if (toesDirection.lengthSquared() > 1e-12 && Vector3.Dot(toesDirection, forward) < 0) {
			forward.scaleInPlace(-1);
		}
	}

	return {
		up,
		left: lateral,
		forward,
	};
}

function computeCharacterHeight(bodies: IBody[], up: Vector3, pointsCount: number): number {
	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;

	bodies.forEach((body) => {
		const values = pointsCount > 0 ? body.points : [body.position.x, body.position.y, body.position.z];
		for (let i = 0; i < values.length; i += 3) {
			const projection = values[i] * up.x + values[i + 1] * up.y + values[i + 2] * up.z;
			min = Math.min(min, projection);
			max = Math.max(max, projection);
		}
	});

	return isFinite(max - min) && max > min ? max - min : 1;
}

function getPercentile(sortedValues: Float64Array, percentile: number): number {
	return sortedValues[Math.round(percentile * (sortedValues.length - 1))];
}

/**
 * Fits the box of the given body on its vertices. Boxes of the ragdoll are aligned with the world axes in the pose the
 * ragdoll is created, so the box is the axis aligned bounding box of the vertices, ignoring the outliers.
 */
function fitBox(body: IBody, rootNode: TransformNode, minimumHalfExtent: number): void {
	const pointCount = body.points.length / 3;

	if (pointCount >= minimumPointCount) {
		const values = new Float64Array(pointCount);

		for (let axis = 0; axis < 3; ++axis) {
			for (let i = 0; i < pointCount; ++i) {
				values[i] = body.points[i * 3 + axis];
			}

			values.sort();

			const min = getPercentile(values, lowPercentile);
			const max = getPercentile(values, highPercentile);

			body.center[axis] = (min + max) * 0.5;
			body.halfExtents[axis] = Math.max(minimumHalfExtent, (max - min) * 0.5 * extentsFactor);
		}
	} else {
		fitBoxOnBones(body, rootNode, minimumHalfExtent);
	}

	// Frees the memory, the points are not needed anymore.
	body.points.length = 0;
}

/**
 * Centers the box of the root body on its bone. In ragdoll mode, Babylon.js moves the root bone to the position of the root
 * body without removing the box offset: any offset would shift the whole skeleton away from the bodies by that distance.
 * The box is grown so it still covers the vertices it was fitted on.
 */
function centerRootBox(body: IBody): void {
	for (let axis = 0; axis < 3; ++axis) {
		const position = body.position.asArray()[axis];
		body.halfExtents[axis] += Math.abs(body.center[axis] - position);
		body.center[axis] = position;
	}
}

/**
 * Fits the box of a body without enough vertices on the segment going from its bone to the end of its children bones.
 */
function fitBoxOnBones(body: IBody, rootNode: TransformNode, minimumHalfExtent: number): void {
	const children = body.bone.getChildren();

	let end: Vector3;
	if (children.length) {
		end = Vector3.Zero();
		children.forEach((child) => end.addInPlace(child.getAbsolutePosition(rootNode)));
		end.scaleInPlace(1 / children.length);
	} else if (body.parent) {
		end = body.position.add(body.position.subtract(body.parent.position).scale(0.5));
	} else {
		end = body.position.clone();
	}

	const segment = end.subtract(body.position);
	const radius = Math.max(minimumHalfExtent, segment.length() * 0.2);

	body.position.add(segment.scale(0.5)).toArray(body.center);
	body.halfExtents = [Math.abs(segment.x) * 0.5 + radius, Math.abs(segment.y) * 0.5 + radius, Math.abs(segment.z) * 0.5 + radius];
}

/**
 * Shrinks the boxes of the bodies that are not directly constrained together (the ragdoll disables the collisions between
 * those only) and overlap in the rest pose, like the two thighs. Overlapping bodies push each other as soon as the ragdoll
 * is enabled.
 */
function resolveOverlaps(bodies: IBody[], minimumHalfExtent: number): void {
	const margin = minimumHalfExtent * 0.1;

	for (let iteration = 0; iteration < 4; ++iteration) {
		let resolved = true;

		for (let i = 0; i < bodies.length; ++i) {
			for (let j = i + 1; j < bodies.length; ++j) {
				const a = bodies[i];
				const b = bodies[j];

				if (a.parent === b || b.parent === a) {
					continue;
				}

				let axis = -1;
				let smallestOverlap = Number.POSITIVE_INFINITY;

				for (let k = 0; k < 3; ++k) {
					const overlap = a.halfExtents[k] + b.halfExtents[k] - Math.abs(a.center[k] - b.center[k]);
					if (overlap <= 0) {
						axis = -1;
						break;
					}

					if (overlap < smallestOverlap) {
						smallestOverlap = overlap;
						axis = k;
					}
				}

				if (axis === -1) {
					continue;
				}

				const shrink = smallestOverlap * 0.5 + margin;

				a.halfExtents[axis] = Math.max(minimumHalfExtent, a.halfExtents[axis] - shrink);
				b.halfExtents[axis] = Math.max(minimumHalfExtent, b.halfExtents[axis] - shrink);

				resolved = false;
			}
		}

		if (resolved) {
			return;
		}
	}
}

/**
 * Returns the given axis replaced by the closest of Axis.X, Axis.Y or Axis.Z when they are almost the same.
 * @param ignoreSign defines whether or not an opposite axis can be returned too. The caller must then update what depends on
 * the orientation of the axis (the limits of a hinge, etc.).
 */
function snapAxis(axis: Vector3, threshold: number, ignoreSign: boolean): Vector3 {
	const axes = [Axis.X, Axis.Y, Axis.Z];

	for (const candidate of axes) {
		const dot = Vector3.Dot(axis, candidate);
		if (dot >= threshold || (ignoreSign && -dot >= threshold)) {
			return candidate;
		}
	}

	return axis;
}

function roundValue(value: number): number {
	return Math.round(value * 10_000) / 10_000;
}

function roundAxis(axis: Vector3): Vector3 {
	return axis === Axis.X || axis === Axis.Y || axis === Axis.Z ? axis : new Vector3(roundValue(axis.x), roundValue(axis.y), roundValue(axis.z));
}

function createConfiguration(body: IBody, rootNode: TransformNode, frame: ICharacterFrame): IRagdollRuntimeConfiguration {
	const configuration: IRagdollRuntimeConfiguration = {
		name: body.definition.name,
		bones: [body.bone.name],
		width: roundValue(body.halfExtents[0] * 2),
		height: roundValue(body.halfExtents[1] * 2),
		depth: roundValue(body.halfExtents[2] * 2),
		mass: body.mass,
		boxOffset: 0,
		// "babylonjs" and "@babylonjs/core" (used by the tools) declare distinct, yet identical, Vector3 types.
		boneOffsetAxis: Axis.Y as any,
	};

	// The ragdoll places the box at "bonePosition + direction * boxOffset" where the direction is the offset axis
	// transformed from the space of the bone. Any direction can be expressed that way, so the box is exactly centered.
	const offset = Vector3.FromArray(body.center).subtractInPlace(body.position);
	const offsetLength = offset.length();

	if (offsetLength > 1e-6) {
		const boneWorldMatrix = body.bone.getAbsoluteMatrix().multiply(rootNode.getWorldMatrix());
		const localDirection = Vector3.TransformNormal(offset, Matrix.Invert(boneWorldMatrix)).normalize();
		const snappedDirection = snapAxis(localDirection, 0.999, false);

		const worldDirection = Vector3.TransformNormal(snappedDirection, boneWorldMatrix).normalize();

		configuration.boneOffsetAxis = roundAxis(snappedDirection) as any;
		configuration.boxOffset = roundValue(snappedDirection === localDirection ? offsetLength : Vector3.Dot(offset, worldDirection));
	}

	// The root body has no joint.
	const hinge = body.definition.hinge;
	if (hinge && body.parent) {
		const { axis, min, max } = computeHinge(body, hinge, frame);

		configuration.joint = PhysicsConstraintType.HINGE;
		configuration.rotationAxis = roundAxis(axis) as any;
		// "+ 0" avoids negative zeros once the limits are negated.
		configuration.min = Math.round(min) + 0;
		configuration.max = Math.round(max) + 0;
	}

	return configuration;
}

/**
 * Computes the hinge axis of the given body and its limits.
 *
 * The bodies of the ragdoll are created with the rotation of the world, so the axis is expressed in world space in the rest
 * pose, where the angle of the joint is 0. The axis is oriented so a positive rotation around it (right hand rule, the
 * convention of "Quaternion.RotationAxis") moves the segment towards its flexion direction: "min" is the extension limit
 * and "max" the flexion limit.
 */
function computeHinge(body: IBody, hinge: IHingeDefinition, frame: ICharacterFrame): { axis: Vector3; min: number; max: number } {
	let segment = Vector3.FromArray(body.center).subtractInPlace(body.position);
	if (segment.lengthSquared() < 1e-12 && body.parent) {
		segment = body.position.subtract(body.parent.position);
	}
	segment.normalize();

	let flexion: Vector3;
	switch (hinge.flexion) {
		case "forward":
			flexion = frame.forward;
			break;
		case "backward":
			flexion = frame.forward.negate();
			break;
		case "up":
			flexion = frame.up;
			break;
		case "down":
			flexion = frame.up.negate();
			break;
	}

	let min = hinge.min;
	let max = hinge.max;

	// Shoulder: the arm can go down until it reaches the body, and up until it is raised over the head.
	if (body.definition.symmetricName === "Arms") {
		const angleToBody = (Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(segment, flexion)))) * 180) / Math.PI;
		max = Math.max(0, angleToBody - 10);
		min = -Math.max(0, 160 - angleToBody);
	}

	// Being "d" the direction of the segment and "f" the flexion direction, a rotation of angle "t" around "d x f" moves the
	// segment along "t * f".
	let axis = Vector3.Cross(segment, flexion);
	if (axis.lengthSquared() < 1e-8) {
		// The segment is aligned with its flexion direction, fall back on the lateral axis.
		axis = frame.left.clone();
	}
	axis.normalize();

	// Prefers the canonical axes, readable in the inspector: an opposite axis simply swaps and negates the limits.
	const snapped = snapAxis(axis, 0.97, true);
	if (snapped !== axis && Vector3.Dot(snapped, axis) < 0) {
		[min, max] = [-max, -min];
	}

	return { axis: snapped, min, max };
}

/**
 * Merges the configurations of the left and right bodies in a single configuration when they are symmetrical, the same
 * way it would be written by hand. They are kept separated otherwise (for example when the bones of both sides don't
 * have the same local axes): a single offset axis would center the box of one of the sides only.
 */
function mergeSymmetricConfigurations(configurations: IRagdollRuntimeConfiguration[], symmetricNames: Map<IRagdollRuntimeConfiguration, string>): IRagdollRuntimeConfiguration[] {
	const result: IRagdollRuntimeConfiguration[] = [];
	const merged = new Set<IRagdollRuntimeConfiguration>();

	configurations.forEach((configuration) => {
		if (merged.has(configuration)) {
			return;
		}

		if (!configuration.name.startsWith("Left ")) {
			result.push(configuration);
			return;
		}

		const name = configuration.name.substring("Left ".length);
		const other = configurations.find((c) => c.name === `Right ${name}`);

		if (!other || !areSymmetrical(configuration, other)) {
			result.push(configuration);
			return;
		}

		merged.add(other);

		result.push({
			...configuration,
			name: symmetricNames.get(configuration) ?? name,
			bones: [...configuration.bones, ...other.bones],
			width: roundValue((configuration.width! + other.width!) * 0.5),
			height: roundValue((configuration.height! + other.height!) * 0.5),
			depth: roundValue((configuration.depth! + other.depth!) * 0.5),
			boxOffset: roundValue((configuration.boxOffset! + other.boxOffset!) * 0.5),
		});
	});

	return result;
}

function areSymmetrical(a: IRagdollRuntimeConfiguration, b: IRagdollRuntimeConfiguration): boolean {
	const isClose = (x = 0, y = 0) => Math.abs(x - y) <= Math.max(Math.abs(x), Math.abs(y)) * 0.1 + 1e-6;

	const dot = (x: any, y: any) => Vector3.Dot(x, y);

	const sameOffsetAxis = a.boneOffsetAxis === b.boneOffsetAxis || (!!a.boneOffsetAxis && !!b.boneOffsetAxis && dot(a.boneOffsetAxis, b.boneOffsetAxis) >= 0.99);
	// The axis is oriented: both sides only share a configuration when their joints flex the same way around the same axis.
	const sameRotationAxis = a.rotationAxis === b.rotationAxis || (!!a.rotationAxis && !!b.rotationAxis && dot(a.rotationAxis, b.rotationAxis) >= 0.99);
	const sameLimits = Math.abs((a.min ?? 0) - (b.min ?? 0)) <= 2 && Math.abs((a.max ?? 0) - (b.max ?? 0)) <= 2;

	return (
		sameOffsetAxis &&
		sameRotationAxis &&
		sameLimits &&
		isClose(a.width, b.width) &&
		isClose(a.height, b.height) &&
		isClose(a.depth, b.depth) &&
		isClose(a.boxOffset, b.boxOffset)
	);
}
