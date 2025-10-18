import {
	GizmoCoordinatesMode,
	Node,
	Observable,
	PositionGizmo,
	Quaternion,
	RotationGizmo,
	ScaleGizmo,
	Scene,
	UtilityLayerRenderer,
	Vector3,
	CameraGizmo,
	AbstractMesh,
	TransformNode,
	Sprite,
} from "babylonjs";

import { isSprite } from "../../../tools/guards/sprites";
import { registerUndoRedo } from "../../../tools/undoredo";
import { isNodeLocked } from "../../../tools/node/metadata";
import { isQuaternion, isVector3 } from "../../../tools/guards/math";
import { updateIblShadowsRenderPipeline } from "../../../tools/light/ibl";
import { isAbstractMesh, isCamera, isLight, isNode } from "../../../tools/guards/nodes";
import { updateLightShadowMapRefreshRate, updatePointLightShadowMapRenderListPredicate } from "../../../tools/light/shadows";

export const onGizmoNodeChangedObservable = new Observable<Node | Sprite>();

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

	public constructor(scene: Scene) {
		this._gizmosLayer = new UtilityLayerRenderer(scene);
		this._gizmosLayer.utilityLayerScene.postProcessesEnabled = false;

		this._spriteTransformNode = new TransformNode("spriteGizmoTransformNode", this._gizmosLayer.utilityLayerScene);
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

		this.setAttachedNode(this._attachedSprite ?? this._attachedNode);
	}

	/**
	 * Gets the reference to the node that is attached and controlled by the gizmo.
	 */
	public get attachedNode(): Node | null {
		return this._attachedNode;
	}

	/**
	 * Sets the node that is attached and controlled by the gizmo.
	 * @param node The node to attach to the gizmo.
	 */
	public setAttachedNode(node: Node | Sprite | null): void {
		if (node && isNode(node) && isNodeLocked(node)) {
			node = null;
		}

		this._attachedNode = null;
		this._attachedSprite = null;

		if (node) {
			if (isNode(node)) {
				this._attachedNode = node;
				this._attachedSprite = null;
			} else if (isSprite(node)) {
				this._attachedSprite = node;
				this._attachedNode = this._spriteTransformNode;

				this._spriteTransformNode.position.copyFrom(node.position);
				this._spriteTransformNode.scaling.set(node.width, node.height, 1);
				this._spriteTransformNode.rotation.set(0, 0, node.angle);
			}

			if (isCamera(node)) {
				this._cameraGizmo ??= new CameraGizmo(this._gizmosLayer);
				this._cameraGizmo.camera = node;
				this._cameraGizmo.attachedNode = node;
			}
		} else {
			this._cameraGizmo?.dispose();
			this._cameraGizmo = null;
		}

		if (this.currentGizmo) {
			this.currentGizmo.xGizmo.isEnabled = true;
			this.currentGizmo.yGizmo.isEnabled = true;
			this.currentGizmo.zGizmo.isEnabled = true;

			this.currentGizmo.attachedNode = this._attachedNode;

			if (node && isSprite(node)) {
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

	private _attachVector3UndoRedoEvents(gizmo: PositionGizmo | ScaleGizmo | RotationGizmo, property: "position" | "scaling"): void {
		let temporaryNode: Node | null = null;
		let temporarySprite: Sprite | null = null;

		let temporaryOldValue: Vector3 | null = null;

		gizmo.onDragStartObservable.add(() => {
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

					this.setAttachedNode(sprite ?? node);
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

					this.setAttachedNode(sprite ?? node);
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

					this.setAttachedNode(sprite ?? node);
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

					this.setAttachedNode(sprite ?? node);
				},
			});

			updateIblShadowsRenderPipeline(node.getScene());

			onGizmoNodeChangedObservable.notifyObservers(sprite ?? node);
		});
	}
}
