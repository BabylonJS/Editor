import { AbstractMesh, TmpVectors, Vector3, Mesh, BoundingBox, StandardMaterial, Color3, MeshBuilder } from "babylonjs";

import { isCollisionInstancedMesh, isCollisionMesh } from "../../../../tools/guards/nodes";

import { EditorPreviewGizmo } from "./gizmo";

const magnetismSizeRatio = 0.15;
const magnetismDistanceRatio = 0.02;
const magnetismCenterSizeRatio = 4;
const magnetismMarkerRatio = 0.0075;

let _magnetismMarker: Mesh | null = null;
let _magnetismMeshes: AbstractMesh[] | null = null;
let _magnetismAnchors: Map<AbstractMesh, Vector3[]> = new Map();
let _magnetismFreePosition: Vector3 | null = null;
let _magnetismAppliedPosition: Vector3 | null = null;

/**
 * While the shift key is down, tries to snap the currently dragged mesh on the surrounding meshes.
 * Like the vertex snapping available in Unity and the actor alignment available in Unreal Engine, the
 * anchors of the dragged mesh (bounding box center, corners, edge midpoints and face centers) are matched
 * against the anchors of the nearby meshes. The closest pair below the search radius wins and the mesh is
 * translated by the exact offset that makes both anchors coincide, which makes combining pipes, walls, etc.
 * way easier.
 *
 * Matching the center of the dragged mesh with the center of a nearby mesh of comparable size (plugging a pipe
 * in its receptor) is the most useful case: it takes over any other anchor pair as soon as both centers are
 * within the search radius.
 */
export function checkMagnetism(gizmo: EditorPreviewGizmo, mesh: AbstractMesh) {
	// Magnetism only makes sense while translating the mesh.
	if (!gizmo._positionGizmo || !gizmo._shiftDown) {
		resetMagnetism();
		return;
	}

	// Track the position the mesh would have without magnetism. Applying the snap offset on top of that
	// position instead of on top of the previously snapped one prevents the offset from accumulating and
	// makes the mesh naturally "unstick" from its anchor once the drag goes further than the search radius.
	if (!_magnetismFreePosition || !_magnetismAppliedPosition) {
		_magnetismFreePosition = mesh.position.clone();
		_magnetismAppliedPosition = mesh.position.clone();
	} else {
		mesh.position.subtractToRef(_magnetismAppliedPosition, TmpVectors.Vector3[0]);
		_magnetismFreePosition.addInPlace(TmpVectors.Vector3[0]);
	}

	mesh.position.copyFrom(_magnetismFreePosition);
	mesh.computeWorldMatrix(true);

	const boundingBox = mesh.getBoundingInfo().boundingBox;

	const camera = gizmo._gizmosLayer.originalScene.activeCamera;
	const distanceToCamera = camera ? Vector3.Distance(camera.globalPosition, boundingBox.centerWorld) : 0;

	const diagonal = boundingBox.extendSizeWorld.length() * 2;
	const radius = Math.max(diagonal * magnetismSizeRatio, distanceToCamera * magnetismDistanceRatio);

	let bestSource: Vector3 | null = null;
	let bestTarget: Vector3 | null = null;
	let bestDistance = radius * radius;

	let bestCenter: Vector3 | null = null;
	let bestCenterDistance = radius * radius;

	if (radius > 0) {
		const sourceAnchors = computeMagnetismAnchors(mesh);

		_magnetismMeshes ??= gizmo._gizmosLayer.originalScene.meshes.filter((m) => {
			return (
				m !== mesh &&
				!m._masterMesh &&
				!isCollisionMesh(m) &&
				!isCollisionInstancedMesh(m) &&
				m.isVisible &&
				m.isEnabled() &&
				m.getTotalVertices() > 0 &&
				!m.isDescendantOf(mesh) &&
				!mesh.isDescendantOf(m)
			);
		});

		for (const targetMesh of _magnetismMeshes) {
			const targetBoundingBox = targetMesh.getBoundingInfo().boundingBox;

			if (!areBoundingBoxesClose(boundingBox, targetBoundingBox, radius)) {
				continue;
			}

			// Plugging a pipe in its receptor: both meshes have a comparable size and their centers are matched.
			if (targetBoundingBox.extendSizeWorld.length() * 2 <= diagonal * magnetismCenterSizeRatio) {
				const centerDistance = Vector3.DistanceSquared(boundingBox.centerWorld, targetBoundingBox.centerWorld);
				if (centerDistance < bestCenterDistance) {
					bestCenterDistance = centerDistance;
					bestCenter = targetBoundingBox.centerWorld;
				}
			}

			// Nearby meshes do not move while dragging, their anchors are computed only once per drag.
			let targetAnchors = _magnetismAnchors.get(targetMesh);
			if (!targetAnchors) {
				targetAnchors = computeMagnetismAnchors(targetMesh);
				_magnetismAnchors.set(targetMesh, targetAnchors);
			}

			for (const sourceAnchor of sourceAnchors) {
				for (const targetAnchor of targetAnchors) {
					const distance = Vector3.DistanceSquared(sourceAnchor, targetAnchor);
					if (distance < bestDistance) {
						bestDistance = distance;
						bestSource = sourceAnchor;
						bestTarget = targetAnchor;
					}
				}
			}
		}
	}

	// Center-to-center takes over the other anchor pairs, being close enough to the center of a mesh of a
	// comparable size always means the dragged mesh is meant to be plugged in it.
	if (bestCenter) {
		bestSource = boundingBox.centerWorld;
		bestTarget = bestCenter;
	}

	if (bestSource && bestTarget) {
		const offset = bestTarget.subtract(bestSource);

		// The gizmo drives the local position of the mesh, the offset computed in world space is expressed
		// in the parent space before being applied.
		if (mesh.parent) {
			mesh.parent.getWorldMatrix().invertToRef(TmpVectors.Matrix[0]);
			Vector3.TransformNormalToRef(offset, TmpVectors.Matrix[0], offset);
		}

		mesh.position.addInPlace(offset);
		mesh.computeWorldMatrix(true);
	}

	_magnetismAppliedPosition.copyFrom(mesh.position);
	updateMagnetismMarker(gizmo, bestTarget);
}

