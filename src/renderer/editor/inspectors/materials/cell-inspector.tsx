import * as React from "react";

import { CellMaterial } from "babylonjs-materials";

import { Inspector } from "../../components/inspector";

import { InspectorList } from "../../gui/inspector/list";
import { InspectorColor } from "../../gui/inspector/color";
import { InspectorSection } from "../../gui/inspector/section";
import { InspectorBoolean } from "../../gui/inspector/boolean";
import { InspectorColorPicker } from "../../gui/inspector/color-picker";

import { MaterialInspector } from "./material-inspector";

export class CellMaterialInspector extends MaterialInspector<CellMaterial> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}
                {this.getMaterialFlagsInspector()}
                {this.getAdvancedOptionsInspector()}

                <InspectorSection title="Cell">
                    <InspectorBoolean object={this.material} property="computeHighLevel" label="Compute High Level" />
                    <InspectorList object={this.material} property="diffuseTexture" label="Texture" items={() => this.getTexturesList()} />
                    <InspectorColor object={this.material} property="diffuseColor" label="Diffuse Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="diffuseColor" label="Hex Color" />
                </InspectorSection>
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: CellMaterialInspector,
    ctorNames: ["CellMaterial"],
    title: "Cell",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, CellMaterial),
});
