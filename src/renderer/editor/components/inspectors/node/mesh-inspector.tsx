import * as React from "react";

import {
    Mesh, InstancedMesh, RenderingManager, Vector3, Quaternion,
    PhysicsImpostor, GroundMesh,
    Material, Tools as BabylonTools,
} from "babylonjs";

import { Inspector } from "../../inspector";

import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorButton } from "../../../gui/inspector/fields/button";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorBoolean } from "../../../gui/inspector/fields/boolean";
import { InspectorVector3 } from "../../../gui/inspector/fields/vector3";
import { InspectorNotifier } from "../../../gui/inspector/notifier";
import { InspectorList } from "../../../gui/inspector/fields/list";

import { Tools } from "../../../tools/tools";
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

        return (
            <>
                {super.renderContent()}

                <InspectorSection title="Mesh">
                    <InspectorBoolean object={this.selectedObject} property="isVisible" label="Visible" />
                    <InspectorBoolean object={this.selectedObject} property="isPickable" label="Pickable" />
                </InspectorSection>

                {this._getRenderingInspector()}

                <InspectorSection title="Transforms">
                    <InspectorVector3 object={this.selectedObject} property="position" label="Position" step={0.01} />
                    {this._getRotationInspector()}
                    <InspectorVector3 object={this.selectedObject} property="scaling" label="Scaling" step={0.01} />
                </InspectorSection>

                {this._getCollisionsInspector()}

                <InspectorSection title="Physics">
                    <InspectorList object={this} property="_physicsImpostor" label="Impostor Type" items={MeshInspector._PhysicsImpostors.map((pi) => ({ label: pi, data: pi }))} onChange={() => {
                        this._handlePhysicsImpostorChanged();
                    }} />
                    {this._getPhysicsInspector()}
                </InspectorSection>

                {this._getSkeletonInspector()}
                {this._getMorphTargetsInspector()}
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
     * Returns the LOD inspector used to configure/add/remove LODs.
     */
    private _getLodsInspector(): React.ReactNode {
        if (this.selectedObject instanceof InstancedMesh || this.selectedObject._masterMesh) {
            return undefined;
        }

        const sections: React.ReactNode[] = [];
        const mesh = this.selectedObject as Mesh;
        const lods = this.selectedObject.getLODLevels();

        lods.forEach((lod) => {
            sections.push((
                <InspectorSection title={lod.mesh?.name ?? "Null"}>
                    <InspectorButton label="Remove" small onClick={() => {
                        debugger;
                        mesh.removeLODLevel(lod.mesh!);
                        this.forceUpdate();
                    }} />
                </InspectorSection>
            ))
        });

        return (
            <InspectorSection key="lod" title="LOD">
                {sections}
                <InspectorButton label="Add LOD" onClick={() => {
                    mesh.addLODLevel(100, null);
                    this.forceUpdate();
                }} />
            </InspectorSection>
        );
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
