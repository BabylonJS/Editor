import * as React from "react";

import { Mesh, RenderingManager, Vector3, Quaternion } from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../components/inspector";

import { InspectorList } from "../gui/inspector/list";
import { InspectorNumber } from "../gui/inspector/number";
import { InspectorSection } from "../gui/inspector/section";
import { InspectorBoolean } from "../gui/inspector/boolean";

import { INodeInspectorState, NodeInspector } from "./node-inspector";
import { InspectorVector3 } from "../gui/inspector/vector3";

export class MeshInspector extends NodeInspector<Mesh, INodeInspectorState> {
    private static _BillboardModes: string[] = [
        "BILLBOARDMODE_NONE", "BILLBOARDMODE_X", "BILLBOARDMODE_Y",
        "BILLBOARDMODE_Z", "BILLBOARDMODE_ALL", "BILLBOARDMODE_USE_POSITION"
    ];

    private _renderingGroupId: string = "";
    private _rotation: Vector3 = Vector3.Zero();

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
}

Inspector.RegisterObjectInspector({
    ctor: MeshInspector,
    ctorNames: ["Mesh"],
    title: "Mesh",
});
