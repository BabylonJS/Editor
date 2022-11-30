import * as React from "react";

import { HemisphericLight } from "babylonjs";

import { Inspector } from "../../inspector";

import { InspectorColor } from "../../../gui/inspector/fields/color";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorVector3 } from "../../../gui/inspector/fields/vector3";
import { InspectorColorPicker } from "../../../gui/inspector/fields/color-picker";

import { INodeInspectorState } from "../node-inspector";

import { LightInspector } from "./light-inspector";

export class HemisphericLightInspector extends LightInspector<HemisphericLight, INodeInspectorState> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}

                <InspectorSection title="Hemispheric Light">
                    <InspectorVector3 object={this.selectedObject} property="direction" label="Direction" step={0.01} />

                    <InspectorColor object={this.selectedObject} property="groundColor" label="Ground Color" step={0.01} />
                    <InspectorColorPicker object={this.selectedObject} property="groundColor" label="Hex" />
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
    ctor: HemisphericLightInspector,
    ctorNames: ["HemisphericLight"],
    title: "Hemispheric Light",
});
