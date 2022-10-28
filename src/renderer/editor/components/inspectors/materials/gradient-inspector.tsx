import * as React from "react";

import { GradientMaterial } from "babylonjs-materials";

import { Inspector } from "../../inspector";

import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorSection } from "../../../gui/inspector/fields/section";

import { MaterialInspector } from "./material-inspector";
import { InspectorColor } from "../../../gui/inspector/fields/color";
import { InspectorColorPicker } from "../../../gui/inspector/fields/color-picker";

export class GradientMaterialInspector extends MaterialInspector<GradientMaterial> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}
                {this.getMaterialFlagsInspector()}
                {this.getAdvancedOptionsInspector()}

                <InspectorSection title="Top">
                    <InspectorColor object={this.material} property="topColor" label="Color" />
                    <InspectorColorPicker object={this.material} property="topColor" label="Hex Color" />
                    <InspectorNumber object={this.material} property="topColorAlpha" label="Alpha" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Bottom">
                    <InspectorColor object={this.material} property="bottomColor" label="Color" />
                    <InspectorColorPicker object={this.material} property="bottomColor" label="Hex Color" />
                    <InspectorNumber object={this.material} property="bottomColorAlpha" label="Alpha" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Offsets">
                    <InspectorNumber object={this.material} property="scale" label="Scale" step={0.01} />
                    <InspectorNumber object={this.material} property="offset" label="Offset" step={0.01} />
                    <InspectorNumber object={this.material} property="smoothness" label="Smoothness" step={0.01} />
                </InspectorSection>
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: GradientMaterialInspector,
    ctorNames: ["GradientMaterial"],
    title: "Gradient",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, GradientMaterial),
});
