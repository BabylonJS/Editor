import * as React from "react";

import { NodeMaterial } from "babylonjs";

import { Inspector } from "../../components/inspector";

import { InspectorButton } from "../../gui/inspector/button";
import { InspectorSection } from "../../gui/inspector/section";

import { MaterialAssets } from "../../assets/materials";

import { MaterialInspector } from "./material-inspector";

export class NodeMaterialInspector extends MaterialInspector<NodeMaterial> {
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
            </>
        );
    }

    /**
     * Called on the user wants to open the material.
     */
    private _handleOpenMaterial(): void {
        this.editor.assets.getComponent(MaterialAssets)?.openMaterial(this.material);
    }
}

Inspector.RegisterObjectInspector({
    ctor: NodeMaterialInspector,
    ctorNames: ["NodeMaterial"],
    title: "Node Material",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, NodeMaterial),
});
