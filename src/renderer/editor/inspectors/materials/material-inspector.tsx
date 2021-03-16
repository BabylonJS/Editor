import * as React from "react";

import { Material, Mesh, SubMesh, Constants } from "babylonjs";

import { InspectorSection } from "../../gui/inspector/section";

import { Inspector, IObjectInspectorProps } from "../../components/inspector";
import { InspectorString } from "../../gui/inspector/string";
import { InspectorNumber } from "../../gui/inspector/number";

import { AbstractInspector } from "../abstract-inspector";
import { InspectorBoolean } from "../../gui/inspector/boolean";
import { InspectorList } from "../../gui/inspector/list";

export class MaterialInspector<T extends Material, S = {}> extends AbstractInspector<Material | Mesh | SubMesh, S> {
    /**
     * Returns wether or not the selected object in the editor is supported to edit material.
     * @param o defines the object being selected in the editor.
     */
    public static IsObjectSupported(o: any, materialCtor: (new (...args: any[]) => Material)): boolean {
        // Selected a mterial.
        if (o instanceof materialCtor) { return true; }
        // Selected a mesh
        if (o instanceof Mesh && o.material instanceof materialCtor) { return true; }
        // Selected a submesh
        if (o instanceof SubMesh && o.getMaterial() instanceof materialCtor) { return true; }

        return false;
    }

    private static _AlphaModes: string[] = [
        "ALPHA_DISABLE", "ALPHA_ADD", "ALPHA_COMBINE", "ALPHA_SUBTRACT",
        "ALPHA_MULTIPLY", "ALPHA_MAXIMIZED", "ALPHA_ONEONE", "ALPHA_PREMULTIPLIED",
        "ALPHA_PREMULTIPLIED_PORTERDUFF", "ALPHA_INTERPOLATE", "ALPHA_SCREENMODE",
    ];

    /**
     * Defines the reference to the selected material.
     */
    protected material: T;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
     public constructor(props: IObjectInspectorProps) {
        super(props);

        if (this.selectedObject instanceof Material) {
            this.material = this.selectedObject as T;
        } else if (this.selectedObject instanceof Mesh) {
            this.material = this.selectedObject.material as T;
        } else if (this.selectedObject instanceof SubMesh) {
            this.material = this.selectedObject.getMaterial() as T;
        }
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <InspectorSection title="Common">
                <InspectorString object={this.material} property="name" label="Name" />
                <InspectorNumber object={this.material} property="alpha" label="Alpha" min={0} max={1} step={0.01} />
                <InspectorNumber object={this.material} property="zOffset" label="Z Offset" step={0.01} />
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to edit the flags of the material.
     */
    protected getMaterialFlagsInspector(): React.ReactNode {
        const disableLighting = (this.material["disableLighting"] ?? null) !== null ? (
            <InspectorBoolean object={this.material} property="disableLighting" label="Disable Lighting" />
        ) : undefined;

        return (
            <InspectorSection title="Flags">
                <InspectorBoolean object={this.material} property="wireframe" label="Wireframe" />
                <InspectorBoolean object={this.material} property="fogEnabled" label="Fog Enabled" />
                <InspectorBoolean object={this.material} property="backFaceCulling" label="Back Face Culling" />
                <InspectorBoolean object={this.material} property="checkReadyOnEveryCall" label="Check Ready On Every Call" />
                <InspectorBoolean object={this.material} property="checkReadyOnlyOnce" label="Check Ready Only Once" />
                <InspectorBoolean object={this.material} property="disableDepthWrite" label="Disable Depth Write" />
                <InspectorBoolean object={this.material} property="needDepthPrePass" label="Need Depth Pre-Pass" />
                {disableLighting}
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to configure the advanced properties such as alpha mode etc.
     */
    protected getAdvancedOptionsInspector(): React.ReactNode {
        const maxLights = (this.material["maxSimultaneousLights"] ?? null) !== null ? (
            <InspectorNumber object={this.material} property="maxSimultaneousLights" label="Max Simultaneous Lights" min={0} max={32} step={1} />
        ) : undefined;

        return (
            <InspectorSection title="Advanced">
                {maxLights}
                <InspectorList object={this.material} property="sideOrientation" label="Side Orientation" items={[
                    { label: "ClockWiseSideOrientation", data: Material.ClockWiseSideOrientation },
                    { label: "CounterClockWiseSideOrientation", data: Material.CounterClockWiseSideOrientation },
                ]} />
                <InspectorList object={this.material} property="alphaMode" label="Alpha Mode" items={
                    MaterialInspector._AlphaModes.map((am) => ({ label: am, data: Constants[am] }))
                } />
            </InspectorSection>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: MaterialInspector,
    ctorNames: ["Material"],
    title: "Material",
});