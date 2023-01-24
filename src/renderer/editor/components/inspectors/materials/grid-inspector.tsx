import * as React from "react";

import { GridMaterial } from "babylonjs-materials";

import { Inspector } from "../../inspector";

import { InspectorColor } from "../../../gui/inspector/fields/color";
import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorVector3 } from "../../../gui/inspector/fields/vector3";
import { InspectorColorPicker } from "../../../gui/inspector/fields/color-picker";

import { MaterialInspector } from "./material-inspector";
import { InspectorBoolean } from "../../../gui/inspector/fields/boolean";

export class GridMaterialInspector extends MaterialInspector<GridMaterial> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}
                {this.getMaterialFlagsInspector()}
                {this.getAdvancedOptionsInspector()}

                <InspectorSection title="Main Color">
                    <InspectorColor object={this.material} property="mainColor" label="Main Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="mainColor" label="Hex Color" />
                </InspectorSection>

                <InspectorSection title="Line Color">
                    <InspectorColor object={this.material} property="lineColor" label="Line Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="lineColor" label="Hex Color" />
                </InspectorSection>

                <InspectorSection title="Properties">
                    <InspectorNumber object={this.material} property="gridRatio" label="Ratio" step={0.01} min={0.01} />

                    <InspectorVector3 object={this.material} property="gridOffset" label="Offset" step={0.01} />

                    <InspectorNumber object={this.material} property="majorUnitFrequency" label="Major Unit Frequency" step={0.01} min={1} />
                    <InspectorNumber object={this.material} property="minorUnitVisibility" label="Minor Unit Visibility" step={0.01} min={0} />

                    <InspectorNumber object={this.material} property="opacity" label="Opacity" step={0.01} min={0} max={1} />

                    <InspectorBoolean object={this.material} property="useMaxLine" label="Use Max Line" />
                    <InspectorBoolean object={this.material} property="preMultiplyAlpha" label="Pre-multiply Alpha" />
                </InspectorSection>
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: GridMaterialInspector,
    ctorNames: ["GridMaterial"],
    title: "Grid",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, GridMaterial),
});
