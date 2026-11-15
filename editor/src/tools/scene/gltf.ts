import {
	Animation,
	Camera,
	Geometry,
	ISceneLoaderAsyncResult,
	Material,
	Matrix,
	Mesh,
	MorphTargetManager,
	Node,
	Quaternion,
	Skeleton,
	TransformNode,
	Vector3,
	VertexBuffer,
	AssetContainer,
} from "babylonjs";

import { isAbstractMesh, isBone, isCamera, isLight, isMesh, isTransformNode } from "../guards/nodes";

/**
 * Defines the index of the axis a mirror is applied along: 0 for X, 1 for Y and 2 for Z.
 */
type MirrorAxis = 0 | 1 | 2;

const axisNames = ["x", "y", "z"];

/**
 * Converts everything the glTF loader created under its "__root__" node to the left handed system Babylon.js uses.
 *
 * In a left handed scene, the glTF loader keeps all the data as authored (right handed) and compensates using a
 * negative scaling (and a rotation) on the "__root__" node. This works for rendering, but every tool relying on the
 * world matrices having a positive determinant (ragdolls, physics, etc.) breaks.
 *
 * The mirror of the root is baked into the data instead: the geometries are mirrored and every transform, skeleton
 * and animation is conjugated by the mirror. The world transforms and the rendering of the loaded hierarchy are
 * exactly preserved, but the root doesn't have a negative scaling anymore.
 * @param result defines the result of the scene loader containing the loaded glTF.
 */
export function convertGltfToLeftHanded(result: ISceneLoaderAsyncResult | AssetContainer): void {
	const nodes = [...result.meshes, ...result.transformNodes];

	nodes.forEach((node) => {
		if (node.parent) {
			return;
		}

		const mirror = getRootMirror(node);
		if (mirror) {
			convertRootToLeftHanded(node, mirror.axis, mirror.cancelsRotation, result);
		}
	});
}

/**
 * Returns the mirror to bake into the hierarchy of the given root node, or null when the root doesn't mirror.
 *
 * Any mirror works as long as it is applied consistently, but when the rotation and the negative scaling of the root
 * combine into a single reflection, mirroring along that reflection cancels the rotation of the root too. The glTF loader
 * uses a 180° rotation around Y combined with a negative Z scaling, which is a mirror along X: the root then becomes a
 * simple scaling. A root keeping its rotation breaks the tools assuming the local rotation of a node is its world rotation,
 * like the ragdolls of Babylon.js reading the rotation of their root transform node.
 */
function getRootMirror(root: TransformNode): { axis: MirrorAxis; cancelsRotation: boolean } | null {
	const scalingAxis = getMirrorAxis(root.scaling);
	if (scalingAxis === null) {
		return null;
	}

	const rotation = root.rotationQuaternion ?? Quaternion.FromEulerVector(root.rotation);
	const signs = [1, 1, 1];
	signs[scalingAxis] = -1;

	// Linear part of the root without its scaling magnitude: "sign scaling * rotation".
	const matrix = Matrix.Scaling(signs[0], signs[1], signs[2]).multiply(Matrix.FromQuaternionToRef(rotation, new Matrix()));
	const m = matrix.m;

	const epsilon = 1e-6;
	const isDiagonal = [m[1], m[2], m[4], m[6], m[8], m[9]].every((value) => Math.abs(value) < epsilon);
	const diagonal = [m[0], m[5], m[10]];

	if (isDiagonal && diagonal.every((value) => Math.abs(Math.abs(value) - 1) < epsilon)) {
		const negativeAxes = diagonal.map((value, index) => (value < 0 ? index : -1)).filter((index) => index !== -1);
		if (negativeAxes.length === 1) {
			return { axis: negativeAxes[0] as MirrorAxis, cancelsRotation: true };
		}
	}

	return { axis: scalingAxis, cancelsRotation: false };
}

/**
 * Returns the axis along which the given scaling mirrors, or null when the scaling doesn't mirror.
 * The glTF loader mirrors its root along the Z axis.
 */
function getMirrorAxis(scaling: Vector3): MirrorAxis | null {
	const negativeAxes = [scaling.x, scaling.y, scaling.z].map((value, index) => (value < 0 ? index : -1)).filter((index) => index !== -1);
	return negativeAxes.length === 1 ? (negativeAxes[0] as MirrorAxis) : null;
}

