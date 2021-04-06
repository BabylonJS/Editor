import { Nullable } from "../../../../shared/types";

import {
	Mesh, PointerInfo, PointerEventTypes, Matrix, Vector3, Quaternion,
	AbstractMesh, StandardMaterial, DynamicTexture,
} from "babylonjs";

import { Editor } from "../../editor";

import { InspectorNotifier } from "../../gui/inspector/notifier";

import { Decal } from "../tools/decal";
import { AbstractPaintingTool } from "../abstract-tool";

export class ThinInstancePainter extends AbstractPaintingTool {
	/**
	 * Defines the reference to the vector applied for the random rotation
	 * as minimum values for X, Y and Z.
	 */
	public randomRotationMin: Vector3 = new Vector3(0, -Math.PI, 0);
	/**
	 * Defines the reference to the vector applied for the random rotation
	 * as maximum values for X, Y and Z.
	 */
	public randomRotationMax: Vector3 = new Vector3(0, Math.PI, 0);

	/**
	 * Defines the reference to the vector applied for the random scaling
	 * as minumum values for X, Y and Z.
	 */
	public randomScalingMin: Vector3 = new Vector3(0, 0, 0);
	/**
	 * Defines the reference to the vector applied for the random scaling
	 * as maximum values for X, Y and Z.
	 */
	public randomScalingMax: Vector3 = new Vector3(0, 0, 0);

	/**
	 * Defines wether or not painting is done maintaining the mouse pointer down.
	 */
	public holdToPaint: boolean = true;

	private _cloneMesh: Nullable<Mesh> = null;
	private _selectedMesh: Nullable<Mesh> = null;

	private _targetMesh: Nullable<AbstractMesh> = null;

	private _decal: Decal;

	private _isPointerDown: boolean = false;
	private _removing: boolean = false;

	private _paintDistance: number = 1;

	private _rotationMatrix = Matrix.Identity();

	/**
	 * Constructor.
	 * @param editor the editor reference.
	 */
	public constructor(editor: Editor) {
		super(editor);

		this._createDecal();
	}

	/**
	 * Gets the minimum distance that should be checked between existing thin instances to
	 * determine if the current instance can be painted or not.
	 */
	public get paintDistance(): number {
		return this._paintDistance;
	}

	/**
	 * Sets the minimum distance that should be checked between existing thin instances to
	 * determine if the current instance can be painted or not.
	 */
	public set paintDistance(distance: number) {
		this._paintDistance = distance;
		this._decal.size.setAll(distance);
	}

	/**
	 * Disposes the painting tool.
	 */
	public dispose(): void {
		super.dispose();

		this._decal.dispose();
	}

	/**
	 * To be implemeneted.
	 * This function is called on a pointer event is trigerred on the main scene in the editor.
	 * @param info defines the reference to the pointer event informations.
	 */
	protected onPointerEvent(info: PointerInfo): void {
		if (info.type === PointerEventTypes.POINTERDOWN) {
			return this._handlePointerDown(info);
		}

		if (info.type === PointerEventTypes.POINTERMOVE) {
			return this._handlePointerMove();
		}

		if (info.type === PointerEventTypes.POINTERWHEEL) {
			return this._handlePointerWheel(info);
		}

		if (info.type === PointerEventTypes.POINTERUP) {
			this._handlePointerUp();
		}
	}

	/**
	 * Called on the Control key (or Command key) is released. This is the where
	 * the painting tool should be removed here.
	 */
	protected onControlKeyReleased(): void {
		this._isPointerDown = false;

		if (this._selectedMesh) {
			this._selectedMesh.isPickable = true;
		}

		if (this._cloneMesh) {
			this.layerScene.utilityLayerScene.removeMesh(this._cloneMesh);
			this._cloneMesh?.dispose(true, false);
		}

		this._decal.disposeMesh();

		this._cloneMesh = null;
		this._targetMesh = null;
	}

	/**
	 * Defines the 
	 * @param mesh defines the reference to the mesh to create thin instances.
	 */
	public setMesh(mesh: Mesh): void {
		if (this._selectedMesh) {
			this._selectedMesh.isPickable = true;
		}

		this._selectedMesh = mesh;
	}

	/**
	 * Called on the pointer is down.
	 */
	private _handlePointerDown(info: PointerInfo): void {
		this._isPointerDown = true;
		this._removing = info.event.button === 2;
	}

	/**
	 * Called on the pointer moves and painting tool is enabled.
	 */
	private _handlePointerMove(): void {
		if (!this._cloneMesh && this._selectedMesh) {
			this._selectedMesh.isPickable = false;

			this._cloneMesh = this._selectedMesh.clone(this._selectedMesh.name, undefined, true, false);
			this._cloneMesh.isPickable = false;

			this.layerScene.originalScene.removeMesh(this._cloneMesh);
			this.layerScene.utilityLayerScene.addMesh(this._cloneMesh);
		}

		if (this._cloneMesh && this._selectedMesh) {
			const pick = this.editor.scene!.pick(
				this.editor.scene!.pointerX,
				this.editor.scene!.pointerY,
				undefined,
				false,
				this.editor.scene!.activeCamera,
			);

			if (pick) {
				if (pick.pickedMesh) {
					this._targetMesh ??= pick.pickedMesh;
					if (this._isPointerDown && pick.pickedMesh !== this._targetMesh) {
						return;
					}
				}

				this._decal.updateDecal(pick);
	
				if (pick.pickedPoint) {
					this._cloneMesh.setAbsolutePosition(pick.pickedPoint);
	
					// const normal = pick.getNormal(true, true);
					// if (normal) {
					// 	this._cloneMesh.lookAt(pick.pickedPoint.subtract(normal.negate()));
					// }
				}
	
				if (this._isPointerDown && this.holdToPaint) {
					this._paint();
				}
			}
		}
	}

