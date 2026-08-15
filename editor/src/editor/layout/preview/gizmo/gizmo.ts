import {
	GizmoCoordinatesMode,
	Node,
	Observable,
	PositionGizmo,
	Quaternion,
	RotationGizmo,
	ScaleGizmo,
	Scene,
	Tools,
	UtilityLayerRenderer,
	Vector3,
	CameraGizmo,
	AbstractMesh,
	TransformNode,
	Sprite,
	BoundingBox,
	Color3,
	Mesh,
	MeshBuilder,
	StandardMaterial,
	TmpVectors,
} from "babylonjs";

import { isSprite } from "../../../../tools/guards/sprites";
import { registerUndoRedo } from "../../../../tools/undoredo";
import { isNodeLocked } from "../../../../tools/node/metadata";
import { isQuaternion, isVector3 } from "../../../../tools/guards/math";
import { updateIblShadowsRenderPipeline } from "../../../../tools/light/ibl";
import { defaultGizmoSnapPreferences, IGizmoSnapPreferences } from "../../../../tools/scene/gizmo";
import { isAbstractMesh, isCamera, isCollisionInstancedMesh, isCollisionMesh, isLight, isNode } from "../../../../tools/guards/nodes";
import { updateLightShadowMapRefreshRate, updatePointLightShadowMapRenderListPredicate } from "../../../../tools/light/shadows";

export const onGizmoNodeChangedObservable = new Observable<Node | Sprite>();

const magnetismSizeRatio = 0.15;
const magnetismDistanceRatio = 0.02;
const magnetismCenterSizeRatio = 4;
const magnetismMarkerRatio = 0.0075;

export class EditorPreviewGizmo {
	/**
	 * @internal
	 */
	public _gizmosLayer: UtilityLayerRenderer;

	private _scalingGizmo: ScaleGizmo | null = null;
	private _positionGizmo: PositionGizmo | null = null;
	private _rotationGizmo: RotationGizmo | null = null;

	private _coordinatesMode: GizmoCoordinatesMode = GizmoCoordinatesMode.Local;

	private _cameraGizmo: CameraGizmo | null = null;

	private _attachedNode: Node | null = null;
	private _attachedSprite: Sprite | null = null;

	private _spriteTransformNode: TransformNode;

	private _snapPreferences: IGizmoSnapPreferences = { ...defaultGizmoSnapPreferences };

	private _keyUpListener: (ev: KeyboardEvent) => void;
	private _keyDownListener: (ev: KeyboardEvent) => void;

	private _shiftDown: boolean = false;

	private _magnetismMarker: Mesh | null = null;
	private _magnetismMeshes: AbstractMesh[] | null = null;
	private _magnetismAnchors: Map<AbstractMesh, Vector3[]> = new Map();
	private _magnetismFreePosition: Vector3 | null = null;
	private _magnetismAppliedPosition: Vector3 | null = null;

	public constructor(scene: Scene) {
		this._gizmosLayer = new UtilityLayerRenderer(scene);
		this._gizmosLayer.utilityLayerScene.postProcessesEnabled = false;

		this._spriteTransformNode = new TransformNode("spriteGizmoTransformNode", this._gizmosLayer.utilityLayerScene);

		window.addEventListener(
			"keydown",
			(this._keyDownListener = (ev) => {
				this._shiftDown = ev.shiftKey;
			})
		);
		window.addEventListener(
			"keyup",
			(this._keyUpListener = (ev) => {
				this._shiftDown = ev.shiftKey;
			})
		);

		scene.onDisposeObservable.addOnce(() => {
			window.removeEventListener("keyup", this._keyUpListener);
			window.removeEventListener("keydown", this._keyDownListener);
		});
	}

	/**
	 * Gets the current gizmo.
	 */
	public get currentGizmo(): PositionGizmo | RotationGizmo | ScaleGizmo | null {
		return this._positionGizmo ?? this._rotationGizmo ?? this._scalingGizmo ?? null;
	}

