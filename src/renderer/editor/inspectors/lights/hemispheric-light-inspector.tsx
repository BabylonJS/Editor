import * as React from "react";

import { HemisphericLight } from "babylonjs";

import { Inspector } from "../../components/inspector";

import { InspectorSection } from "../../gui/inspector/fields/section";
import { InspectorVector3 } from "../../gui/inspector/fields/vector3";

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

                <InspectorSection title="Transforms">
                    <InspectorVector3 object={this.selectedObject} property="direction" label="Direction" step={0.01} />
                </InspectorSection>

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
