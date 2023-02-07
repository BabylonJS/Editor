import { basename, dirname, join } from "path";

import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, Tree } from "@blueprintjs/core";

import {
    Mesh, InstancedMesh, RenderingManager, Vector3, Quaternion, PhysicsImpostor, GroundMesh,
    MeshLODLevel, SceneLoader, Material, Tools as BabylonTools, VertexData, AbstractMesh, SubMesh,
} from "babylonjs";

import { Inspector } from "../../inspector";

import { Icon } from "../../../gui/icon";
import { Alert } from "../../../gui/alert";

import { InspectorList } from "../../../gui/inspector/fields/list";
import { InspectorNotifier } from "../../../gui/inspector/notifier";
import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorButton } from "../../../gui/inspector/fields/button";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorBoolean } from "../../../gui/inspector/fields/boolean";
import { InspectorVector3 } from "../../../gui/inspector/fields/vector3";

import { Workers } from "../../../workers/workers";
import AssetsWorker from "../../../workers/workers/assets";
import { AssetsBrowserItemHandler } from "../../assets-browser/files/item-handler";

import { Tools } from "../../../tools/tools";
import { AppTools } from "../../../tools/app";
import { undoRedo } from "../../../tools/undo-redo";

import { INodeInspectorState, NodeInspector } from "../node-inspector";

export class MeshInspector extends NodeInspector<Mesh | InstancedMesh | GroundMesh, INodeInspectorState> {
    private static _BillboardModes: string[] = [
        "BILLBOARDMODE_NONE", "BILLBOARDMODE_X", "BILLBOARDMODE_Y",
        "BILLBOARDMODE_Z", "BILLBOARDMODE_ALL", "BILLBOARDMODE_USE_POSITION"
    ];

    private static _PhysicsImpostors: string[] = [
        "NoImpostor", "SphereImpostor", "BoxImpostor",
        "CylinderImpostor", "CapsuleImpostor",
        // "HeightmapImpostor", "MeshImpostor",
    ];

    private _physicsImpostor: string = "";
    private _renderingGroupId: string = "";

    private _rotation: Vector3 = Vector3.Zero();

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        super.componentDidMount?.();

        InspectorNotifier.Register(this, () => this.selectedObject.rotation, () => {
            InspectorNotifier.NotifyChange(this._getRotationVector());
        });

        InspectorNotifier.Register(this, () => this.selectedObject.rotationQuaternion, () => {
            InspectorNotifier.NotifyChange(this._getRotationVector());
        });
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount?.();

        InspectorNotifier.Unregister(this);
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        // Distance
        this.selectedObject.infiniteDistance ??= false;

        // Physics
        if (this.selectedObject.physicsImpostor) {
            this._physicsImpostor = MeshInspector._PhysicsImpostors.find((i) => this.selectedObject.physicsImpostor!.type === PhysicsImpostor[i]) ?? MeshInspector._PhysicsImpostors[0];
        } else {
            this._physicsImpostor = MeshInspector._PhysicsImpostors[0];
        }

        const meshSceneFilePath = this.selectedObject.metadata?.originalSourceFile?.sceneFileName ?? null;

        const assetLink = this.selectedObject instanceof InstancedMesh ? (
            <InspectorButton label="Go To Source Mesh" small icon="link" onClick={() => this.editor.selectedNodeObservable.notifyObservers((this.selectedObject as InstancedMesh).sourceMesh)} />
        ) : (
            <InspectorButton label="Show In Assets Browser" small icon="link" disabled={meshSceneFilePath === null} onClick={() => this.editor.assetsBrowser.revealPanelAndShowFile(meshSceneFilePath)} />
        );

