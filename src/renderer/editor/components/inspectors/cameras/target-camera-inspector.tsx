import * as React from "react";

import { TargetCamera } from "babylonjs";

import { Inspector } from "../../inspector";

import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorVector3 } from "../../../gui/inspector/fields/vector3";

import { INodeInspectorState } from "../node-inspector";

import { CameraInspector } from "./camera-inspector";

export class TargetCameraInspector extends CameraInspector<TargetCamera, INodeInspectorState> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}

                <InspectorSection title="Transforms">
                    <InspectorVector3 object={this.selectedObject} property="rotation" label="Rotation" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="position" label="Position" step={0.01} />
                </InspectorSection>

                {this.getCameraInspector()}
                {this.getAnimationRangeInspector()}
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: TargetCameraInspector,
    ctorNames: ["TargetCamera"],
    title: "Target Camera",
});
