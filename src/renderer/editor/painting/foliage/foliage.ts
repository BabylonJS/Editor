import { Nullable } from "../../../../shared/types";

import {
    Mesh, PointerInfo, PointerEventTypes, Matrix, Vector3, Quaternion,
    AbstractMesh, StandardMaterial, DynamicTexture, Epsilon, PickingInfo, TransformNode, Scalar, Ray, GroundMesh, Observer,
} from "babylonjs";

import { Editor } from "../../editor";

import { InspectorNotifier } from "../../gui/inspector/notifier";

import { undoRedo } from "../../tools/undo-redo";
import { IObjectModified } from "../../tools/types";

import { Decal } from "../tools/decal";

import { AbstractPaintingTool } from "../abstract-tool";

const vectorTen = new Vector3(10, 10, 10);

const meshScale = Vector3.Zero();

const absoluteNormal = Vector3.Up();
const absolutePosition = Vector3.Zero();

const targetScaling = Vector3.Zero();
const targetPosition = Vector3.Zero();
const targetRotation = Quaternion.Identity();

// const scaling = Vector3.Zero();
// const position = Vector3.Zero();
// const rotation = Quaternion.Identity();

const translation = Vector3.Zero();
const targetScaledPosition = Vector3.Zero();

export class FoliagePainter extends AbstractPaintingTool {
    /**
     * Defines the count of meshes added as thin instances.
     */
    public density: number = 1;
    /**
     * Defines the minimum distance the painted thin instance should be compared to all other
     * of the current list of active meshes.
     */
    public distance: number = 1;

    /**
     * Defines wether or not painting is done maintaining the mouse pointer down.
     */
    public holdToPaint: boolean = true;

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
     * Defines the scaling factor applied on added thin instances.
     * @default Vector3.One()
     */
    public scalingFactor: Vector3 = Vector3.One();

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


    /** @hidden */
    public _selectedMeshes: Mesh[] = [];

    private _targetMesh: Nullable<AbstractMesh> = null;

    private _decal: Decal;
    private _decalTexture: DynamicTexture;

    private _lastRenderId: number = -1;

    private _removing: boolean = false;
    private _isPointerDown: boolean = false;

    private _pick: Nullable<PickingInfo> = null;
    private _rotationMatrix = Matrix.Identity();

    private _size: number = 1;

    private _tempTransformNode: TransformNode;

    private _editedWorldMatrices: Matrix[] = [];
    private _existingWorldMatrices: Map<Mesh, Matrix[]> = new Map<Mesh, Matrix[]>();

    private _objectModifiedObserver: Nullable<Observer<IObjectModified<any>>>;

    /**
     * Constructor.
     * @param editor the editor reference.
     */
    public constructor(editor: Editor) {
        super(editor);

        this._createDecal();
        this._tempTransformNode = new TransformNode("foliage-transform-node", this.layerScene.utilityLayerScene);

        this._objectModifiedObserver = editor.objectModifiedObservable.add((o) => this._onObjectMofified(o.object));
    }

    /**
     * Gets the minimum distance that should be checked between existing thin instances to
     * determine if the current instance can be painted or not.
     */
    public get size(): number {
        return this._size;
    }

    /**
     * Sets the minimum distance that should be checked between existing thin instances to
     * determine if the current instance can be painted or not.
     */
    public set size(distance: number) {
        this._size = distance;
        this._decal.size.z = distance;
    }

    /**
     * Disposes the painting tool.
     */
    public dispose(): void {
        super.dispose();

        this.editor.objectModifiedObservable.remove(this._objectModifiedObserver);

        this._decal.dispose();
        this._tempTransformNode.dispose();
    }

