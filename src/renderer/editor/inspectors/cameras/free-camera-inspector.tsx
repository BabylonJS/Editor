import * as React from "react";

import { FreeCamera, UniversalCamera } from "babylonjs";

import { Inspector } from "../../components/inspector";

import { InspectorNumber } from "../../gui/inspector/number";
import { InspectorSection } from "../../gui/inspector/section";
import { InspectorVector3 } from "../../gui/inspector/vector3";
import { InspectorBoolean } from "../../gui/inspector/boolean";

import { INodeInspectorState } from "../node-inspector";

import { CameraInspector } from "./camera-inspector";

export class FreeCameraInspector extends CameraInspector<FreeCamera | UniversalCamera, INodeInspectorState> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}

                <InspectorSection title="Free Camera">
                    <InspectorNumber object={this.selectedObject} property="speed" label="Speed" min={0} step={0.01} />
                    <InspectorBoolean object={this.selectedObject} property="noRotationConstraint" label="No Rotation Constraint" />
                </InspectorSection>

                <InspectorSection title="Transforms">
                    <InspectorVector3 object={this.selectedObject} property="position" label="Position" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="rotation" label="Rotation" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Collisions">
                    <InspectorBoolean object={this.selectedObject} property="checkCollisions" label="Check Collisions" />
                    <InspectorBoolean object={this.selectedObject} property="applyGravity" label="Apply Gravity" />
                    <InspectorVector3 object={this.selectedObject} property="ellipsoid" label="Ellipsoid" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="ellipsoidOffset" label="Ellipsoid Offset" step={0.01} />
                </InspectorSection>
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: FreeCameraInspector,
    ctorNames: ["FreeCamera", "UniversalCamera"],
    title: "Free Camera",
});