	/**
	 * Sets the gizmo type.
	 * @param gizmo The gizmo to set.
	 */
	public setGizmoType(gizmo: "position" | "rotation" | "scaling" | "none"): void {
		this.currentGizmo?.dispose();

		this._scalingGizmo = null;
		this._positionGizmo = null;
		this._rotationGizmo = null;

		switch (gizmo) {
			case "position":
				this._positionGizmo = new PositionGizmo(this._gizmosLayer);
				this._positionGizmo.planarGizmoEnabled = true;
				this._attachVector3UndoRedoEvents(this._positionGizmo, "position");
				break;
			case "rotation":
				this._rotationGizmo = new RotationGizmo(this._gizmosLayer);
				this._attachRotationUndoRedoEvents(this._rotationGizmo);
				break;
			case "scaling":
				this._scalingGizmo = new ScaleGizmo(this._gizmosLayer);
				this._attachVector3UndoRedoEvents(this._scalingGizmo, "scaling");
				break;
		}

		if (this.currentGizmo) {
			this.currentGizmo.scaleRatio = 2;
			this.currentGizmo.coordinatesMode = this._coordinatesMode;

			if (this._positionGizmo) {
				// A bit of hacking.
				this._positionGizmo.xPlaneGizmo["_coloredMaterial"].alpha = 0.3;
				this._positionGizmo.xPlaneGizmo["_hoverMaterial"].alpha = 1;

				this._positionGizmo.yPlaneGizmo["_coloredMaterial"].alpha = 0.3;
				this._positionGizmo.yPlaneGizmo["_hoverMaterial"].alpha = 1;

				this._positionGizmo.zPlaneGizmo["_coloredMaterial"].alpha = 0.3;
				this._positionGizmo.zPlaneGizmo["_hoverMaterial"].alpha = 1;
			}
		}

		this._spriteTransformNode.billboardMode = this._scalingGizmo || this._rotationGizmo ? TransformNode.BILLBOARDMODE_ALL : TransformNode.BILLBOARDMODE_NONE;

		this.setAttachedObject(this._attachedSprite ?? this._attachedNode);
		this._applySnapToCurrentGizmos();
	}

	public getSnapPreferences(): IGizmoSnapPreferences {
		return { ...this._snapPreferences };
	}

	public setSnapPreferences(prefs: IGizmoSnapPreferences): void {
		this._snapPreferences = { ...prefs };
		this._applySnapToCurrentGizmos();
	}

	private _applySnapToCurrentGizmos(): void {
		if (this._positionGizmo) {
			const enabled = this._snapPreferences.translationEnabled && this._snapPreferences.translationStep > 0;
			this._positionGizmo.snapDistance = enabled ? this._snapPreferences.translationStep : 0;
		}

		if (this._rotationGizmo) {
			const enabled = this._snapPreferences.rotationEnabled && this._snapPreferences.rotationStepDegrees > 0;
			this._rotationGizmo.snapDistance = enabled ? Tools.ToRadians(this._snapPreferences.rotationStepDegrees) : 0;
		}

		if (this._scalingGizmo) {
			const enabled = this._snapPreferences.scaleEnabled && this._snapPreferences.scaleStep > 0;
			this._scalingGizmo.incrementalSnap = true;
			this._scalingGizmo.snapDistance = enabled ? this._snapPreferences.scaleStep : 0;
		}
	}

	/**
	 * Gets the reference to the node that is attached and controlled by the gizmo.
	 */
	public get attachedNode(): Node | null {
		return this._attachedNode;
	}

	/**
	 * Gets the reference to the sprite that is attached and controlled by the gizmo.
	 */
	public get attachedSprite(): Sprite | null {
		return this._attachedSprite;
	}

	/**
	 * Sets the node that is attached and controlled by the gizmo.
	 * @param object The node to attach to the gizmo.
	 */
	public setAttachedObject(object: Node | Sprite | null): void {
		if (object && isNode(object) && isNodeLocked(object)) {
			object = null;
		}

		this._attachedNode = null;
		this._attachedSprite = null;

		if (object) {
			if (isNode(object)) {
				this._attachedNode = object;
				this._attachedSprite = null;
			} else if (isSprite(object)) {
				this._attachedSprite = object;
				this._attachedNode = this._spriteTransformNode;

				this._spriteTransformNode.position.copyFrom(object.position);
				this._spriteTransformNode.scaling.set(object.width, object.height, 1);
				this._spriteTransformNode.rotation.set(0, 0, object.angle);
			}
		}

		if (object && isCamera(object) && this._gizmosLayer.originalScene.cameras.includes(object)) {
			this._cameraGizmo ??= new CameraGizmo(this._gizmosLayer);
			this._cameraGizmo.camera = object;
			this._cameraGizmo.attachedNode = object;
		} else {
			this._cameraGizmo?.dispose();
			this._cameraGizmo = null;
		}

		if (this.currentGizmo) {
			this.currentGizmo.xGizmo.isEnabled = true;
			this.currentGizmo.yGizmo.isEnabled = true;
			this.currentGizmo.zGizmo.isEnabled = true;

			this.currentGizmo.attachedNode = this._attachedNode;

			if (object && isSprite(object)) {
				if (this._scalingGizmo) {
					this.currentGizmo.zGizmo.isEnabled = false;
				}

				if (this._rotationGizmo) {
					this.currentGizmo.xGizmo.isEnabled = false;
					this.currentGizmo.yGizmo.isEnabled = false;
				}
			}
		}
	}