        return (
            <>
                {super.renderContent()}

                <InspectorSection title="Transforms">
                    <InspectorVector3 object={this.selectedObject} property="position" label="Position" step={0.01} />
                    {this._getRotationInspector()}
                    <InspectorVector3 object={this.selectedObject} property="scaling" label="Scaling" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Mesh">
                    <InspectorBoolean object={this.selectedObject} property="isVisible" label="Visible" />
                    <InspectorBoolean object={this.selectedObject} property="isPickable" label="Pickable" />

                    {assetLink}
                </InspectorSection>

                {this._getRenderingInspector()}

                {this._getCollisionsInspector()}

                <InspectorSection title="Physics">
                    <InspectorList object={this} property="_physicsImpostor" label="Impostor Type" items={MeshInspector._PhysicsImpostors.map((pi) => ({ label: pi, data: pi }))} onChange={() => {
                        this._handlePhysicsImpostorChanged();
                    }} />
                    {this._getPhysicsInspector()}
                </InspectorSection>

                {this._getSkeletonInspector()}
                {this._getMorphTargetsInspector()}
                {this._getGeometryBuilderInspector()}
                {this._getGeometryInspector()}
                {this._getLodsInspector()}
                {this.getAnimationRangeInspector()}
                {this.getAnimationsGroupInspector()}
            </>
        );
    }

    /**
     * Returns the rendering inspector that handles both mesh and instanced mesh.
     */
    private _getRenderingInspector(): React.ReactNode {
        // Rendering groups
        this.selectedObject.metadata ??= {};
        this.selectedObject.metadata.renderingGroupId ??= this.selectedObject.renderingGroupId;

        const renderingGroupIds: string[] = [];
        for (let i = RenderingManager.MIN_RENDERINGGROUPS; i <= RenderingManager.MAX_RENDERINGGROUPS; i++) {
            renderingGroupIds.push(i.toString());
        }

        this._renderingGroupId = this.selectedObject.renderingGroupId.toString();

        if (this.selectedObject instanceof Mesh) {
            return (
                <InspectorSection title="Rendering">
                    <InspectorBoolean object={this.selectedObject} property="receiveShadows" label="Receive Shadows" defaultValue={false} />
                    <InspectorBoolean object={this.selectedObject} property="applyFog" label="Apply Fog" />
                    <InspectorBoolean object={this.selectedObject} property="infiniteDistance" label="Infinite Distance" defaultValue={false} />
                    <InspectorNumber object={this.selectedObject} property="visibility" label="Visibility" min={0} max={1} step={0.01} />
                    <InspectorList object={this.selectedObject} property="material" label="Material" items={() => this.getMaterialsList()} dndHandledTypes={["asset/material"]} onChange={(v) => {
                        const lods = (this.selectedObject as Mesh).getLODLevels();
                        lods?.forEach((lod) => lod.mesh && (lod.mesh.material = v as Material));
                    }} />
                    <InspectorList object={this.selectedObject} property="billboardMode" label="Billboard" items={MeshInspector._BillboardModes.map((bm) => ({ label: bm, data: Mesh[bm] }))} />
                    <InspectorList object={this} property="_renderingGroupId" label="Rendering Group" items={renderingGroupIds.map((rgid) => ({ label: rgid, data: rgid }))} onChange={() => {
                        this.selectedObject.metadata.renderingGroupId = parseInt(this._renderingGroupId);
                    }} />
                </InspectorSection>
            );
        }

        return (
            <InspectorSection title="Rendering">
                <InspectorList object={this.selectedObject} property="billboardMode" label="Billboard" items={MeshInspector._BillboardModes.map((bm) => ({ label: bm, data: Mesh[bm] }))} />
                <InspectorList object={this} property="_renderingGroupId" label="Rendering Group" items={renderingGroupIds.map((rgid) => ({ label: rgid, data: rgid }))} onChange={() => {
                    this.selectedObject.metadata.renderingGroupId = parseInt(this._renderingGroupId);
                }} />
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to edit the collisions properties of the mesh.
     */
    private _getCollisionsInspector(): React.ReactNode {
        return (
            <InspectorSection title="Collisions">
                <InspectorBoolean object={this.selectedObject} property="checkCollisions" label="Check Collisions" defaultValue={false} onFinishChange={() => {
                    this.forceUpdate();
                }} />

                <InspectorButton label="Edit Advanced Collisions..." small={true} onClick={() => {
                    if (this.editor.plugins.Collisions) {
                        this.editor.plugins.Collisions["setMesh"](this.selectedObject);
                    }

                    this.editor.addBuiltInPlugin("collisions", { mesh: this.selectedObject });
                }} />

                <InspectorNumber object={this.selectedObject} property="collisionMask" label="Mask" step={1} />
                <InspectorVector3 object={this.selectedObject} property="ellipsoid" label="Ellipsoid" step={0.01} />
                <InspectorVector3 object={this.selectedObject} property="ellipsoidOffset" label="Ellipsoid Offset" step={0.01} />
            </InspectorSection>
        );
    }

    /**
     * Returns the rotation inspector that handles both vector 3d and quaternion.
     */
    private _getRotationInspector(): React.ReactNode {
        this._getRotationVector();

        const rotationCopy = this._rotation.clone();

        return <InspectorVector3 object={this} property="_rotation" label={`Rotation (Degrees) ${this.selectedObject.rotationQuaternion ? "(Quaternion)" : ""}`} step={0.01} noUndoRedo onChange={() => {
            this._applyRotationVector(this._rotation);
        }} onFinishChange={() => {
            const oldRotation = rotationCopy.clone();
            const newRotation = this._rotation.clone();

            rotationCopy.copyFrom(this._rotation);

            if (oldRotation.equalsWithEpsilon(newRotation)) {
                return;
            }

            undoRedo.push({
                description: `Changed rotation of mesh "${this.selectedObject.name}" from "${oldRotation.toString()}" to "${newRotation.toString()}"`,
                common: () => {
                    InspectorNotifier.NotifyChange(this.selectedObject.rotation);
                    InspectorNotifier.NotifyChange(this.selectedObject.rotationQuaternion);
                },
                undo: () => {
                    this._applyRotationVector(oldRotation);
                },
                redo: () => {
                    this._applyRotationVector(newRotation);
                },
            });
        }} />
    }

    /**
     * Applies the rotation vector on the mesh handling both vector and quaternion.
     */
    private _applyRotationVector(rotationVector: Vector3): void {
        const rotationRadians = this._getRotationRadians(rotationVector.clone());

        if (this.selectedObject.rotationQuaternion) {
            this.selectedObject.rotationQuaternion.copyFrom(Quaternion.FromEulerVector(rotationRadians));
        } else {
            this.selectedObject.rotation.copyFrom(rotationRadians);
        }
    }

    /**
     * Updates the rotation vector.
     */
    private _getRotationVector(): Vector3 {
        if (this.selectedObject.rotationQuaternion) {
            this._rotation.copyFrom(this.selectedObject.rotationQuaternion.toEulerAngles());
        } else {
            this._rotation.copyFrom(this.selectedObject.rotation);
        }

        return this._getRotationDegrees(this._rotation);
    }

    /**
     * Converts the given vector3 from radians to degrees.
     */
    private _getRotationDegrees(rot: Vector3): Vector3 {
        rot.x = BabylonTools.ToDegrees(rot.x);
        rot.y = BabylonTools.ToDegrees(rot.y);
        rot.z = BabylonTools.ToDegrees(rot.z);

        return rot;
    }

    /**
     * Converts the given vector3 from degrees to radians.
     */
    private _getRotationRadians(rot: Vector3): Vector3 {
        rot.x = BabylonTools.ToRadians(rot.x);
        rot.y = BabylonTools.ToRadians(rot.y);
        rot.z = BabylonTools.ToRadians(rot.z);

        return rot;
    }

    /**
     * Returns the physics inspector used to edit physics properties.
     */
    private _getPhysicsInspector(): React.ReactNode {
        if (!this.selectedObject.physicsImpostor || this.selectedObject.physicsImpostor.type === PhysicsImpostor.NoImpostor) {
            return undefined;
        }

        const onPropertyChanged = (param: string, value: number) => {
            this.selectedObject.physicsImpostor!["_bodyUpdateRequired"] = false;
            this.selectedObject.physicsImpostor!.setParam(param, value);
        };

        return (
            <InspectorSection title="Properties">
                <InspectorNumber object={this.selectedObject.physicsImpostor} property="mass" label="Mass" min={0} step={0.01} onChange={() => onPropertyChanged("mass", this.selectedObject.physicsImpostor!.mass)} />
                <InspectorNumber object={this.selectedObject.physicsImpostor} property="restitution" label="Restitution" min={0} step={0.01} onChange={() => onPropertyChanged("restitution", this.selectedObject.physicsImpostor!.restitution)} />
                <InspectorNumber object={this.selectedObject.physicsImpostor} property="friction" label="Friction" min={0} step={0.01} onChange={() => onPropertyChanged("friction", this.selectedObject.physicsImpostor!.friction)} />
            </InspectorSection>
        );
    }

    /**
     * Called on the physics impostor changed.
     */
    private _handlePhysicsImpostorChanged(): void {
        // Changed?
        if (this.selectedObject.physicsImpostor?.type === PhysicsImpostor[this._physicsImpostor]) {
            return;
        }

        try {
            this.selectedObject.physicsImpostor = new PhysicsImpostor(this.selectedObject, PhysicsImpostor[this._physicsImpostor], {
                mass: 1,
            });

            if (this.selectedObject.parent) {
                this.selectedObject.physicsImpostor.forceUpdate();
            }

            this.selectedObject.physicsImpostor.sleep();
        } catch (e) {
            // Catch silently   
        }

        this.forceUpdate();
    }

    /**
     * Returns the skeleton inspector used to edit the skeleton's properties.
     */
    private _getSkeletonInspector(): React.ReactNode {
        if (!this.selectedObject.skeleton) {
            return undefined;
        }

        this.selectedObject.skeleton.needInitialSkinMatrix ??= false;

        return (
            <InspectorSection title="Skeleton">
                <InspectorBoolean object={this.selectedObject.skeleton} property="needInitialSkinMatrix" label="Need Initial Skin Matrix" />
                <InspectorBoolean object={this.selectedObject.skeleton} property="useTextureToStoreBoneMatrices" label="Use Texture To Store Bone Matrices" />
                <InspectorNumber object={this.selectedObject} property="numBoneInfluencers" label="Num Bone Influencers" min={0} max={8} step={1} onChange={() => {
                    this.selectedObject.numBoneInfluencers = this.selectedObject.numBoneInfluencers >> 0;
                }} />

                {this._getSkeletonAnimationRangesInspector()}
            </InspectorSection>
        );
    }

    /**
     * Returns the skeleton animation ranges inspector used to play the animations.
     */
    private _getSkeletonAnimationRangesInspector(): React.ReactNode {
        const ranges = this.selectedObject.skeleton?.getAnimationRanges();
        if (!ranges?.length) {
            return undefined;
        }

        const buttons = ranges.filter((r) => r?.name).map((r) => (
            <InspectorButton label={r!.name} onClick={() => {
                this.selectedObject._scene.stopAnimation(this.selectedObject.skeleton);
                this.selectedObject.skeleton?.beginAnimation(r!.name, true, 1.0);
            }} />
        ));

        return (
            <InspectorSection title="Animation Ranges">
                {buttons}
            </InspectorSection>
        );
    }

    /**
     * Returns the morph targets inspector to preview and modify morph targets manager.
     */
    private _getMorphTargetsInspector(): React.ReactNode {
        if (this.selectedObject instanceof InstancedMesh || !this.selectedObject.morphTargetManager) {
            return undefined;
        }

        const sliders: React.ReactNode[] = [];
        for (let i = 0; i < this.selectedObject.morphTargetManager.numTargets; i++) {
            const target = this.selectedObject.morphTargetManager.getTarget(i);
            target.name ??= `morphTarget${i}`;
            target.id ??= Tools.RandomId();

            sliders.push(
                <InspectorNumber object={target} property="influence" min={0} max={1} step={0.01} label={target.name} />
            );
        }

        return (
            <InspectorSection title="Morph Targets">
                {sliders}
            </InspectorSection>
        );
    }

    /**
     * Returns the geometry inspector used to manipulate geometry of the mesh.
     */
    private _getGeometryInspector(): React.ReactNode {
        if (!(this.selectedObject instanceof Mesh)) {
            return;
        }

        return (
            <InspectorSection title="Geometry">
                <InspectorButton label="Update Geometry" small onClick={() => this._handleUpdateGeometry()} />
            </InspectorSection>
        );
    }

    private async _handleUpdateGeometry(): Promise<void> {
        const file = await AppTools.ShowOpenFileDialog("Select source mesh");

        let mesh: Nullable<AbstractMesh> = null;

        try {
            const meshName = basename(file);
            const rootUrl = join(dirname(file), "/");
            const result = await SceneLoader.ImportMeshAsync("", rootUrl, meshName, this.editor.scene!);

            // Clean load result
            result.skeletons.forEach((s) => s.dispose());
            result.particleSystems.forEach((ps) => ps.dispose(true));
            result.meshes.forEach((m) => m.material && m.material.dispose(true, true));
            result.lights.forEach((l) => l.dispose(true, true));
            result.transformNodes.forEach((t) => t.dispose(true, true));
            result.animationGroups.forEach((a) => a.dispose());

            // Set mesh to use
            mesh = result.meshes[0];
            if (result.meshes.length > 1) {
                mesh = (await this._showLodSelector(result.meshes))!;
            }

            this._clearLodTempResult(result.meshes, mesh);

            if (mesh && mesh instanceof Mesh && mesh.geometry && this.selectedObject instanceof Mesh) {
                this.selectedObject.subMeshes.forEach((sm) => sm.dispose());
                this.selectedObject.subMeshes = [];

                mesh.geometry.applyToMesh(this.selectedObject as Mesh);
                mesh.subMeshes.forEach((sm) => {
                    new SubMesh(sm.materialIndex, sm.verticesStart, sm.verticesCount, sm.indexStart, sm.indexCount, this.selectedObject, this.selectedObject as Mesh, true, true);
                });
            }

        } catch (e) {
            // Catch silently.    
        }

        mesh?.dispose(true, true);

        this.forceUpdate();
        this.editor.graph.refresh();
    }

    /**
     * Returns the geometry builder inspector used to configure basic meshes geometry.
     */
    private _getGeometryBuilderInspector(): React.ReactNode {
        const editorGeometry = this.selectedObject.metadata?.editorGeometry;
        if (!editorGeometry?.type || !(this.selectedObject instanceof Mesh)) {
            return undefined;
        }

        const mesh = this.selectedObject as Mesh;

        switch (editorGeometry.type) {
            case "Plane":
                if (typeof (editorGeometry.size) === "number") {
                    editorGeometry.width = editorGeometry.size;
                    editorGeometry.height = editorGeometry.size;
                    delete editorGeometry.size;
                }

                return (
                    <InspectorSection title="Plane Geometry">
                        <InspectorNumber
                            object={editorGeometry} property="width" label="Width" min={0} noUndoRedo
                            onChange={() => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreatePlane, editorGeometry)}
                            onFinishChange={(_, o) => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreatePlane, editorGeometry, { ...editorGeometry, width: o })}
                        />

                        <InspectorNumber
                            object={editorGeometry} property="height" label="Height" min={0} noUndoRedo
                            onChange={() => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreatePlane, editorGeometry)}
                            onFinishChange={(_, o) => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreatePlane, editorGeometry, { ...editorGeometry, height: o })}
                        />
                    </InspectorSection>
                );

            case "Cube":
                return (
                    <InspectorSection title="Cube Geometry">
                        <InspectorNumber
                            object={editorGeometry} property="size" label="Size" min={0.01} noUndoRedo
                            onChange={() => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateBox, editorGeometry)}
                            onFinishChange={(_, o) => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateBox, editorGeometry, { ...editorGeometry, size: o })}
                        />
                    </InspectorSection>
                );

            case "Sphere":
                return (
                    <InspectorSection title="Sphere Geometry">
                        <InspectorNumber
                            object={editorGeometry} property="segments" label="Segments" min={1} max={128} step={1} noUndoRedo
                            onChange={() => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateSphere, editorGeometry)}
                            onFinishChange={(_, o) => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateSphere, editorGeometry, { ...editorGeometry, segments: o })}
                        />
                        <InspectorNumber
                            object={editorGeometry} property="diameter" label="Diameter" min={0.01} step={0.01} noUndoRedo
                            onChange={() => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateSphere, editorGeometry)}
                            onFinishChange={(_, o) => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateSphere, editorGeometry, { ...editorGeometry, diameter: o })}
                        />
                        <InspectorNumber
                            object={editorGeometry} property="arc" label="Arc" min={0.01} max={1} step={0.01} noUndoRedo
                            onChange={() => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateSphere, editorGeometry)}
                            onFinishChange={(_, o) => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateSphere, editorGeometry, { ...editorGeometry, arc: o })}
                        />
                        <InspectorNumber
                            object={editorGeometry} property="slice" label="Slice" min={0.01} max={1} step={0.01} noUndoRedo
                            onChange={() => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateSphere, editorGeometry)}
                            onFinishChange={(_, o) => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateSphere, editorGeometry, { ...editorGeometry, slice: o })}
                        />
                    </InspectorSection>
                );

            case "Cylinder":
                return (
                    <InspectorSection title="Cylinder Geometry">
                        <InspectorNumber
                            object={editorGeometry} property="height" label="Height" min={0.01} step={0.01} noUndoRedo
                            onChange={() => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateCylinder, editorGeometry)}
                            onFinishChange={(_, o) => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateCylinder, editorGeometry, { ...editorGeometry, height: o })}
                        />
                        <InspectorNumber
                            object={editorGeometry} property="diameterTop" label="Diameter Top" min={0.01} step={0.01} noUndoRedo
                            onChange={() => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateCylinder, editorGeometry)}
                            onFinishChange={(_, o) => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateCylinder, editorGeometry, { ...editorGeometry, diameterTop: o })}
                        />
                        <InspectorNumber
                            object={editorGeometry} property="diameterBottom" label="Diameter Bottom" min={0.01} step={0.01} noUndoRedo
                            onChange={() => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateCylinder, editorGeometry)}
                            onFinishChange={(_, o) => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateCylinder, editorGeometry, { ...editorGeometry, diameterBottom: o })}
                        />
                        <InspectorNumber
                            object={editorGeometry} property="tesselation" label="Tesselation" min={1} step={1} noUndoRedo
                            onChange={() => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateCylinder, editorGeometry)}
                            onFinishChange={(_, o) => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateCylinder, editorGeometry, { ...editorGeometry, tesselation: o })}
                        />
                        <InspectorNumber
                            object={editorGeometry} property="subdivisions" label="Subdivisions" min={1} step={1} noUndoRedo
                            onChange={() => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateCylinder, editorGeometry)}
                            onFinishChange={(_, o) => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateCylinder, editorGeometry, { ...editorGeometry, subdivisions: o })}
                        />
                        <InspectorNumber
                            object={editorGeometry} property="arc" label="Arc" min={0.01} max={1} step={0.01} noUndoRedo
                            onChange={() => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateCylinder, editorGeometry)}
                            onFinishChange={(_, o) => this._applyGeometryBuilderConfiguration(mesh, VertexData.CreateCylinder, editorGeometry, { ...editorGeometry, arc: o })}
                        />
                    </InspectorSection>
                );
            default: return undefined;
        }
    }

    /**
     * Applies the new geometry for the given mesh.
     */
    private _applyGeometryBuilderConfiguration(mesh: Mesh, fn: (...args: any[]) => VertexData, editorGeometry: any, oldEditorGeometry?: any): void {
        if (!oldEditorGeometry) {
            return mesh.geometry?.setAllVerticesData(fn(editorGeometry), false);
        }

        const editorGeometryCopy = { ...editorGeometry };

        undoRedo.push({
            common: () => {
                InspectorNotifier.NotifyChange(editorGeometry);
            },
            undo: () => {
                Object.assign(editorGeometry, oldEditorGeometry);
                mesh.geometry?.setAllVerticesData(fn(oldEditorGeometry), false);
            },
            redo: () => {
                Object.assign(editorGeometry, editorGeometryCopy);
                mesh.geometry?.setAllVerticesData(fn(editorGeometry), false);
            },
        });
    }

    /**
     * Returns the LOD inspector used to configure/add/remove LODs.
     */
    private _getLodsInspector(): React.ReactNode {
        if (this.selectedObject instanceof InstancedMesh || this.selectedObject._masterMesh) {
            return undefined;
        }

        const sections: React.ReactNode[] = [];
        const mesh = this.selectedObject as Mesh;
        const lods = this.selectedObject.getLODLevels();

        lods.forEach((lod, index) => {
            const materialField = lod.mesh ? (
                <InspectorList object={lod.mesh} property="material" label="Material" items={() => this.getMaterialsList()} dndHandledTypes={["asset/material"]} />
            ) : undefined;

            sections.push((
                <InspectorSection key={`lod-${index}`} title={lod.mesh?.name ?? "Null"}>
                    {this._getLodDragAndDropZone(mesh, lod)}
                    {materialField}
                    <InspectorNumber key={`lod-distance-${index}`} object={lod} property="distanceOrScreenCoverage" label="Distance Or Screen Coverage" min={0} onChange={() => mesh["_sortLODLevels"]()} />
                    <InspectorButton key={`lod-remove-${index}`} label="Remove" small onClick={() => {
                        mesh.removeLODLevel(lod.mesh!);
                        lod.mesh?.dispose(true, false);

                        mesh["_sortLODLevels"]();
                        this.forceUpdate();
                    }} />
                </InspectorSection>
            ));
        });

        return (
            <InspectorSection key="lod" title="LOD">
                {sections}
                <InspectorButton label="Add LOD" small onClick={() => {
                    mesh.addLODLevel(100, null);
                    this.forceUpdate();
                }} />
            </InspectorSection>
        );
    }

    /**
     * Returns the react node used to handle drag'n'drop of meshes assets for the given lod level.
     */
    private _getLodDragAndDropZone(mesh: Mesh, lodLevel: MeshLODLevel): React.ReactNode {
        let divContent: React.ReactNode;
        if (lodLevel.mesh) {
            const divRef = React.createRef<HTMLDivElement>();

            divContent = (
                <div ref={divRef} style={{ width: "100%", height: "100%" }}>
                    <img
                        style={{ width: "100%", height: "100%", objectFit: "contain", padding: "5px", outlineColor: "#48aff0", outlineWidth: "3px" }}
                        onMouseOver={(e) => (e.currentTarget as HTMLImageElement).style.outlineStyle = "groove"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLImageElement).style.outlineStyle = "unset"}
                        onContextMenu={(e) => {
                            ContextMenu.show((
                                <Menu>
                                    <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._handleRemoveMeshFromLodLevel(mesh, lodLevel)} />
                                </Menu>
                            ), {
                                top: e.clientY,
                                left: e.clientX,
                            });
                        }}
                        ref={async (r) => {
                            if (!r) { return; }
                            await Tools.Wait(0);

                            const notFoundToolTip = "Source Asset Not Found";
                            const notFoundImagePath = "../css/svg/question-mark.svg";

                            const relativePath = lodLevel.mesh?.metadata?.lodMeshPath;
                            if (!relativePath) {
                                r.src = notFoundImagePath;
                                divRef.current?.setAttribute("data-tooltip", notFoundToolTip);
                                return;
                            }

                            const absolutePath = join(this.editor.assetsBrowser.assetsDirectory, relativePath);
                            const path = await Workers.ExecuteFunction<AssetsWorker, "createScenePreview">(AssetsBrowserItemHandler.AssetWorker, "createScenePreview", relativePath, absolutePath);

                            if (path) {
                                r.src = path;
                            } else {
                                r.src = notFoundImagePath;
                                divRef.current?.setAttribute("data-tooltip", notFoundToolTip);
                            }
                        }}
                    />
                </div>
            );
        } else {
            divContent = (
                <h2 style={{ textAlign: "center", color: "white", lineHeight: "50px", userSelect: "none" }}>Drag'n'drop mesh here.</h2>
            );
        }

        return (
            <div
                style={{ width: "100%", height: lodLevel.mesh ? "100px" : "50px", border: "1px dashed black" }}
                onDragEnter={(e) => (e.currentTarget as HTMLDivElement).style.border = "dashed red 1px"}
                onDragLeave={(e) => (e.currentTarget as HTMLDivElement).style.border = "dashed black 1px"}
                onDrop={async (e) => this._handleLodMeshLevelDragAndDrop(mesh, lodLevel, e)}
            >
                {divContent}
            </div>
        );
    }

    /**
     * Called on the user wants to remove the current mesh from the given lod level.
     */
    private _handleRemoveMeshFromLodLevel(mesh: Mesh, lodLevel: MeshLODLevel): void {
        mesh.removeLODLevel(lodLevel.mesh!);
        lodLevel.mesh?.dispose(true, false);
        mesh.addLODLevel(lodLevel.distanceOrScreenCoverage, null);

        mesh["_sortLODLevels"]();
        this.forceUpdate();
    }

    /**
     * Called on the user drops a mesh asset in the drag'n'drop zone for a mesh Lod inspector.
     */
    private async _handleLodMeshLevelDragAndDrop(mesh: Mesh, lodLevel: MeshLODLevel, e: React.DragEvent<HTMLDivElement>): Promise<void> {
        (e.currentTarget as HTMLDivElement).style.border = "dashed black 1px";

        try {
            const dataContent = e.dataTransfer.getData("asset/mesh");
            const data = JSON.parse(dataContent);

            if (!data) { return; }

            // Load lod mesh
            const meshName = basename(data.absolutePath);
            const rootUrl = join(dirname(data.absolutePath), "/");
            const result = await SceneLoader.ImportMeshAsync("", rootUrl, meshName, this.editor.scene!);

            // Clean load result
            result.skeletons.forEach((s) => s.dispose());
            result.particleSystems.forEach((ps) => ps.dispose(true));
            result.meshes.forEach((m) => m.material && m.material.dispose(true, true));
            result.lights.forEach((l) => l.dispose(true, true));
            result.transformNodes.forEach((t) => t.dispose(true, true));
            result.animationGroups.forEach((a) => a.dispose());

            // Configure lod mesh
            let lodMesh = result.meshes[0];
            if (result.meshes.length > 1) {
                lodMesh = (await this._showLodSelector(result.meshes))!;
            }

            this._clearLodTempResult(result.meshes, lodMesh);

            if (!lodMesh || !(lodMesh instanceof Mesh)) {
                return;
            }

            lodMesh.id = Tools.RandomId();
            lodMesh.name = meshName;
            lodMesh.material = this.selectedObject.material;
            lodMesh.skeleton = this.selectedObject.skeleton;
            lodMesh.position.set(0, 0, 0);

            lodMesh.metadata ??= {};
            lodMesh.metadata.lodMeshPath = data.relativePath;

            // Replace mesh
            mesh.removeLODLevel(lodLevel.mesh!);
            lodLevel.mesh?.dispose(true, false);

            mesh.addLODLevel(lodLevel.distanceOrScreenCoverage, lodMesh);
            mesh["_sortLODLevels"]();

            this.forceUpdate();
        } catch (e) {
            // Catch silently.
        }
    }

    /**
     * In case of multiple meshes, shows a select box.
     */
    private _showLodSelector(meshes: AbstractMesh[]): Promise<Nullable<AbstractMesh>> {
        return new Promise<Nullable<Mesh>>(async (resolve) => {
            let ref: Nullable<Alert> = null;
            let resultMesh: Nullable<Mesh> = null;

            await Alert.Show("LOD Selector", "", "select", (
                <div style={{ background: "#333333" }}>
                    <Tree
                        onNodeClick={(n) => {
                            resultMesh = n.nodeData as Mesh;
                        }}
                        onNodeDoubleClick={(n) => {
                            resultMesh = n.nodeData as Mesh;
                            ref?.close();
                        }}
                        contents={meshes.filter((m) => m instanceof Mesh).map((m) => ({
                            id: m.id,
                            nodeData: m,
                            label: m.name,
                        }))}
                    />
                </div>
            ), {
                style: {
                    width: "50%",
                    height: "50%",
                },
            }, (r) => ref = r);

            resolve(resultMesh);
        });
    }

    /**
     * Clears all the temporary elements from the LOD scene loader result.
     */
    private _clearLodTempResult(meshes: AbstractMesh[], selectedLod: Nullable<AbstractMesh>): void {
        meshes.forEach((m) => {
            if (m !== selectedLod) {
                m.dispose(true, true);
            }
        });
    }

    /**
     * Returns the LOD inspector used to configure/add/remove LODs.
     */
    // private _getLodsInspector(): React.ReactNode {
    //     if (this.selectedObject instanceof InstancedMesh || this.selectedObject._masterMesh) {
    //         return undefined;
    //     }

    //     const lods = this.selectedObject.getLODLevels();
    //     const assets = this.editor.assets.getAssetsOf(MeshesAssets) ?? [];

    //     const noLod = lods.length ? undefined : <h2 style={{ color: "white", textAlign: "center" }}>No LOD available.</h2>;
    //     const sections: React.ReactNode[] = [];

    //     lods.forEach((lod, index) => {
    //         const o = {
    //             assetId: lod.mesh?.name ?? null,
    //         };

    //         const items: IInspectorListItem<Nullable<string>>[] = [
    //             { label: "None", data: null },
    //             ...assets.map((a) => ({
    //                 label: a.id,
    //                 data: a.id,
    //                 icon: <img src={a.base64} style={{ width: "24px", height: "24px" }}></img>
    //             })),
    //         ];

    //         sections.push(
    //             <InspectorSection key={`lod-${index}`} title={lod.mesh?.name ?? "Unnamed LOD Mesh"}>
    //                 <InspectorNumber key={`lod-distance-${index}`} object={lod} property="distance" label="Distance" min={0} step={0.01} />
    //                 <InspectorList key={`lod-source-${index}`} object={o} property="assetId" label="Source" items={items} onChange={(v) => this._handleSelectedLOD(lod, v)} />
    //                 <InspectorButton key={`lod-remove-${index}`} small={true} label="Remove" onClick={() => this._handleRemoveLOD(lod.mesh)} />
    //             </InspectorSection>
    //         );
    //     });

    //     return (
    //         <InspectorSection key="lod" title="LOD">
    //             <InspectorButton label="Add LOD..." onClick={() => this._handleAddLOD()} />
    //             {noLod}
    //             {sections}
    //         </InspectorSection>
    //     );
    // }

    /**
     * Called on the user wants to add a new LOD.
     */
    // private _handleAddLOD(): void {
    //     if (this.selectedObject instanceof InstancedMesh) {
    //         return;
    //     }

    //     const mesh = this.selectedObject as Mesh;

    //     const hasNullLod = mesh.getLODLevels().find((lod) => !lod.mesh);
    //     if (hasNullLod) { return; }

    //     mesh.addLODLevel(100, null);

    //     this.forceUpdate(() => {
    //         mesh.getLODLevels().forEach((lod) => InspectorNotifier.NotifyChange(lod));
    //     });
    // }

    /**
     * Called on the user wants to remove a LOD.
     */
    // private _handleRemoveLOD(lodMesh: Nullable<Mesh>): void {
    //     if (this.selectedObject instanceof InstancedMesh) {
    //         return;
    //     }

    //     const mesh = this.selectedObject as Mesh;

    //     mesh.removeLODLevel(lodMesh!);
    //     if (lodMesh) {
    //         lodMesh.dispose(true, false);
    //     }

    //     this.forceUpdate(() => {
    //         mesh.getLODLevels().forEach((lod) => InspectorNotifier.NotifyChange(lod));
    //     });
    // }

    /**
     * Called on the user selected a LOD.
     */
    // private async _handleSelectedLOD(lod: MeshLODLevel, lodId: Nullable<string>): Promise<void> {
    //     if (this.selectedObject instanceof InstancedMesh) {
    //         return;
    //     }

    //     const assets = this.editor.assets.getAssetsOf(MeshesAssets) ?? [];
    //     const asset = assets?.find((a) => a.id === lodId);
    //     if (!asset) { return; }

    //     const rootUrl = join(dirname(asset.key), "/");

    //     const result = await SceneLoader.ImportMeshAsync("", rootUrl, asset.id, this.editor.scene!);
    //     result.meshes.forEach((m) => m.material && m.material.dispose(true, true));
    //     result.particleSystems.forEach((ps) => ps.dispose(true));
    //     result.skeletons.forEach((s) => s.dispose());

    //     const mesh = result.meshes[0];
    //     if (!mesh || !(mesh instanceof Mesh)) { return; }

    //     mesh.id = Tools.RandomId();
    //     mesh.name = asset.id;
    //     mesh.material = this.selectedObject.material;
    //     mesh.skeleton = this.selectedObject.skeleton;
    //     mesh.position.set(0, 0, 0);

    //     this.selectedObject.removeLODLevel(lod.mesh!);
    //     if (lod.mesh) { lod.mesh.dispose(true, false); }

    //     this.selectedObject.addLODLevel(lod.distance, mesh);

    //     this.forceUpdate();
    // }
}

Inspector.RegisterObjectInspector({
    ctor: MeshInspector,
    ctorNames: ["Mesh", "InstancedMesh", "GroundMesh"],
    title: "Mesh",
});
