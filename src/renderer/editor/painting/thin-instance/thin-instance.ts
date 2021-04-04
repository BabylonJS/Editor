import { Nullable } from "../../../../shared/types";

import {
	Mesh, PointerInfo, PointerEventTypes, Matrix, Vector3, Quaternion,
} from "babylonjs";

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
	 * Defines wether or not painting is done maintaining the mouse pointer down.
	 */
	public holdToPaint: boolean = true;
	/**
	 * Defines the minimum distance that should be checked between existing thin instances to
	 * determine if the current instance can be painted or not.
	 */
	public paintDistance: number = 0;
	
	private _cloneMesh: Nullable<Mesh> = null;
	private _selectedMesh: Nullable<Mesh> = null;

	private _isPointerDown: boolean = false;

	private _rotationMatrix = Matrix.Identity();

	/**
	 * Disposes the painting tool.
	 */
	public dispose(): void {
		super.dispose();
	}

	/**
	 * To be implemeneted.
	 * This function is called on a pointer event is trigerred on the main scene in the editor.
	 * @param info defines the reference to the pointer event informations.
	 */
	protected onPointerEvent(info: PointerInfo): void {
		if (info.type === PointerEventTypes.POINTERDOWN) {
			return this._handlePointerDown();
		}

		if (info.type === PointerEventTypes.POINTERMOVE) {
			return this._handlePointerMove();
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

		this._cloneMesh = null;
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
	private _handlePointerDown(): void {
		this._isPointerDown = true;
	}

	/**
	 * Called on the pointer moves and painting tool is enabled.
	 */
	private _handlePointerMove(): void {
		if (!this._cloneMesh && this._selectedMesh) {
			this._selectedMesh.isPickable = false;

			this._cloneMesh = this._selectedMesh.clone(this._selectedMesh.name, undefined, true, false);
			this._cloneMesh.isPickable = false;
		}

		if (this._cloneMesh) {
			const pick = this.editor.scene!.pick(
				this.editor.scene!.pointerX,
				this.editor.scene!.pointerY,
				undefined,
				false,
				this.editor.scene!.activeCamera,
			);

			if (pick?.pickedPoint) {
				this._cloneMesh.setAbsolutePosition(pick.pickedPoint);
			}

			if (this._isPointerDown && this.holdToPaint) {
				this._paint();
			}
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
	}

	/**
	 * Paints the thin instance at the current position of the cloned mesh.
	 */
	private _paint(): void {
		if (!this._cloneMesh || !this._selectedMesh) {
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
			})
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
		for (const m of matrices) {
			const distance = Vector3.Distance(transformedTranslation, m.getTranslation());

			if (distance < this.paintDistance) {
				return;
			}
		}

		// Compose matrix and add instance
		const matrix = Matrix.Compose(Vector3.One(), Quaternion.FromEulerVector(randomRotation), transformedTranslation);
		
		this._selectedMesh.thinInstanceAdd(matrix, true);
		this._selectedMesh.getLODLevels().forEach((lod) => {
			lod.mesh?.thinInstanceAdd(matrix, true);
		})
	}
}