function convertRootToLeftHanded(root: TransformNode, axis: MirrorAxis, cancelsRotation: boolean, result: ISceneLoaderAsyncResult | AssetContainer): void {
	const descendants = root.getDescendants(false);

	// Cameras can't be mirrored: store their world matrix to restore them once the hierarchy is converted.
	computeWorldMatrices(root, descendants);

	const cameras = descendants.filter((node) => isCamera(node)) as Camera[];
	const cameraWorldMatrices = cameras.map((camera) => camera.getViewMatrix(true).clone().invert());

	// Being "M" the mirror, the world matrix of a node is "L * P * R" where "L" is its local matrix, "P" the local
	// matrices of its ancestors and "R" the matrix of the root. Since "M * M = I", conjugating every local matrix by "M"
	// and replacing the root by "M * R" gives "M * L * P * R": mirroring the vertices ("v * M") gives the same world
	// positions. As "R" is "scale * rotation * translation", "M * R" cancels the negative scaling of the root, and its
	// rotation as well when "M" is the reflection they combine into.
	root.scaling.set(Math.abs(root.scaling.x), Math.abs(root.scaling.y), Math.abs(root.scaling.z));

	if (cancelsRotation) {
		if (root.rotationQuaternion) {
			root.rotationQuaternion.set(0, 0, 0, 1);
		} else {
			root.rotation.setAll(0);
		}
	}

	const geometries = new Set<Geometry>();
	const morphTargetManagers = new Map<MorphTargetManager, Mesh[]>();
	const materials = new Set<Material>();
	const skeletons = new Set<Skeleton>(result.skeletons);
	const convertedTargets = new Set<any>();

	descendants.forEach((node) => {
		if (isCamera(node)) {
			return;
		}

		convertedTargets.add(node);

		if (isLight(node)) {
			// Assigned rather than modified in place so the lights update their cached data (projection matrices, etc.).
			const light = node as any;
			if (light.position instanceof Vector3) {
				light.position = mirrorVector3InPlace(light.position.clone(), axis);
			}
			if (light.direction instanceof Vector3) {
				light.direction = mirrorVector3InPlace(light.direction.clone(), axis);
			}
			return;
		}

		if (!isAbstractMesh(node) && !isTransformNode(node)) {
			return;
		}

		mirrorTransformNode(node, axis);

		if (!isMesh(node)) {
			return;
		}

		if (node.geometry) {
			geometries.add(node.geometry);
		}

		if (node.morphTargetManager) {
			const meshes = morphTargetManagers.get(node.morphTargetManager) ?? [];
			morphTargetManagers.set(node.morphTargetManager, meshes.concat(node));
		}

		if (node.skeleton) {
			skeletons.add(node.skeleton);
		}

		mirrorThinInstances(node, axis);

		// Mirroring the vertices reverses the winding of the triangles. The negative determinant of the world matrix
		// was reversing the culling until now, so the side orientation has to be reversed instead.
		if (node.material && node.material.sideOrientation !== null) {
			materials.add(node.material);
		} else {
			node.sideOrientation = reverseSideOrientation(node.sideOrientation);
		}
	});

	geometries.forEach((geometry) => mirrorGeometry(geometry, axis));
	morphTargetManagers.forEach((meshes, manager) => mirrorMorphTargets(manager, meshes, axis));
	materials.forEach((material) => (material.sideOrientation = reverseSideOrientation(material.sideOrientation!)));

	skeletons.forEach((skeleton) => {
		mirrorSkeleton(skeleton, axis);
		skeleton.bones.forEach((bone) => convertedTargets.add(bone));
	});

	// Animations
	const animations = new Set<Animation>();
	result.animationGroups.forEach((animationGroup) => {
		animationGroup.targetedAnimations.forEach((targetedAnimation) => {
			if (convertedTargets.has(targetedAnimation.target)) {
				animations.add(targetedAnimation.animation);
			}
		});
	});

	convertedTargets.forEach((target) => {
		target.animations?.forEach((animation: Animation) => animations.add(animation));
	});

	animations.forEach((animation) => mirrorAnimation(animation, axis));

	// Cameras
	computeWorldMatrices(root, descendants);

	cameras.forEach((camera, index) => restoreCameraWorldMatrix(camera, cameraWorldMatrices[index], root, descendants));

	computeWorldMatrices(root, descendants);
}

/**
 * Computes the world matrices of the given root and its descendants, parents first.
 */
function computeWorldMatrices(root: TransformNode, descendants: Node[]): void {
	root.computeWorldMatrix(true);

	descendants.forEach((node) => {
		if (isCamera(node)) {
			node.getViewMatrix(true);
		} else {
			(node as TransformNode).computeWorldMatrix?.(true);
		}
	});
}

function mirrorVector3InPlace(vector: Vector3, axis: MirrorAxis): Vector3 {
	switch (axis) {
		case 0:
			vector.x = -vector.x;
			break;
		case 1:
			vector.y = -vector.y;
			break;
		case 2:
			vector.z = -vector.z;
			break;
	}

	return vector;
}

/**
 * Mirrors the given rotation: the axis of a rotation is a pseudo vector, so its components that are not along the
 * mirror axis are negated while the angle stays the same.
 */
