import * as React from "react";

import { PointLight } from "babylonjs";

import { Inspector } from "../../inspector";

import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorVector3 } from "../../../gui/inspector/fields/vector3";

import { INodeInspectorState } from "../node-inspector";

import { LightInspector } from "./light-inspector";

export class PointLightInspector extends LightInspector<PointLight, INodeInspectorState> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}

                <InspectorSection title="Transforms">
                    <InspectorVector3 object={this.selectedObject} property="position" label="Position" step={0.01} />
                </InspectorSection>

                {this.getColorsInspector()}
                {this.getLightInspector()}

                {this.getAnimationRangeInspector()}
                {this.getExcludedMeshesInspector()}
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: PointLightInspector,
    ctorNames: ["PointLight"],
    title: "Point Light",
});
