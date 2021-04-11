import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { NodeMaterial, NodeMaterialBlockConnectionPointTypes, Observer } from "babylonjs";

import { Inspector } from "../../components/inspector";

import { InspectorColor } from "../../gui/inspector/fields/color";
import { InspectorButton } from "../../gui/inspector/fields/button";
import { InspectorNumber } from "../../gui/inspector/fields/number";
import { InspectorVector2 } from "../../gui/inspector/fields/vector2";
import { InspectorSection } from "../../gui/inspector/fields/section";
import { InspectorVector3 } from "../../gui/inspector/fields/vector3";

import { MaterialAssets } from "../../assets/materials";

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

        const nodes = uniforms.map((u) => {
            const hasMinMax = u.min !== u.max;
            const min = hasMinMax ? u.min : undefined;
            const max = hasMinMax ? u.max : undefined;

            switch (u.type) {
                case NodeMaterialBlockConnectionPointTypes.Float:
                    return <InspectorNumber key={u.name} object={u} property="value" label={u.name} min={min} max={max} step={0.01} />;
                case NodeMaterialBlockConnectionPointTypes.Int:
                    return <InspectorNumber key={u.name} object={u} property="value" label={u.name} min={min} max={max} step={1} />;

                case NodeMaterialBlockConnectionPointTypes.Vector2:
                    return <InspectorVector2 key={u.name} object={u} property="value" label={u.name} step={0.01} />;
                case NodeMaterialBlockConnectionPointTypes.Vector3:
                    return <InspectorVector3 key={u.name} object={u} property="value" label={u.name} step={0.01} />;

                case NodeMaterialBlockConnectionPointTypes.Color3:
                case NodeMaterialBlockConnectionPointTypes.Color4:
                    return <InspectorColor key={u.name} object={u} property="value" label={u.name} step={0.01} />;
            }
        });

        return nodes;
    }
}

Inspector.RegisterObjectInspector({
    ctor: NodeMaterialInspector,
    ctorNames: ["NodeMaterial"],
    title: "Node Material",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, NodeMaterial),
});
