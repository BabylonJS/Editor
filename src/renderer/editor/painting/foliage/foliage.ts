import { Nullable } from "../../../../shared/types";

import {
    Mesh, PointerInfo, PointerEventTypes, Matrix, Vector3, Quaternion,
    AbstractMesh, StandardMaterial, DynamicTexture, Epsilon, PickingInfo, TransformNode, Scalar, Ray,
} from "babylonjs";

import { Editor } from "../../editor";

import { InspectorNotifier } from "../../gui/inspector/notifier";

import { Decal } from "../tools/decal";
import { AbstractPaintingTool } from "../abstract-tool";

export class FoliagePainter extends AbstractPaintingTool {
    /**
     * Defines wether or not painting is done maintaining the mouse pointer down.
     */
    public holdToPaint: boolean = true;

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
    public randomScalingMin: number = 0;
    /**
     * Defines the reference to the vector applied for the random scaling
     * as maximum values for X, Y and Z.
     */
    public randomScalingMax: number = 0;

    /**
     * @hidden
     */
    public _selectedMeshes: Mesh[] = [];

    private _targetMesh: Nullable<AbstractMesh> = null;

    private _decal: Decal;

    private _removing: boolean = false;
    private _isPointerDown: boolean = false;

    private _pick: Nullable<PickingInfo> = null;

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
        this._decal.size.z = distance;
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
            return this._handlePointerUp();
        }
    }

    /**
     * Called on the Control key (or Command key) is released. This is the where
     * the painting tool should be removed here.
     */
    protected onControlKeyReleased(): void {
        this._isPointerDown = false;

        this._decal.disposeMesh();
        this._selectedMeshes.forEach((m) => m.isPickable = true);

        this._targetMesh = null;
    }

    /**
     * Sets the list of all active meshes.
     * @param mesh defines the reference to the mesh to create thin instances.
     */
    public setMeshes(meshes: Mesh[]): void {
        this._selectedMeshes.forEach((m) => m.isPickable = true);
        this._selectedMeshes = meshes;
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
        this._selectedMeshes.forEach((m) => m.isPickable = false);

        if (this._selectedMeshes.length) {
            this._pick = this.editor.scene!.pick(
                this.editor.scene!.pointerX,
                this.editor.scene!.pointerY,
                undefined,
                false,
                this.editor.scene!.activeCamera,
            );

            if (this._pick) {
                if (this._pick.pickedMesh) {
                    this._targetMesh ??= this._pick.pickedMesh;
                    if (this._isPointerDown && this._pick.pickedMesh !== this._targetMesh) {
                        return;
                    }
                }

                this._decal.updateDecal(this._pick);

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

        const distance = Math.max(Epsilon, this._paintDistance + delta);
        this.paintDistance = distance;
        this._handlePointerMove();

        InspectorNotifier.NotifyChange(this, { caller: this, waitMs: 100 });
    }

    /**
     * Called on the pointer is up and painting tool is enabled.
     */
    private _handlePointerUp(): void {
        this._isPointerDown = false;

        if (!this.holdToPaint && this._pick?.pickedPoint) {
            this._paint();
        }
    }

    /**
     * Paints the thin instance at the current position of the cloned mesh.
     */
    private _paint(): void {
        if (!this._selectedMeshes.length || !this._pick?.pickedPoint) {
            return;
        }

        this._selectedMeshes.forEach((m) => {
            const size = this._decal.size;
            const center = this._decal._mesh?.getAbsolutePosition();
            if (!center) {
                return;
            }

            if (this._removing) {
                return this._createThinInstance(m, center);
            }

            const randomPoint = new Vector3(
                Scalar.RandomRange(center.x - size.z * 0.5, center.x + size.z * 0.5),
                center.y,
                Scalar.RandomRange(center.z - size.z * 0.5, center.z + size.z * 0.5),
            );

            const ray = Ray.CreateNewFromTo(this.editor.scene!.activeCamera!.globalPosition, randomPoint);
            this._pick = this.editor.scene!.pickWithRay(ray, (m) => m === this._targetMesh, false);
            if (!this._pick?.pickedPoint) {
                return;
            }

            this._createThinInstance(m, this._pick.pickedPoint);
        });
    }

    /**
     * Creates a thin instance for the given mesh at the current picked point.
     */
    private _createThinInstance(mesh: Mesh, absolutePosition: Vector3): void {
        // Absolute rotation
        if (!this._pick?.pickedPoint) {
            return;
        }

        // Get absolute rotation
        const normal = this._pick.getNormal(true, true);
        if (!normal) {
            return;
        }

        const tn = new TransformNode("empty", this.layerScene.utilityLayerScene);
        tn.lookAt(normal, 0, Math.PI * 0.5, 0);
        tn.computeWorldMatrix();
        const absoluteRotation = tn.absoluteRotationQuaternion;
        tn.dispose();

        const sourceAbsolutePosition = mesh.getAbsolutePosition();

        // Configure mesh to use thin instance
        if (!mesh.thinInstanceCount) {
            mesh.thinInstanceAddSelf(true);
            mesh.getLODLevels().forEach((lod) => {
                lod.mesh?.thinInstanceAddSelf(true);
            });
        }

        // Get rotation
        const randomRotation = Quaternion.FromEulerAngles(
            Math.random() * ((this.randomRotationMax.x - this.randomRotationMin.x) + this.randomRotationMin.x),
            Math.random() * ((this.randomRotationMax.y - this.randomRotationMin.y) + this.randomRotationMin.y),
            Math.random() * ((this.randomRotationMax.z - this.randomRotationMin.z) + this.randomRotationMin.z),
        );

        const sourceAbsoluteRotation = mesh.absoluteRotationQuaternion;
        const rotation = Quaternion.Inverse(sourceAbsoluteRotation).multiply(absoluteRotation).multiply(randomRotation);

        sourceAbsoluteRotation.toRotationMatrix(this._rotationMatrix);

        // Transform translation
        const translation = absolutePosition.subtract(sourceAbsolutePosition).divide(mesh.scaling);
        const transformedTranslation = Vector3.TransformCoordinates(translation, this._rotationMatrix.invert());

        // Search for existing thin instance under the set distance
        const matrices = mesh.thinInstanceGetWorldMatrices();

        for (let i = 0; i < matrices.length; i++) {
            const matrix = matrices[i];
            const distance = Vector3.Distance(
                matrix.getTranslation().multiply(mesh.scaling),
                transformedTranslation.multiply(mesh.scaling),
            );

            if (distance < this._paintDistance * 0.5) {
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

            mesh.thinInstanceSetBuffer("matrix", buffer, 16, false);
            mesh.getLODLevels().forEach((lod) => {
                lod.mesh?.thinInstanceSetBuffer("matrix", buffer, 16, false);
            });

            if (mesh.thinInstanceCount === 1) {
                mesh.thinInstanceSetBuffer("matrix", null, 16, false);
                mesh.getLODLevels().forEach((lod) => {
                    lod.mesh?.thinInstanceSetBuffer("matrix", null, 16, false);
                });
            }

            return;
        }

        // Scaling
        const randomScaling = mesh.scaling.add(new Vector3(
            Math.random() * (this.randomScalingMax - this.randomScalingMin) + this.randomScalingMin,
            Math.random() * (this.randomScalingMax - this.randomScalingMin) + this.randomScalingMin,
            Math.random() * (this.randomScalingMax - this.randomScalingMin) + this.randomScalingMin,
        ));

        const scaling = randomScaling.divide(mesh.scaling);

        // Compose matrix and add instance
        const matrix = Matrix.Compose(scaling, rotation, transformedTranslation);

        mesh.thinInstanceAdd(matrix, true);
        mesh.getLODLevels().forEach((lod) => {
            lod.mesh?.thinInstanceAdd(matrix, true);
        });

        // Refresh bounding info.
        if (mesh.thinInstanceCount) {
            mesh.thinInstanceRefreshBoundingInfo(true);
        }
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

    /**
     * Serializes the painting tool.
     */
    public serialize(): any {
        return {
            meshIds: this._selectedMeshes.map((m) => m.id),
            randomRotationMin: this.randomRotationMin.asArray(),
            randomRotationMax: this.randomRotationMax.asArray(),
            randomScalingMin: this.randomScalingMin,
            randomScalingMax: this.randomScalingMax,
            holdToPaint: this.holdToPaint,
            paintDistance: this.paintDistance,
        }
    }

    /**
     * Parses the painting tool taking the given configuration.
     */
    public parse(config: any): void {
        if (config.meshIds) {
            const meshes = config.meshIds.map((mid) => this.editor.scene!.getMeshByID(mid)).filter((m) => m);
            this.setMeshes(meshes);
        }

        this.randomRotationMin = Vector3.FromArray(config.randomRotationMin);
        this.randomRotationMax = Vector3.FromArray(config.randomRotationMax);
        this.randomScalingMin = config.randomScalingMin;
        this.randomScalingMax = config.randomScalingMax;
        this.holdToPaint = config.holdToPaint;
        this.paintDistance = config.paintDistance;
    }
}