function mirrorQuaternionInPlace(quaternion: Quaternion, axis: MirrorAxis): Quaternion {
	if (axis !== 0) {
		quaternion.x = -quaternion.x;
	}
	if (axis !== 1) {
		quaternion.y = -quaternion.y;
	}
	if (axis !== 2) {
		quaternion.z = -quaternion.z;
	}

	return quaternion;
}

function mirrorEulerRotationInPlace(rotation: Vector3, axis: MirrorAxis): Vector3 {
	const quaternion = mirrorQuaternionInPlace(Quaternion.FromEulerVector(rotation), axis);
	quaternion.toEulerAnglesToRef(rotation);

	return rotation;
}

/**
 * Returns the given matrix conjugated by the mirror ("M * matrix * M").
 */
function mirrorMatrix(matrix: Matrix, axis: MirrorAxis): Matrix {
	const source = matrix.asArray();
	const result = new Array<number>(16);

	for (let row = 0; row < 4; ++row) {
		for (let column = 0; column < 4; ++column) {
			const sign = (row === axis ? -1 : 1) * (column === axis ? -1 : 1);
			result[row * 4 + column] = source[row * 4 + column] * sign;
		}
	}

	return Matrix.FromArray(result);
}

function mirrorTransformNode(node: TransformNode, axis: MirrorAxis): void {
	// Scaling commutes with the mirror, only the translation and the rotation change.
	mirrorVector3InPlace(node.position, axis);

	if (node.rotationQuaternion) {
		mirrorQuaternionInPlace(node.rotationQuaternion, axis);
	} else {
		mirrorEulerRotationInPlace(node.rotation, axis);
	}
}

function reverseSideOrientation(sideOrientation: number): number {
	return sideOrientation === Material.ClockWiseSideOrientation ? Material.CounterClockWiseSideOrientation : Material.ClockWiseSideOrientation;
}

function mirrorGeometry(geometry: Geometry, axis: MirrorAxis): void {
	mirrorVertexBuffer(geometry, VertexBuffer.PositionKind, axis);
	mirrorVertexBuffer(geometry, VertexBuffer.NormalKind, axis);
	mirrorVertexBuffer(geometry, VertexBuffer.TangentKind, axis);
}

/**
 * Mirrors the given vertex data, stored with the given stride. For tangents, the handedness of the bitangent ("w")
 * is negated as well: the bitangent is computed as "cross(normal, tangent) * w" which flips sign once both are mirrored.
 */
function mirrorVertexData(data: Float32Array | number[], stride: number, axis: MirrorAxis, isTangent: boolean): void {
	for (let i = 0; i + axis < data.length; i += stride) {
		data[i + axis] = -data[i + axis];

		if (isTangent && stride === 4) {
			data[i + 3] = -data[i + 3];
		}
	}
}

function mirrorVertexBuffer(geometry: Geometry, kind: string, axis: MirrorAxis): void {
	const vertexBuffer = geometry.getVertexBuffer(kind);
	const data = geometry.getVerticesData(kind, false, true);

	if (!vertexBuffer || !data) {
		return;
	}

	const stride = vertexBuffer.getSize();
	mirrorVertexData(data, stride, axis, kind === VertexBuffer.TangentKind);

	// Recreating the buffer keeps the sub meshes and updates the bounding info of all the meshes using the geometry.
	geometry.setVerticesData(kind, data, vertexBuffer.isUpdatable(), stride);
}

function mirrorMorphTargets(manager: MorphTargetManager, meshes: Mesh[], axis: MirrorAxis): void {
	for (let i = 0; i < manager.numTargets; ++i) {
		const target = manager.getTarget(i);

		const positions = target.getPositions();
		if (positions) {
			const data = positions.slice();
			mirrorVertexData(data, 3, axis, false);
			target.setPositions(data);
		}

		const normals = target.getNormals();
		if (normals) {
			const data = normals.slice();
			mirrorVertexData(data, 3, axis, false);
			target.setNormals(data);
		}

		// Morph targets store the tangents without their handedness.
		const tangents = target.getTangents();
		if (tangents) {
			const data = tangents.slice();
			mirrorVertexData(data, 3, axis, false);
			target.setTangents(data);
		}
	}

	// The data layout didn't change, so the targets don't notify the manager: rebuild its texture and vertex buffers.
	manager.synchronize();

	meshes.forEach((mesh) => {
		mesh._syncGeometryWithMorphTargetManager();
		mesh._markSubMeshesAsAttributesDirty();
	});
}

function mirrorThinInstances(mesh: Mesh, axis: MirrorAxis): void {
	if (!mesh.hasThinInstances) {
		return;
	}

	const matrices = mesh.thinInstanceGetWorldMatrices();
	matrices.forEach((matrix, index) => {
		mesh.thinInstanceSetMatrixAt(index, mirrorMatrix(matrix, axis), index === matrices.length - 1);
	});

	mesh.thinInstanceRefreshBoundingInfo(false);
}

