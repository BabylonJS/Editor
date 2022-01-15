import { IStringDictionary, Nullable } from "../../../../../shared/types";

import * as React from "react";

import { NodeMaterial, NodeMaterialBlockConnectionPointTypes, Observer, InputBlock } from "babylonjs";

import { Inspector } from "../../inspector";

import { Tools } from "../../../tools/tools";

import { InspectorColor } from "../../../gui/inspector/fields/color";
import { InspectorButton } from "../../../gui/inspector/fields/button";
import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorVector2 } from "../../../gui/inspector/fields/vector2";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorVector3 } from "../../../gui/inspector/fields/vector3";
import { InspectorColorPicker } from "../../../gui/inspector/fields/color-picker";

import { MaterialAssets } from "../../../assets/materials";

import { MaterialInspector } from "./material-inspector";

export class NodeMaterialInspector extends MaterialInspector<NodeMaterial> {
    private _buildObserver: Nullable<Observer<NodeMaterial>> = null;

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}
                {this.getMaterialFlagsInspector()}
                {this.getAdvancedOptionsInspector()}

                <InspectorSection title="Node Material">
                    <h2 style={{ textAlign: "center", color: "white" }}>Use Node Material Editor to customize properties.</h2>
                    <InspectorButton label="Edit Material..." onClick={() => this._handleOpenMaterial()} />
                </InspectorSection>

                <InspectorSection title="Uniforms">
                    {this._getEditableUniforms()}
                </InspectorSection>
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        super.componentDidMount();

        this._buildObserver = this.material.onBuildObservable.add(() => {
            this.forceUpdate();
        });
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();

        this.material.onBuildObservable.remove(this._buildObserver);
    }

    /**
     * Called on the user wants to open the material.
     */
    private _handleOpenMaterial(): void {
        this.editor.assets.getComponent(MaterialAssets)?.openMaterial(this.material);
    }

    /**
     * Returns the list of all editable uniforms.
     */
    private _getEditableUniforms(): React.ReactNode[] {
        const uniforms = this.material.getInputBlocks().filter((b) => b.visibleInInspector);
        if (!uniforms.length) {
            return [
                <h2 style={{ textAlign: "center", color: "white" }}>No unforms available.</h2>
            ];
        }

        // Create groups dictionary
        const groups: IStringDictionary<InputBlock[]> = { };
        uniforms.forEach((u) => {
            const g = u.groupInInspector ?? "";
            if (!groups[g]) {
                groups[g] = [];
            }

            groups[g].push(u);
        });

        // For each group, create sections
        const keys = Tools.SortAlphabetically(Object.keys(groups));

        const sections = keys.map((k) => {
            const blocks = groups[k].map((b) => {
                const hasMinMax = b.min !== b.max;
                const min = hasMinMax ? b.min : undefined;
                const max = hasMinMax ? b.max : undefined;

                switch (b.type) {
                    case NodeMaterialBlockConnectionPointTypes.Float:
                        return <InspectorNumber key={b.name} object={b} property="value" label={b.name} min={min} max={max} step={0.01} />;
                    case NodeMaterialBlockConnectionPointTypes.Int:
                        return <InspectorNumber key={b.name} object={b} property="value" label={b.name} min={min} max={max} step={1} />;

                    case NodeMaterialBlockConnectionPointTypes.Vector2:
                        return <InspectorVector2 key={b.name} object={b} property="value" label={b.name} step={0.01} />;
                    case NodeMaterialBlockConnectionPointTypes.Vector3:
                        return <InspectorVector3 key={b.name} object={b} property="value" label={b.name} step={0.01} />;

                    case NodeMaterialBlockConnectionPointTypes.Color3:
                    case NodeMaterialBlockConnectionPointTypes.Color4:
                        return (
                            <InspectorSection title={b.name}>
                                <InspectorColor key={b.name} object={b} property="value" label={b.name} step={0.01} />
                                <InspectorColorPicker key={`${b.name}_hex`} object={b} property="value" label={`${b.name} Hex`} />
                            </InspectorSection>
                        );
                }
            });

            return (
                <InspectorSection title={k || "No Group"}>
                    {blocks}
                </InspectorSection>
            );
        });

        return sections;
    }
}

Inspector.RegisterObjectInspector({
    ctor: NodeMaterialInspector,
    ctorNames: ["NodeMaterial"],
    title: "Node Material",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, NodeMaterial),
});
