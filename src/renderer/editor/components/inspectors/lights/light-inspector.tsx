import * as React from "react";

import { BoundingSphere, Light, Material, Mesh, Vector3 } from "babylonjs";

import { InspectorList } from "../../../gui/inspector/fields/list";
import { InspectorColor } from "../../../gui/inspector/fields/color";
import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorButton } from "../../../gui/inspector/fields/button";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorColorPicker } from "../../../gui/inspector/fields/color-picker";

import { Inspector } from "../../inspector";

import { INodeInspectorState, NodeInspector } from "../node-inspector";

import { MeshTransferComponent } from "../tools/transfer-mesh";

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
            </>
        );
    }

    /**
     * Returns the inspector used to edit the light's properties.
     */
    protected getLightInspector(): React.ReactNode {
        return (
            <InspectorSection title="Light">
                <InspectorNumber object={this.selectedObject} property="range" label="Range" step={0.01} />
                <InspectorNumber object={this.selectedObject} property="radius" label="Radius" step={0.01} />

                <InspectorButton label="Compute Range Excluded Meshes" small onClick={() => this._handleComputeRangeExcludedMeshes()} />

                <InspectorSection title="Intensity">
                    <InspectorNumber object={this.selectedObject} property="intensity" label="Intensity" step={0.01} />
                    <InspectorList object={this.selectedObject} property="intensityMode" label="Mode" items={
                        LightInspector._Modes.map((m) => ({ label: m, data: Light[m] }))
                    } />
                </InspectorSection>
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to edit the light's colors.
     */
    protected getColorsInspector(): React.ReactNode {
        return (
            <InspectorSection title="Colors">
                <InspectorColor object={this.selectedObject} property="diffuse" label="Diffuse" step={0.01} />
                <InspectorColorPicker object={this.selectedObject} property="diffuse" label="Hex" />

                <InspectorColor object={this.selectedObject} property="specular" label="Specular" step={0.01} />
                <InspectorColorPicker object={this.selectedObject} property="specular" label="Hex" />
            </InspectorSection>
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

    /**
     * Called on the user wants to update the list of excluded meshes according to the current range of the light.
     */
    private _handleComputeRangeExcludedMeshes(): void {
        this.selectedObject.computeWorldMatrix(true);
        this.selectedObject.excludedMeshes = this.editor.scene!.meshes.filter((m) => !m._masterMesh && m.isVisible && m.isEnabled());

        const absolutePosition = this.selectedObject.getAbsolutePosition();

        this.editor.scene!.meshes.forEach((m) => {
            m.computeWorldMatrix(true);

            if (m instanceof Mesh && m.hasThinInstances) {
                m.thinInstanceRefreshBoundingInfo(true, true, true);
            } else {
                m.refreshBoundingInfo(true, true);
            }

            const sphere = new BoundingSphere(
                new Vector3().copyFrom(absolutePosition).add(new Vector3(-this.selectedObject.range)),
                new Vector3().copyFrom(absolutePosition).add(new Vector3(this.selectedObject.range)),
            );

            const bb = m.getBoundingInfo().boundingBox;

            if (bb.intersectsSphere(sphere)) {
                const index = this.selectedObject.excludedMeshes.indexOf(m);
                if (index !== -1) {
                    this.selectedObject.excludedMeshes.splice(index, 1);
                }
            }

            m.material?.markAsDirty(Material.LightDirtyFlag);
        });

        this.editor.inspector.refresh();
    }
}

Inspector.RegisterObjectInspector({
    ctor: LightInspector,
    ctorNames: ["Light"],
    title: "Light",
});
