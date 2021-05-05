import * as React from "react";

import { SpotLight } from "babylonjs";

import { Inspector } from "../../components/inspector";

import { InspectorSection } from "../../gui/inspector/fields/section";
import { InspectorVector3 } from "../../gui/inspector/fields/vector3";

import { INodeInspectorState } from "../node-inspector";

import { LightInspector } from "./light-inspector";
import { InspectorNumber } from "../../gui/inspector/fields/number";

export class SpotLightInspector extends LightInspector<SpotLight, INodeInspectorState> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        const shadowGenerator = this.selectedObject.getShadowGenerator();
        
        return (
            <>
                {super.renderContent()}

                <InspectorSection title="Spot Light">
                    <InspectorNumber object={this.selectedObject} property="angle" label="Angle" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="exponent" label="Exponent" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="innerAngle" label="Inner Angle (GLTF)" step={0.01} />

                    {shadowGenerator ? (
                        <InspectorNumber object={this.selectedObject} property="shadowAngleScale" label="Shadow Angle Scale" step={0.01} />
                    ) : undefined}
                </InspectorSection>

                <InspectorSection title="Transforms">
                    <InspectorVector3 object={this.selectedObject} property="position" label="Position" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="direction" label="Direction" step={0.01} />
                </InspectorSection>

                {this.getAnimationRangeInspector()}
                {this.getExcludedMeshesInspector()}
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: SpotLightInspector,
    ctorNames: ["SpotLight"],
    title: "Spot Light",
});