	public getCoordinateMode(): GizmoCoordinatesMode {
		return this._coordinatesMode;
	}

	public setCoordinatesMode(mode: GizmoCoordinatesMode): void {
		this._coordinatesMode = mode;

		if (this.currentGizmo) {
			this.currentGizmo.coordinatesMode = mode;
		}
	}

	public getCoordinatesModeString(): string {
		switch (this._coordinatesMode) {
			case GizmoCoordinatesMode.World:
				return "World";
			case GizmoCoordinatesMode.Local:
				return "Local";
		}
	}

	private _updateShadowMapsForMesh(mesh: AbstractMesh): void {
		const scene = this._gizmosLayer.originalScene;
		const lights = scene.lights.filter((light) => light.getShadowGenerator()?.getShadowMap()?.renderList?.includes(mesh));

		lights.forEach((light) => {
			updateLightShadowMapRefreshRate(light);
			updatePointLightShadowMapRenderListPredicate(light);
		});
	}

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
	private _checkMagnetism(mesh: AbstractMesh): void {
		// Magnetism only makes sense while translating the mesh.
		if (!this._positionGizmo || !this._shiftDown) {
			this._resetMagnetism();
			return;
		}

		// Track the position the mesh would have without magnetism. Applying the snap offset on top of that
		// position instead of on top of the previously snapped one prevents the offset from accumulating and
		// makes the mesh naturally "unstick" from its anchor once the drag goes further than the search radius.
		if (!this._magnetismFreePosition || !this._magnetismAppliedPosition) {
			this._magnetismFreePosition = mesh.position.clone();
			this._magnetismAppliedPosition = mesh.position.clone();
		} else {
			mesh.position.subtractToRef(this._magnetismAppliedPosition, TmpVectors.Vector3[0]);
			this._magnetismFreePosition.addInPlace(TmpVectors.Vector3[0]);
		}

		mesh.position.copyFrom(this._magnetismFreePosition);
		mesh.computeWorldMatrix(true);

		const boundingBox = mesh.getBoundingInfo().boundingBox;

		const camera = this._gizmosLayer.originalScene.activeCamera;
		const distanceToCamera = camera ? Vector3.Distance(camera.globalPosition, boundingBox.centerWorld) : 0;

		const diagonal = boundingBox.extendSizeWorld.length() * 2;
		const radius = Math.max(diagonal * magnetismSizeRatio, distanceToCamera * magnetismDistanceRatio);

		let bestSource: Vector3 | null = null;
		let bestTarget: Vector3 | null = null;
		let bestDistance = radius * radius;

		let bestCenter: Vector3 | null = null;
		let bestCenterDistance = radius * radius;

		if (radius > 0) {
			const sourceAnchors = this._computeMagnetismAnchors(mesh);

			this._magnetismMeshes ??= this._gizmosLayer.originalScene.meshes.filter((m) => {
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

			for (const targetMesh of this._magnetismMeshes) {
				const targetBoundingBox = targetMesh.getBoundingInfo().boundingBox;

				if (!this._areBoundingBoxesClose(boundingBox, targetBoundingBox, radius)) {
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
				let targetAnchors = this._magnetismAnchors.get(targetMesh);
				if (!targetAnchors) {
					targetAnchors = this._computeMagnetismAnchors(targetMesh);
					this._magnetismAnchors.set(targetMesh, targetAnchors);
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

		this._magnetismAppliedPosition.copyFrom(mesh.position);
		this._updateMagnetismMarker(bestTarget);
	}

	/**
	 * Computes, in world space, the anchors used by magnetism for the given mesh. Those are all the combinations
	 * of the minimum, center and maximum values of its bounding box on each axis, aka. its 8 corners, its 12 edge
	 * midpoints, its 6 face centers and its center.
	 */
	private _computeMagnetismAnchors(mesh: AbstractMesh): Vector3[] {
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
	private _areBoundingBoxesClose(a: BoundingBox, b: BoundingBox, distance: number): boolean {
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
	private _updateMagnetismMarker(position: Vector3 | null): void {
		if (!position) {
			this._magnetismMarker?.setEnabled(false);
			return;
		}

		if (!this._magnetismMarker) {
			const material = new StandardMaterial("gizmoMagnetismMarkerMaterial", this._gizmosLayer.utilityLayerScene);
			material.disableLighting = true;
			material.emissiveColor = new Color3(1, 0.75, 0.1);

			this._magnetismMarker = MeshBuilder.CreateSphere("gizmoMagnetismMarker", { diameter: 1, segments: 12 }, this._gizmosLayer.utilityLayerScene);
			this._magnetismMarker.isPickable = false;
			this._magnetismMarker.material = material;
		}

		const camera = this._gizmosLayer.originalScene.activeCamera;
		const size = camera ? Vector3.Distance(camera.globalPosition, position) * magnetismMarkerRatio : 1;

		this._magnetismMarker.setEnabled(true);
		this._magnetismMarker.position.copyFrom(position);
		this._magnetismMarker.scaling.setAll(size);
	}

	/**
	 * Clears the state computed by magnetism for the current drag. The mesh keeps the position it was snapped to.
	 */
	private _resetMagnetism(): void {
		this._magnetismMeshes = null;
		this._magnetismFreePosition = null;
		this._magnetismAppliedPosition = null;
		this._magnetismAnchors.clear();

		this._magnetismMarker?.setEnabled(false);
	}

	private _attachVector3UndoRedoEvents(gizmo: PositionGizmo | ScaleGizmo | RotationGizmo, property: "position" | "scaling"): void {
		let temporaryNode: Node | null = null;
		let temporarySprite: Sprite | null = null;

		let temporaryOldValue: Vector3 | null = null;

		gizmo.onDragStartObservable.add(() => {
			this._resetMagnetism();

			if (!this._attachedNode) {
				return;
			}

			temporaryNode = this._attachedNode;
			temporarySprite = this._attachedSprite;

			const value = this._attachedNode[property];
			temporaryOldValue = isVector3(value) ? value.clone() : value;
		});

		gizmo.onDragObservable.add(() => {
			if (isLight(temporaryNode)) {
				updateLightShadowMapRefreshRate(temporaryNode);
				updatePointLightShadowMapRenderListPredicate(temporaryNode);
			} else if (isAbstractMesh(temporaryNode)) {
				this._checkMagnetism(temporaryNode);
				this._updateShadowMapsForMesh(temporaryNode);
			} else if (temporarySprite) {
				if (property === "scaling") {
					temporarySprite.width = this._spriteTransformNode.scaling.x;
					temporarySprite.height = this._spriteTransformNode.scaling.y;
				} else {
					temporarySprite.position.copyFrom(this._spriteTransformNode.position);
				}
			}
		});

		gizmo.onDragEndObservable.add(() => {
			this._resetMagnetism();

			if (!temporaryNode) {
				return;
			}

			const node = temporaryNode;
			const sprite = temporarySprite;

			const oldValue = temporaryOldValue?.clone();
			const newValueRef = temporaryNode[property];
			const newValue = isVector3(newValueRef) ? newValueRef.clone() : null;

			registerUndoRedo({
				undo: () => {
					const valueRef = sprite?.[property] ?? node[property];

					if (sprite) {
						if (property === "position") {
							sprite.position = oldValue?.clone() ?? sprite.position;
						} else {
							sprite.width = oldValue?.x ?? sprite.width;
							sprite.height = oldValue?.y ?? sprite.height;
						}
					} else if (isVector3(valueRef) && oldValue) {
						valueRef.copyFrom(oldValue);
					} else {
						node[property] = oldValue?.clone() ?? null;
					}

					if (isLight(node)) {
						updateLightShadowMapRefreshRate(node);
						updatePointLightShadowMapRenderListPredicate(node);
					}

					if (!sprite) {
						updateIblShadowsRenderPipeline(node.getScene());
					}

					this.setAttachedObject(sprite ?? node);
				},
				redo: () => {
					const valueRef = sprite?.[property] ?? node[property];

					if (sprite) {
						if (property === "position") {
							sprite.position = newValue?.clone() ?? sprite.position;
						} else {
							sprite.width = newValue?.x ?? sprite.width;
							sprite.height = newValue?.y ?? sprite.height;
						}
					} else if (isVector3(valueRef) && newValue) {
						valueRef.copyFrom(newValue);
					} else {
						node[property] = newValue?.clone() ?? null;
					}

					if (isLight(node)) {
						updateLightShadowMapRefreshRate(node);
						updatePointLightShadowMapRenderListPredicate(node);
					}

					if (!sprite) {
						updateIblShadowsRenderPipeline(node.getScene());
					}

					this.setAttachedObject(sprite ?? node);
				},
			});

			if (!sprite) {
				updateIblShadowsRenderPipeline(node.getScene());
			}

			onGizmoNodeChangedObservable.notifyObservers(sprite ?? node);
		});
	}

	private _attachRotationUndoRedoEvents(gizmo: RotationGizmo): void {
		let temporaryNode: Node | null = null;
		let temporarySprite: Sprite | null = null;

		let temporaryOldValue: Vector3 | Quaternion | null = null;

		gizmo.onDragStartObservable.add(() => {
			if (!this._attachedNode) {
				return;
			}

			temporaryNode = this._attachedNode;
			temporarySprite = this._attachedSprite;

			const value = this._attachedNode["rotationQuaternion"] ?? this._attachedNode["rotation"];
			temporaryOldValue = isVector3(value) || isQuaternion(value) ? value.clone() : null;
		});

		gizmo.onDragObservable.add(() => {
			if (isLight(temporaryNode)) {
				updateLightShadowMapRefreshRate(temporaryNode);
				updatePointLightShadowMapRenderListPredicate(temporaryNode);
			} else if (isAbstractMesh(temporaryNode)) {
				this._updateShadowMapsForMesh(temporaryNode);
			} else if (temporarySprite) {
				temporarySprite.angle = this._spriteTransformNode.rotation.z;
			}
		});

		gizmo.onDragEndObservable.add(() => {
			if (!temporaryNode) {
				return;
			}

			const node = temporaryNode;
			const sprite = temporarySprite;

			const oldValue = temporaryOldValue?.clone();
			const newValueRef = temporaryNode["rotationQuaternion"] ?? temporaryNode["rotation"];
			const newValue = isVector3(newValueRef) || isQuaternion(newValueRef) ? newValueRef.clone() : null;

			registerUndoRedo({
				undo: () => {
					const valueRef = node["rotationQuaternion"] ?? node["rotation"];

					if (sprite) {
						sprite.angle = oldValue?.z ?? sprite.angle;
					} else if (isVector3(valueRef) && isVector3(oldValue)) {
						valueRef.copyFrom(oldValue);
					} else if (isQuaternion(valueRef) && isQuaternion(oldValue)) {
						valueRef.copyFrom(oldValue);
					}

					if (isLight(node)) {
						updateLightShadowMapRefreshRate(node);
						updatePointLightShadowMapRenderListPredicate(node);
					}

					if (!sprite) {
						updateIblShadowsRenderPipeline(node.getScene());
					}

					this.setAttachedObject(sprite ?? node);
				},
				redo: () => {
					const valueRef = node["rotationQuaternion"] ?? node["rotation"];

					if (sprite) {
						sprite.angle = newValue?.z ?? sprite.angle;
					} else if (isVector3(valueRef) && isVector3(newValue)) {
						valueRef.copyFrom(newValue);
					} else if (isQuaternion(valueRef) && isQuaternion(newValue)) {
						valueRef.copyFrom(newValue);
					}

					if (isLight(node)) {
						updateLightShadowMapRefreshRate(node);
						updatePointLightShadowMapRenderListPredicate(node);
					}

					if (!sprite) {
						updateIblShadowsRenderPipeline(node.getScene());
					}

					this.setAttachedObject(sprite ?? node);
				},
			});

			updateIblShadowsRenderPipeline(node.getScene());

			onGizmoNodeChangedObservable.notifyObservers(sprite ?? node);
		});
	}
}
