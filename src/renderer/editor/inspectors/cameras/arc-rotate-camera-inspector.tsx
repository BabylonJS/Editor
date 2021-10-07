import * as React from "react";

import { ArcRotateCamera } from "babylonjs";

import { Inspector } from "../../components/inspector";

import { InspectorNumber } from "../../gui/inspector/fields/number";
import { InspectorSection } from "../../gui/inspector/fields/section";
import { InspectorVector3 } from "../../gui/inspector/fields/vector3";
import { InspectorBoolean } from "../../gui/inspector/fields/boolean";

import { SceneSettings } from "../../scene/settings";

import { INodeInspectorState } from "../node-inspector";

import { CameraInspector } from "./camera-inspector";

export class ArcRotateCameraInspector extends CameraInspector<ArcRotateCamera, INodeInspectorState> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        const panningSensibility = this.selectedObject === SceneSettings.Camera ? undefined : (
            <InspectorNumber object={this.selectedObject} property="panningSensibility" label="Panning Sensibility" step={0.01} />
        );

        return (
            <>
                {super.renderContent()}

                <InspectorSection title="Transforms">
                    <InspectorVector3 object={this.selectedObject} property="position" label="Position" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="target" label="Target" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="panningAxis" label="Panning Axis" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Arc Rotate Camera">
                    <InspectorBoolean object={this.selectedObject} property="noRotationConstraint" label="No Rotation Constraint" />
                    <InspectorNumber object={this.selectedObject} property="wheelPrecision" label="Wheel Precision" min={0} step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="pinchPrecision" label="Pinch Precision" min={0} step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="angularSensibilityX" label="Angular Sensibility X" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="angularSensibilityY" label="Angular Sensibility Y" step={0.01} />

                    <InspectorSection title="Radius And Position">
                        <InspectorNumber object={this.selectedObject} property="radius" label="Radius" min={0} step={0.01} />
                        <InspectorNumber object={this.selectedObject} property="alpha" label="Alpha" step={0.01} />
                        <InspectorNumber object={this.selectedObject} property="beta" label="Beta" step={0.01} />
                    </InspectorSection>

                    <InspectorSection title="Panning">
                        <InspectorNumber object={this.selectedObject} property="panningInertia" label="Panning Inertia" step={0.01} />
                        {panningSensibility}
                    </InspectorSection>
                </InspectorSection>

                <InspectorSection title="Collisions">
                    <InspectorBoolean object={this.selectedObject} property="checkCollisions" label="Check Collisions" />
                    <InspectorVector3 object={this.selectedObject} property="collisionRadius" label="Collision Radius" step={0.01} />
                </InspectorSection>

                {this.getAnimationRangeInspector()}
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: ArcRotateCameraInspector,
    ctorNames: ["ArcRotateCamera"],
    title: "Arc Rotate Camera",
});