function mirrorSkeleton(skeleton: Skeleton, axis: MirrorAxis): void {
	const scaling = Vector3.One();
	const rotation = Quaternion.Identity();
	const position = Vector3.Zero();

	skeleton.bones.forEach((bone) => {
		bone.setRestMatrix(mirrorMatrix(bone.getRestMatrix(), axis));
		bone.updateMatrix(mirrorMatrix(bone.getBindMatrix(), axis), false, false);

		// The local matrix of a bone linked to a transform node is copied from the node, which is already converted.
		if (!bone._linkedTransformNode) {
			mirrorMatrix(bone.getLocalMatrix(), axis).decompose(scaling, rotation, position);

			bone.position = position;
			bone.rotationQuaternion = rotation;
			bone.scaling = scaling;
		}
	});

	// Recomputes the absolute bind matrices, and their inverse, of the whole hierarchy.
	skeleton.bones.forEach((bone) => {
		if (!bone.getParent()) {
			bone.updateMatrix(bone.getBindMatrix(), true, false);
		}
	});
}

function mirrorAnimation(animation: Animation, axis: MirrorAxis): void {
	const path = animation.targetPropertyPath;
	const property = path[path.length - 1];
	const parentProperty = path[path.length - 2];

	let mirrorValue: ((value: any) => any) | null = null;

	switch (animation.dataType) {
		case Animation.ANIMATIONTYPE_VECTOR3:
			if (property === "position" || property === "direction") {
				mirrorValue = (value: Vector3) => mirrorVector3InPlace(value.clone(), axis);
			} else if (property === "rotation") {
				mirrorValue = (value: Vector3) => mirrorEulerRotationInPlace(value.clone(), axis);
			}
			break;

		case Animation.ANIMATIONTYPE_QUATERNION:
			if (property === "rotationQuaternion") {
				mirrorValue = (value: Quaternion) => mirrorQuaternionInPlace(value.clone(), axis);
			}
			break;

		case Animation.ANIMATIONTYPE_MATRIX:
			mirrorValue = (value: Matrix) => mirrorMatrix(value, axis);
			break;

		case Animation.ANIMATIONTYPE_FLOAT:
			if ((parentProperty === "position" || parentProperty === "direction") && property === axisNames[axis]) {
				mirrorValue = (value: number) => -value;
			} else if (parentProperty === "rotationQuaternion" && axisNames.includes(property) && property !== axisNames[axis]) {
				mirrorValue = (value: number) => -value;
			}
			break;
	}

	if (!mirrorValue) {
		return;
	}

	animation.getKeys().forEach((key) => {
		key.value = mirrorValue(key.value);

		// The tangents of an euler rotation can't be mirrored as the conversion is not linear, they are kept as is.
		if (property !== "rotation") {
			if (key.inTangent !== undefined && key.inTangent !== null) {
				key.inTangent = mirrorValue(key.inTangent);
			}
			if (key.outTangent !== undefined && key.outTangent !== null) {
				key.outTangent = mirrorValue(key.outTangent);
			}
		}
	});
}

/**
 * Restores the world matrix a camera had before the conversion. A camera can't have a mirrored world matrix (its view
 * matrix would be flipped): the glTF loader cancels the mirror of the root by setting a negative scaling on the parent
 * of the camera, which now introduces a mirror and must be removed.
 */
function restoreCameraWorldMatrix(camera: Camera, worldMatrix: Matrix, root: TransformNode, descendants: Node[]): void {
	const parent = camera.parent;
	if (!parent || isBone(parent)) {
		return;
	}

	const parentNode = parent as TransformNode;
	let parentWorldMatrix = parentNode.getWorldMatrix();

	if (parentWorldMatrix.determinant() < 0 && parentNode.scaling) {
		const axis = getMirrorAxis(parentNode.scaling);
		if (axis !== null) {
			mirrorVector3InPlace(parentNode.scaling, axis);

			computeWorldMatrices(root, descendants);
			parentWorldMatrix = parentNode.getWorldMatrix();
		}
	}

	if (parentWorldMatrix.determinant() < 0) {
		return;
	}

	const scaling = Vector3.One();
	const rotation = Quaternion.Identity();
	const position = Vector3.Zero();

	worldMatrix.multiply(parentWorldMatrix.clone().invert()).decompose(scaling, rotation, position);

	camera.position.copyFrom(position);

	const targetCamera = camera as any;
	if (targetCamera.rotationQuaternion) {
		targetCamera.rotationQuaternion.copyFrom(rotation);
	} else if (targetCamera.rotation instanceof Vector3) {
		rotation.toEulerAnglesToRef(targetCamera.rotation);
	}
}
