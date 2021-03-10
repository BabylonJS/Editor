import * as React from "react";

import { DirectionalLight } from "babylonjs";

import { Inspector } from "../../components/inspector";

import { InspectorSection } from "../../gui/inspector/section";
import { InspectorVector3 } from "../../gui/inspector/vector3";

import { INodeInspectorState } from "../node-inspector";

import { LightInspector } from "./light-inspector";

export class DirectionalLightInspector extends LightInspector<DirectionalLight, INodeInspectorState> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}

                <InspectorSection title="Transforms">
                    <InspectorVector3 object={this.selectedObject} property="position" label="Position" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="direction" label="Direction" step={0.01} />
                </InspectorSection>

                {super.getExcludedMeshesInspector()}
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: DirectionalLightInspector,
    ctorNames: ["DirectionalLight"],
    title: "Directional Light",
});
