import { watch, FSWatcher } from "fs-extra";

import { Nullable } from "../../../../../shared/types";

import * as React from "react";

import { Material, Mesh, SubMesh, Constants } from "babylonjs";

import { Tools } from "../../../tools/tools";

import { MaterialAssets } from "../../../assets/materials";

import { WorkSpace } from "../../../project/workspace";

import { IExportedInspectorValue, SandboxMain } from "../../../../sandbox/main";

import { Inspector, IObjectInspectorProps } from "../../inspector";

import { InspectorList } from "../../../gui/inspector/fields/list";
import { InspectorColor } from "../../../gui/inspector/fields/color";
import { InspectorString } from "../../../gui/inspector/fields/string";
import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorButton } from "../../../gui/inspector/fields/button";
import { InspectorBoolean } from "../../../gui/inspector/fields/boolean";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorVector2 } from "../../../gui/inspector/fields/vector2";
import { InspectorVector3 } from "../../../gui/inspector/fields/vector3";

import { AbstractInspector } from "../abstract-inspector";

export interface IMaterialInspectorState {
    /**
     * Defines the list of all exported values in case of a custom material.
     */
    exportedValues?: IExportedInspectorValue[];
}

export class MaterialInspector<T extends Material, S extends IMaterialInspectorState = IMaterialInspectorState> extends AbstractInspector<Material | Mesh | SubMesh, S> {
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

    /**
     * Returns the material of the given object (material, mesh, sub mesh, etc;).
     * @param o defines the reference to the object to get its material.
     */
    public static GetMaterialOfObject(o: any): Nullable<Material> {
        // Selected a mterial.
        if (o instanceof Material) { return o; }
        // Selected a mesh
        if (o instanceof Mesh && o.material instanceof Material) { return o.material; }
        // Selected a submesh
        if (o instanceof SubMesh && o.getMaterial() instanceof Material) { return o.getMaterial(); }

        return null;
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

    private _exportedValuesWateher: Nullable<FSWatcher> = null;

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
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();

        this._exportedValuesWateher?.close();
        this._exportedValuesWateher = null;
    }

    /**
     * Called on a property of the selected object has changed.
     */
    public onPropertyChanged(): void {
        super.onPropertyChanged();

        this.editor.assets.refresh(MaterialAssets, this.material);
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
                <InspectorButton label="Show In Assets Browser" small icon="link" onClick={() => this.editor.assetsBrowser.revealPanelAndShowFile(this.material.metadata?.editorPath)} />
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

    /**
     * Returns the inspector used to edit all the material's properties that are tagged "@visibleInInspector".
     */
    protected getInspectableValuesInspector(): React.ReactNode {
        if (!this.material.metadata?.sourcePath) {
            return null;
        }

        if (!this.state.exportedValues) {
            const jsPath = Tools.GetSourcePath(WorkSpace.DirPath!, this.material.metadata.sourcePath);
            SandboxMain.GetInspectorValues(jsPath).then((v) => {
                this.setState({ exportedValues: v });
                
                this._exportedValuesWateher ??= watch(jsPath, { encoding: "utf-8" }, (ev) => {
                    if (ev === "change") {
                        this.setState({ exportedValues: undefined });
                    }
                });
            });
            return null;
        }

        const sectionsDictionary: Record<string, React.ReactNode[]> = { };
        this.state.exportedValues.forEach((v) => {
            const inspector = this._getExportedValueInspector(v);
            if (!inspector) {
                return;
            }

            const section = v.options?.section ?? "Misc";

            sectionsDictionary[section] ??= [];
            sectionsDictionary[section].push(inspector);
        });

        const sections = Object.keys(sectionsDictionary).map((k) => (
            <InspectorSection title={k}>
                {sectionsDictionary[k]}
            </InspectorSection>
        ));

        return (
            <InspectorSection title="Exported Values">
                {sections}
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector associated to the given exported value.
     */
    private _getExportedValueInspector(value: IExportedInspectorValue): React.ReactNode {
        switch (value.type) {
            case "Color3": return <InspectorColor object={this.material} property={value.propertyKey} label={value.name} />;
            case "string": return <InspectorString object={this.material} property={value.propertyKey} label={value.name} />;
            case "number": return <InspectorNumber object={this.material} property={value.propertyKey} label={value.name} />;
            case "boolean": return <InspectorBoolean object={this.material} property={value.propertyKey} label={value.name} />;
            case "Vector2": return <InspectorVector2 object={this.material} property={value.propertyKey} label={value.name} />;
            case "Vector3": return <InspectorVector3 object={this.material} property={value.propertyKey} label={value.name} />;
            case "Texture": return <InspectorList object={this.material} property= {value.propertyKey} label={value.name} items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />;
            default: return null;
        }
    }
}

Inspector.RegisterObjectInspector({
    ctor: MaterialInspector,
    ctorNames: ["Material"],
    title: "Material",
});
