// import { Nullable } from "../../../../../shared/types";

import * as React from "react";

import { ReflectionProbe } from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../inspector";

import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorString } from "../../../gui/inspector/fields/string";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorVector3 } from "../../../gui/inspector/fields/vector3";

import { AbstractInspector } from "../abstract-inspector";

import { MeshTransferComponent } from "../tools/transfer-mesh";

export class ReflectionProbeInspector extends AbstractInspector<ReflectionProbe, {}> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                <InspectorSection title="Common">
                    <InspectorString object={this.selectedObject} property="name" label="Name" onFinishChange={() => this._handleNameChanged()} />
                    <InspectorNumber object={this.selectedObject} property="refreshRate" label="Refresh Rate" min={0} step={1} />
                </InspectorSection>

                <InspectorSection title="Transforms">
                    <InspectorVector3 object={this.selectedObject} property="position" label="Position" />
                </InspectorSection>

                <InspectorSection title="Included Meshes">
                    <MeshTransferComponent editor={this.editor} targetArray={this.selectedObject.renderList!} />
                </InspectorSection>
            </>
        );
    }

    /**
     * Called on the name of the reflection probe changed.
     */
    private _handleNameChanged(): void {
        this.selectedObject.cubeTexture.name = this.selectedObject.name;

        this.editor.graph.refresh();
        this.editor.assets.refresh();
    }
}

Inspector.RegisterObjectInspector({
    ctor: ReflectionProbeInspector,
    ctorNames: ["ReflectionProbe"],
    title: "Reflection Probe",
});
