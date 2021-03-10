import * as React from "react";

import { Light } from "babylonjs";

import { InspectorList } from "../../gui/inspector/list";
import { InspectorColor } from "../../gui/inspector/color";
import { InspectorNumber } from "../../gui/inspector/number";
import { InspectorSection } from "../../gui/inspector/section";
import { InspectorColorPicker } from "../../gui/inspector/color-picker";

import { Inspector } from "../../components/inspector";

import { INodeInspectorState, NodeInspector } from "../node-inspector";

import { MeshTransferComponent } from "./tools/transfer-mesh";

export class LightInspector<T extends Light, S extends INodeInspectorState> extends NodeInspector<T, S> {
    private static _Modes: string[] = [
        "INTENSITYMODE_AUTOMATIC",
        "INTENSITYMODE_LUMINOUSPOWER",
        "INTENSITYMODE_LUMINOUSINTENSITY",
        "INTENSITYMODE_ILLUMINANCE",
        "INTENSITYMODE_LUMINANCE",
    ];

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}

                <InspectorSection title="Light">
                    <InspectorNumber object={this.selectedObject} property="range" label="Range" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="radius" label="Radius" step={0.01} />

                    <InspectorSection title="Intensity">
                        <InspectorNumber object={this.selectedObject} property="intensity" label="Intensity" step={0.01} />
                        <InspectorList object={this.selectedObject} property="intensityMode" label="Mode" items={
                            LightInspector._Modes.map((m) => ({ label: m, data: Light[m] }))
                        } />
                    </InspectorSection>
                </InspectorSection>

                <InspectorSection title="Colors">
                    <InspectorColor object={this.selectedObject} property="diffuse" label="Diffuse" step={0.01} />
                    <InspectorColorPicker object={this.selectedObject} property="diffuse" label="Hex" />

                    <InspectorColor object={this.selectedObject} property="specular" label="Specular" step={0.01} />
                    <InspectorColorPicker object={this.selectedObject} property="specular" label="Hex" />
                </InspectorSection>
            </>
        );
    }

    /**
     * Returns the inspector used to excluded meshes from light computation.
     */
    protected getExcludedMeshesInspector(): React.ReactNode {
        return (
            <InspectorSection title="Excluded Meshes">
                <MeshTransferComponent editor={this.editor} targetArray={this.selectedObject.excludedMeshes} />
            </InspectorSection>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: LightInspector,
    ctorNames: ["Light"],
    title: "Light",
});
