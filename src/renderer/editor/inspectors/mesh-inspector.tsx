import * as React from "react";

import { Mesh, RenderingManager, Vector3, Quaternion, PhysicsImpostor } from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../components/inspector";

import { InspectorList } from "../gui/inspector/list";
import { InspectorNumber } from "../gui/inspector/number";
import { InspectorButton } from "../gui/inspector/button";
import { InspectorSection } from "../gui/inspector/section";
import { InspectorBoolean } from "../gui/inspector/boolean";
import { InspectorVector3 } from "../gui/inspector/vector3";

import { Tools } from "../tools/tools";

import { INodeInspectorState, NodeInspector } from "./node-inspector";

export class MeshInspector extends NodeInspector<Mesh, INodeInspectorState> {
    private static _BillboardModes: string[] = [
        "BILLBOARDMODE_NONE", "BILLBOARDMODE_X", "BILLBOARDMODE_Y",
        "BILLBOARDMODE_Z", "BILLBOARDMODE_ALL", "BILLBOARDMODE_USE_POSITION"
    ];
    private static _PhysicsImpostors: string[] = ["NoImpostor", "SphereImpostor", "BoxImpostor", "CylinderImpostor"];

    private _renderingGroupId: string = "";
    private _rotation: Vector3 = Vector3.Zero();

    private _physicsImpostor: string = "";

    /**
     * Constructor.
     * @param props defines the component's props.
     */
     public constructor(props: IObjectInspectorProps) {
        super(props);
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        // Distance
        this.selectedObject.infiniteDistance ??= false;

        // Rendering groups
        this.selectedObject.metadata ??= { };
        this.selectedObject.metadata.renderingGroupId ??= this.selectedObject.renderingGroupId;

        const renderingGroupIds: string[] = [];
        for (let i = RenderingManager.MIN_RENDERINGGROUPS; i <= RenderingManager.MAX_RENDERINGGROUPS; i++) {
            renderingGroupIds.push(i.toString());
        }

        this._renderingGroupId = this.selectedObject.renderingGroupId.toString();

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

                <InspectorSection title="Rendering">
                    <InspectorBoolean object={this.selectedObject} property="receiveShadows" label="Receive Shadows" />
                    <InspectorBoolean object={this.selectedObject} property="applyFog" label="Apply Fog" />
                    <InspectorBoolean object={this.selectedObject} property="infiniteDistance" label="Infinite Distance" />
                    <InspectorNumber object={this.selectedObject} property="visibility" label="Visibility" min={0} max={1} step={0.01} />
                    <InspectorList object={this.selectedObject} property="material" label="Material" items={this.getMaterialsList()} />
                    <InspectorList object={this.selectedObject} property="billboardMode" label="Billboard" items={MeshInspector._BillboardModes.map((bm) => ({ label: bm, data: Mesh[bm] }))} />
                    <InspectorList object={this} property="_renderingGroupId" label="Rendering Group" items={renderingGroupIds.map((rgid) => ({ label: rgid, data: rgid }))} onChange={() => {
                        this.selectedObject.metadata.renderingGroupId = parseInt(this._renderingGroupId);
                    }} />
                </InspectorSection>

                <InspectorSection title="Transforms">
                    <InspectorVector3 object={this.selectedObject} property="position" label="Position" step={0.01} />
                    {this._getRotationInspector()}
                    <InspectorVector3 object={this.selectedObject} property="scaling" label="Scaling" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Collisions">
                    <InspectorBoolean object={this.selectedObject} property="checkCollisions" label="Check Collisions" />
                    <InspectorNumber object={this.selectedObject} property="collisionMask" label="Mask" step={1} />
                    <InspectorVector3 object={this.selectedObject} property="ellipsoid" label="Ellipsoid" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="ellipsoidOffset" label="Ellipsoid Offset" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Physics">
                    <InspectorList object={this} property="_physicsImpostor" label="Impostor Type" items={MeshInspector._PhysicsImpostors.map((pi) => ({ label: pi, data: pi }))} onChange={() => {
                        this._handlePhysicsImpostorChanged();
                    }} />
                    {this._getPhysicsInspector()}
                </InspectorSection>

                {this._getSkeletonInspector()}
                {this._getMorphTargetsInspector()}
                {this._getLodsInspector()}
            </>
        );
    }

    /**
     * Returns the rotation inspector that handles both vector 3d and quaternion.
     */
    private _getRotationInspector(): React.ReactNode {
        if (this.selectedObject.rotationQuaternion) {
            this._rotation.copyFrom(this.selectedObject.rotationQuaternion.toEulerAngles());
        } else {
            this._rotation.copyFrom(this.selectedObject.rotation);
        }

        return <InspectorVector3 object={this} property="_rotation" label={`Rotation ${this.selectedObject.rotationQuaternion ? "(Quaternion)" : ""}`} step={0.01} onChange={() => {
            if (this.selectedObject.rotationQuaternion) {
                this.selectedObject.rotationQuaternion.copyFrom(Quaternion.FromEulerVector(this._rotation));
            } else {
                this.selectedObject.rotation.copyFrom(this._rotation);
            }
        }} />
    }

    /**
     * Returns the physics inspector used to edit physics properties.
     */
    private _getPhysicsInspector(): React.ReactNode {
        if (!this.selectedObject.physicsImpostor || this.selectedObject.physicsImpostor.type === PhysicsImpostor.NoImpostor) {
            return undefined;
        }

        const onPropertyChanged = (param: string, value: number) => {
            this.selectedObject.physicsImpostor!["_bodyUpdateRequired"] = false;
            this.selectedObject.physicsImpostor!.setParam(param, value);
        };

        return (
            <>
                <InspectorNumber object={this.selectedObject.physicsImpostor} property="mass" label="Mass" min={0} step={0.01} onChange={() => onPropertyChanged("mass", this.selectedObject.physicsImpostor!.mass)} />
                <InspectorNumber object={this.selectedObject.physicsImpostor} property="restitution" label="Restitution" min={0} step={0.01} onChange={() => onPropertyChanged("restitution", this.selectedObject.physicsImpostor!.restitution)} />
                <InspectorNumber object={this.selectedObject.physicsImpostor} property="friction" label="Friction" min={0} step={0.01} onChange={() => onPropertyChanged("friction", this.selectedObject.physicsImpostor!.friction)} />
            </>
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
                    this.selectedObject.numBoneInfluencers <<= 0;
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
        if (!this.selectedObject.morphTargetManager) {
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
        // TODO.
        return undefined;
    }
}

Inspector.RegisterObjectInspector({
    ctor: MeshInspector,
    ctorNames: ["Mesh"],
    title: "Mesh",
});