    /**
     * To be implemeneted.
     * This function is called on a pointer event is trigerred on the main scene in the editor.
     * @param info defines the reference to the pointer event informations.
     */
    protected onPointerEvent(info: PointerInfo): void {
        switch (info.type) {
            case PointerEventTypes.POINTERDOWN: return this._handlePointerDown(info);
            case PointerEventTypes.POINTERMOVE: return this._handlePointerMove();
            case PointerEventTypes.POINTERWHEEL: return this._handlePointerWheel(info);
            case PointerEventTypes.POINTERUP: return this._handlePointerUp();
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
     * @param meshes defines the list of meshes to create thin instances.
     */
    public setMeshes(meshes: Mesh[]): void {
        this._selectedMeshes.forEach((m) => m.isPickable = true);
        this._selectedMeshes = meshes;

        this._existingWorldMatrices.clear();
        this._selectedMeshes.forEach((m) => {
            if (m.metadata?.thinInstanceCount) {
                m.thinInstanceCount = m.metadata.thinInstanceCount;
                delete m.metadata.thinInstanceCount;
            }

            this._existingWorldMatrices.set(m, m.thinInstanceGetWorldMatrices());
        });

        this.editor.graph.refresh();
    }

    /**
     * Called on the pointer is down.
     */
    private _handlePointerDown(info: PointerInfo): void {
        this._isPointerDown = true;
        this._removing = info.event.button === 2;

        this._selectedMeshes.forEach((m) => {
            if (m.metadata?.thinInstanceCount) {
                m.thinInstanceCount = m.metadata.thinInstanceCount;
                delete m.metadata.thinInstanceCount;
            }
        });
    }

    /**
     * Called on the pointer moves and painting tool is enabled.
     */
    private _handlePointerMove(): void {
        const renderId = this.editor.scene!.getRenderId();
        if (renderId === this._lastRenderId) {
            return;
        }

        this._lastRenderId = renderId;
        this._selectedMeshes.forEach((m) => m.isPickable = false);

        if (this._selectedMeshes.length) {
            const x = this.editor.scene!.pointerX;
            const y = this.editor.scene!.pointerY;

            if (this._isPointerDown && this._targetMesh) {
                this._pick = this.editor.scene!.pick(x, y, (m) => m === this._targetMesh, false, this.editor.scene!.activeCamera);
            } else {
                this._pick = this.editor.scene!.pick(x, y, undefined, false, this.editor.scene!.activeCamera);
            }

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

        const distance = Math.max(Epsilon, this._size + delta);
        this.size = distance;
        this._handlePointerMove();

        InspectorNotifier.NotifyChange(this, { caller: this, waitMs: 100 });
    }

    /**
     * Called on the pointer is up and painting tool is enabled.
     */
    private _handlePointerUp(): void {
        this._isPointerDown = false;

        if (!this.holdToPaint && this._pick?.pickedPoint && this._pick.pickedMesh) {
            this._paint();
        }

        this._onPaintEnd();
    }

    /**
     * Paints the thin instance at the current position of the cloned mesh.
     */
    private _paint(): void {
        // Remove
        if (this._removing) {
            return this._selectedMeshes.forEach((m) => {
                this._remove(m, this._pick!.pickedPoint!);
            });
        }

        // Add
        const randomPoint = Vector3.Zero();
        const map = new Map<Mesh, Matrix[]>();
        const center = this._pick!.pickedPoint!.clone();

        for (let d = 0; d < this.density; ++d) {
            randomPoint.set(
                Scalar.RandomRange(center.x - this._size * 0.5, center.x + this._size * 0.5),
                center.y,
                Scalar.RandomRange(center.z - this._size * 0.5, center.z + this._size * 0.5),
            );

            this._add(randomPoint, map);
        }

        map.forEach((matrices, mesh) => {
            this._editedWorldMatrices.push.apply(this._editedWorldMatrices, matrices);

            const m = this._existingWorldMatrices.get(mesh)!;
            m.push.apply(m, matrices);

            this._configureMeshMatrices(mesh, m);
        });
    }

    private _add(center: Vector3, map: Map<Mesh, Matrix[]>): unknown {
        const mesh = this._selectedMeshes[(this._selectedMeshes.length * Math.random()) >> 0];

        // Random pick
        if (this._targetMesh!.getClassName() === "GroundMesh") {
            const ground = this._targetMesh as GroundMesh;
            ground._maxX = ground._width * 0.5;
            ground._maxZ = ground._height * 0.5;

            absoluteNormal.copyFrom(ground.getNormalAtCoordinates(center.x, center.z));
            absolutePosition.set(center.x, ground.getHeightAtCoordinates(center.x, center.z), center.z);
        } else {
            const ray = Ray.CreateNewFromTo(this.editor.scene!.activeCamera!.globalPosition, center);
            ray.direction.multiplyInPlace(vectorTen);

            this._pick = this.editor.scene!.pickWithRay(ray, (m) => m === this._targetMesh, false);
            if (!this._pick?.pickedPoint) {
                return;
            }

            absolutePosition.copyFrom(this._pick!.pickedPoint);

            // Absolute normal
            const normal = this._pick.getNormal(true, true);
            if (!normal) {
                return;
            }

            absoluteNormal.copyFrom(normal);
        }

        if (!map.get(mesh)) {
            map.set(mesh, []);
        }

        const existingWorldMatrices = this._existingWorldMatrices.get(mesh)!;

        if (!mesh.thinInstanceCount) {
            mesh.setAbsolutePosition(absolutePosition);
            mesh.thinInstanceAddSelf(false);

            const matrix = mesh.thinInstanceGetWorldMatrices()[0];

            existingWorldMatrices.push(matrix);
            return map.get(mesh)!.push(matrix);
        }

        // Compose matrix
        const targetMatrix = this._getFinalMatrix(mesh, absolutePosition, absoluteNormal);
        targetMatrix.decompose(targetScaling, targetRotation, targetPosition);

        // Search in existing meshes
        const found = this._selectedMeshes.find((m) => {
            const matrices = this._existingWorldMatrices.get(m)!;

            for (let len = matrices.length, i = len - 1; i >= 0; --i) {
                const matrix = matrices[i];

                matrix.getTranslationToRef(translation);
                targetScaledPosition.copyFrom(targetPosition);

                if (Vector3.Distance(targetScaledPosition.multiplyInPlace(mesh.scaling), translation.multiplyInPlace(mesh.scaling)) < this.distance) {
                    return m;
                }
            }
        });

        if (found) {
            return;
        }

        map.get(mesh)!.push(targetMatrix);
        existingWorldMatrices.push(targetMatrix);
    }

    private _remove(mesh: Mesh, absolutePosition: Vector3): void {
        const targetMatrix = this._getFinalMatrix(mesh, absolutePosition, Vector3.Up());
        targetMatrix.decompose(targetScaling, targetRotation, targetPosition);

        const radius = this._size * 0.5;

        this._selectedMeshes.forEach((m) => {
            if (!m.thinInstanceCount) {
                return;
            }

            const matrices = this._existingWorldMatrices.get(m)!;

            for (let i = 0, len = matrices.length; i < len; ++i) {
                const matrix = matrices[i];

                matrix.getTranslationToRef(translation)
                targetScaledPosition.copyFrom(targetPosition);

                if (Vector3.Distance(targetScaledPosition.multiplyInPlace(mesh.scaling), translation.multiplyInPlace(mesh.scaling)) < radius) {
                    matrices.splice(i, 1);
                    this._editedWorldMatrices.push(matrices[i]);

                    --i;
                    --len;
                }
            }

            this._configureMeshMatrices(m, matrices);
        });
    }

    private _getFinalMatrix(mesh: Mesh, absolutePosition: Vector3, absoluteNormal: Vector3): Matrix {
        this._tempTransformNode.lookAt(absoluteNormal, 0, Math.PI * 0.5, 0);
        this._tempTransformNode.computeWorldMatrix(true);

        const sourceAbsolutePosition = mesh.getAbsolutePosition();
        const sourceAbsoluteRotation = mesh.absoluteRotationQuaternion;

        const absoluteRotation = this._tempTransformNode.absoluteRotationQuaternion;

        // Rotation
        const randomRotation = Quaternion.FromEulerAngles(
            Math.random() * ((this.randomRotationMax.x - this.randomRotationMin.x) + this.randomRotationMin.x),
            Math.random() * ((this.randomRotationMax.y - this.randomRotationMin.y) + this.randomRotationMin.y),
            Math.random() * ((this.randomRotationMax.z - this.randomRotationMin.z) + this.randomRotationMin.z),
        );

        const rotation = Quaternion.Inverse(sourceAbsoluteRotation).multiply(absoluteRotation).multiply(randomRotation);

        sourceAbsoluteRotation.toRotationMatrix(this._rotationMatrix);

        mesh.getWorldMatrix().decompose(meshScale);

        // Translation
        const translation = absolutePosition.subtract(sourceAbsolutePosition).divide(meshScale);
        const transformedTranslation = Vector3.TransformCoordinates(translation, this._rotationMatrix.invert());

        // Scaling
        const randomScalingValue = Math.random() * (this.randomScalingMax - this.randomScalingMin) + this.randomScalingMin;

        const randomScaling = meshScale.add(new Vector3(
            randomScalingValue * mesh.scaling.x,
            randomScalingValue * mesh.scaling.y,
            randomScalingValue * mesh.scaling.z,
        )).multiplyInPlace(this.scalingFactor);

        const scaling = randomScaling.divide(meshScale);

        return Matrix.Compose(scaling, rotation, transformedTranslation);
    }

    /**
     * Called on the user stopped painting.
     */
    private _onPaintEnd(): void {
        if (!this._editedWorldMatrices.length) {
            return;
        }

        const removed = this._removing;
        const selectedMeshes = this._selectedMeshes.slice(0);
        const editedWorldMatrices = this._editedWorldMatrices.slice(0);
        const worldMatrices = selectedMeshes.map((sm) => sm.thinInstanceGetWorldMatrices().slice(0));

        undoRedo.push({
            common: () => {
                selectedMeshes.forEach((sm) => {
                    sm.refreshBoundingInfo(true, true);
                    sm.thinInstanceRefreshBoundingInfo(true, true, true);
                });

                this.editor.graph.refresh();
            },
            undo: () => {
                selectedMeshes.forEach((sm, i) => {
                    const matrices = !removed
                        ? worldMatrices[i].slice(0)
                        : worldMatrices[i].concat(editedWorldMatrices);

                    if (!removed) {
                        editedWorldMatrices.forEach((m) => {
                            const index = matrices.findIndex((m2) => m.equals(m2));
                            if (index !== -1) {
                                matrices.splice(index, 1);
                            }
                        });
                    }

                    const array = this._getArrayFromMatrices(matrices);

                    sm.thinInstanceSetBuffer("matrix", array);
                    sm.getLODLevels().forEach((lod) => {
                        lod.mesh?.thinInstanceSetBuffer("matrix", array);
                    });
                });
            },
            redo: () => {
                selectedMeshes.forEach((sm, i) => {
                    const array = this._getArrayFromMatrices(worldMatrices[i]);

                    sm.thinInstanceSetBuffer("matrix", array);
                    sm.getLODLevels().forEach((lod) => {
                        lod.mesh?.thinInstanceSetBuffer("matrix", array);
                    });
                });
            },
        });

        this._editedWorldMatrices.splice(0);
    }

    /**
     * Transforms the given matrices array to a float32 array.
     */
    private _getArrayFromMatrices(matrices: Matrix[]): Nullable<Float32Array> {
        if (!matrices.length) {
            return null;
        }

        const array = new Float32Array(matrices.length * 16);
        matrices.forEach((m, i) => m.copyToArray(array, i * 16));

        return array;
    }

    private _configureMeshMatrices(mesh: Mesh, matrices: Matrix[]): void {
        const array = this._getArrayFromMatrices(matrices);
        mesh.thinInstanceSetBuffer("matrix", array, 16, true);
    }

    /**
     * Creates the decal tool and configures its material.
     */
    private _createDecal(): void {
        this._decalTexture = new DynamicTexture("thinInstanceDynamicTexture", 512, this.layerScene.utilityLayerScene, false);
        this._decalTexture.hasAlpha = true;

        this._updateDecalTexture();

        const material = new StandardMaterial("thinInstanceDecalMaterial", this.layerScene.utilityLayerScene);
        material.alpha = 0.5;
        material.disableLighting = true;
        material.useAlphaFromDiffuseTexture = true;
        material.diffuseTexture = this._decalTexture;

        this._decal = new Decal(this.layerScene);
        this._decal.material = material;
    }

    private _updateDecalTexture(): void {
        const context = this._decalTexture.getContext();
        context.clearRect(0, 0, 512, 512);

        context.fillStyle = "#FF0000";
        context.beginPath();
        context.moveTo(0, 0);
        context.arc(256, 256, 256, 0, Math.PI * 2);
        context.closePath();
        context.fill();

        this._decalTexture.update(true, true);
    }

    /**
     * Called on an object has been modified and its modification has been notified.
     * Updates the current matrices array of the mesh in case it is part of the selected meshes.
     */
    private _onObjectMofified(o: any): void {
        if (!(o instanceof Mesh)) {
            return;
        }

        const index = this._selectedMeshes.indexOf(o);
        if (index === -1) {
            return;
        }

        this._existingWorldMatrices.set(o, o.thinInstanceGetWorldMatrices());
    }

    /**
     * Serializes the painting tool.
     */
    public serialize(): any {
        return {
            radius: this._size,
            density: this.density,
            distance: this.distance,
            holdToPaint: this.holdToPaint,
            randomScalingMin: this.randomScalingMin,
            randomScalingMax: this.randomScalingMax,
            meshIds: this._selectedMeshes.map((m) => m.id),
            scalingFactor: this.scalingFactor.asArray(),
            randomRotationMin: this.randomRotationMin.asArray(),
            randomRotationMax: this.randomRotationMax.asArray(),
        };
    }

    /**
     * Parses the painting tool taking the given configuration.
     */
    public parse(config: any): void {
        if (config.meshIds) {
            const meshes = config.meshIds.map((mid) => this.editor.scene!.getMeshById(mid)).filter((m) => m);
            this.setMeshes(meshes);
        }

        this.density = config.density;
        this.distance = config.distance;
        this.size = config.radius;
        this.holdToPaint = config.holdToPaint;
        this.randomScalingMax = config.randomScalingMax;
        this.randomScalingMin = config.randomScalingMin;
        this.scalingFactor = Vector3.FromArray(config.scalingFactor);
        this.randomRotationMin = Vector3.FromArray(config.randomRotationMin);
        this.randomRotationMax = Vector3.FromArray(config.randomRotationMax);
    }
}