	/**
	 * Called on the pointer wheel is moving and tool is enabled.
	 */
	private _handlePointerWheel(info: PointerInfo): void {
		const event = info.event as WheelEvent;
		const delta = event.deltaY * -0.001;

		if (info.event.altKey) {
			this._cloneMesh?.scaling.addInPlaceFromFloats(delta, delta, delta);
		} else {
			const distance = Math.max(0, this._paintDistance + delta);
			this.paintDistance = distance;
			this._handlePointerMove();

			InspectorNotifier.NotifyChange(this, {
				caller: this,
				waitMs: 100,
			});
		}
	}

	/**
	 * Called on the pointer is up and painting tool is enabled.
	 */
	private _handlePointerUp(): void {
		this._isPointerDown = false;

		if (!this.holdToPaint) {
			this._paint();
		}

		if (this._selectedMesh?.thinInstanceCount) {
			this._selectedMesh.thinInstanceRefreshBoundingInfo(true);
		}
	}

	/**
	 * Paints the thin instance at the current position of the cloned mesh.
	 */
	private _paint(): void {
		if (!this._cloneMesh || !this._selectedMesh) {
			return;
		}

		// Absolute positions
		const absolutePosition = this._cloneMesh.getAbsolutePosition();
		const sourceAbsolutePosition = this._selectedMesh.getAbsolutePosition();

		// Configure mesh to use thin instance
		if (!this._selectedMesh.thinInstanceCount) {
			this._selectedMesh.thinInstanceAddSelf(true);
			this._selectedMesh.getLODLevels().forEach((lod) => {
				lod.mesh?.thinInstanceAddSelf(true);
			});
		}

		// Get rotation
		const randomRotation = new Vector3(
			Math.random() * (this.randomRotationMax.x - this.randomRotationMin.x) + this.randomRotationMin.x,
			Math.random() * (this.randomRotationMax.y - this.randomRotationMin.y) + this.randomRotationMin.y,
			Math.random() * (this.randomRotationMax.z - this.randomRotationMin.z) + this.randomRotationMin.z,
		);

		this._selectedMesh.absoluteRotationQuaternion.toRotationMatrix(this._rotationMatrix);

		// Transform translation
		const translation = absolutePosition.subtract(sourceAbsolutePosition).divide(this._selectedMesh.scaling);
		const transformedTranslation = Vector3.TransformCoordinates(translation, this._rotationMatrix.invert());

		// Search for existing thin instance under the set distance
		const matrices = this._selectedMesh.thinInstanceGetWorldMatrices();

		const extendsSize = this._cloneMesh.getBoundingInfo().boundingBox.extendSizeWorld;
		const averageScale = (extendsSize.x + extendsSize.y + extendsSize.z) / 3;
		const scaledDistance = this.paintDistance / averageScale;

		for (let i = 0; i < matrices.length; i++) {
			const m = matrices[i];
			const distance = Vector3.Distance(transformedTranslation, m.getTranslation());

			if (distance < scaledDistance) {
				if (!this._removing) { return; }
				if (i === 0) { continue; }

				matrices.splice(i, 1);
				i--;
			}
		}

		if (this._removing) {
			const buffer = new Float32Array(matrices.length * 16);
			for (let i = 0; i < matrices.length; i++) {
				matrices[i].copyToArray(buffer, i * 16);
			}

			this._selectedMesh.thinInstanceSetBuffer("matrix", buffer, 16, false);
			this._selectedMesh.getLODLevels().forEach((lod) => {
				lod.mesh?.thinInstanceSetBuffer("matrix", buffer, 16, false);
			});

			if (this._selectedMesh.thinInstanceCount === 1) {
				this._selectedMesh.thinInstanceSetBuffer("matrix", null, 16, false);
				this._selectedMesh.getLODLevels().forEach((lod) => {
					lod.mesh?.thinInstanceSetBuffer("matrix", null, 16, false);
				});
			}
			
			return;
		}

		// Scaling
		const randomScaling = this._cloneMesh.scaling.add(new Vector3(
			Math.random() * (this.randomScalingMax.x - this.randomScalingMin.x) + this.randomScalingMin.x,
			Math.random() * (this.randomScalingMax.y - this.randomScalingMin.y) + this.randomScalingMin.y,
			Math.random() * (this.randomScalingMax.z - this.randomScalingMin.z) + this.randomScalingMin.z,
		));

		const scaling = randomScaling.divide(this._selectedMesh.scaling);

		// Compose matrix and add instance
		const matrix = Matrix.Compose(scaling, Quaternion.FromEulerVector(randomRotation), transformedTranslation);

		this._selectedMesh.thinInstanceAdd(matrix, true);
		this._selectedMesh.getLODLevels().forEach((lod) => {
			lod.mesh?.thinInstanceAdd(matrix, true);
		});
	}

	/**
	 * Creates the decal tool and configures its material.
	 */
	private _createDecal(): void {
		const texture = new DynamicTexture("thinInstanceDynamicTexture", 512, this.layerScene.utilityLayerScene, false);
		texture.hasAlpha = true;

		const context = texture.getContext();
		context.beginPath();
		context.fillStyle = "#FF0000";
		context.arc(256, 256, 256, 0, Math.PI * 2);
		context.fill();

		texture.update(true, false);

		const material = new StandardMaterial("thinInstanceDecalMaterial", this.layerScene.utilityLayerScene);
		material.alpha = 0.5;
		material.disableLighting = true;
		material.diffuseTexture = texture;
		material.useAlphaFromDiffuseTexture = true;

		this._decal = new Decal(this.layerScene);
		this._decal.material = material;
	}
}