/**
 * Computes, in world space, the anchors used by magnetism for the given mesh. Those are all the combinations
 * of the minimum, center and maximum values of its bounding box on each axis, aka. its 8 corners, its 12 edge
 * midpoints, its 6 face centers and its center.
 */
export function computeMagnetismAnchors(mesh: AbstractMesh) {
	const boundingBox = mesh.getBoundingInfo().boundingBox;

	const minimum = boundingBox.minimum;
	const maximum = boundingBox.maximum;

	const coordinates = [
		[minimum.x, (minimum.x + maximum.x) * 0.5, maximum.x],
		[minimum.y, (minimum.y + maximum.y) * 0.5, maximum.y],
		[minimum.z, (minimum.z + maximum.z) * 0.5, maximum.z],
	];

	const worldMatrix = mesh.getWorldMatrix();
	const anchors: Vector3[] = [];

	for (let x = 0; x < 3; ++x) {
		for (let y = 0; y < 3; ++y) {
			for (let z = 0; z < 3; ++z) {
				anchors.push(Vector3.TransformCoordinates(new Vector3(coordinates[0][x], coordinates[1][y], coordinates[2][z]), worldMatrix));
			}
		}
	}

	return anchors;
}

/**
 * Returns wether or not both given bounding boxes are distant from less than the given distance on each world axis.
 */
export function areBoundingBoxesClose(a: BoundingBox, b: BoundingBox, distance: number) {
	return (
		a.minimumWorld.x - distance <= b.maximumWorld.x &&
		a.maximumWorld.x + distance >= b.minimumWorld.x &&
		a.minimumWorld.y - distance <= b.maximumWorld.y &&
		a.maximumWorld.y + distance >= b.minimumWorld.y &&
		a.minimumWorld.z - distance <= b.maximumWorld.z &&
		a.maximumWorld.z + distance >= b.minimumWorld.z
	);
}

/**
 * Draws a marker on the anchor the dragged mesh is currently snapped to, or hides it when there is no anchor.
 */
export function updateMagnetismMarker(gizmo: EditorPreviewGizmo, position: Vector3 | null) {
	if (!position) {
		_magnetismMarker?.setEnabled(false);
		return;
	}

	if (!_magnetismMarker) {
		const material = new StandardMaterial("gizmoMagnetismMarkerMaterial", gizmo._gizmosLayer.utilityLayerScene);
		material.disableLighting = true;
		material.emissiveColor = new Color3(1, 0.75, 0.1);

		_magnetismMarker = MeshBuilder.CreateSphere("gizmoMagnetismMarker", { diameter: 1, segments: 12 }, gizmo._gizmosLayer.utilityLayerScene);
		_magnetismMarker.isPickable = false;
		_magnetismMarker.material = material;
	}

	const camera = gizmo._gizmosLayer.originalScene.activeCamera;
	const size = camera ? Vector3.Distance(camera.globalPosition, position) * magnetismMarkerRatio : 1;

	_magnetismMarker.setEnabled(true);
	_magnetismMarker.position.copyFrom(position);
	_magnetismMarker.scaling.setAll(size);
}

/**
 * Clears the state computed by magnetism for the current drag. The mesh keeps the position it was snapped to.
 */
export function resetMagnetism() {
	_magnetismMeshes = null;
	_magnetismFreePosition = null;
	_magnetismAppliedPosition = null;
	_magnetismAnchors.clear();

	_magnetismMarker?.setEnabled(false);
}
