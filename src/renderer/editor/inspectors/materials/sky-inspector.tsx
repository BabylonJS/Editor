import * as React from "react";

import { SkyMaterial } from "babylonjs-materials";

import { Inspector } from "../../components/inspector";

import { InspectorNumber } from "../../gui/inspector/number";
import { InspectorSection } from "../../gui/inspector/section";
import { InspectorBoolean } from "../../gui/inspector/boolean";
import { InspectorVector3 } from "../../gui/inspector/vector3";

import { MaterialInspector } from "./material-inspector";

export class SkyMaterialInspector extends MaterialInspector<SkyMaterial> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}
                {this.getMaterialFlagsInspector()}
                {this.getAdvancedOptionsInspector()}
                
                <InspectorSection title="Sky">
                    <InspectorNumber object={this.material} property="inclination" label="Inclination" step={0.01} />
                    <InspectorNumber object={this.material} property="azimuth" label="Azimuth" step={0.01} />
                    <InspectorNumber object={this.material} property="luminance" label="Luminance" step={0.01} />
                    <InspectorNumber object={this.material} property="turbidity" label="Turbidity" step={0.01} />
                    <InspectorNumber object={this.material} property="mieCoefficient" label="Mie Coefficient" step={0.0001} />
                    <InspectorNumber object={this.material} property="mieDirectionalG" label="Mie Coefficient G" step={0.01} />
                    <InspectorNumber object={this.material} property="rayleigh" label="Reileigh Coefficient" step={0.01} />
                </InspectorSection>

                <InspectorSection title="Positions">
                    <InspectorBoolean object={this.material} property="useSunPosition" label="Use Sun Position" />
                    <InspectorVector3 object={this.material} property="sunPosition" label="Sun Position" step={0.01} />
                    <InspectorVector3 object={this.material} property="cameraOffset" label="Camera Offset" step={0.01} />
                </InspectorSection>
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: SkyMaterialInspector,
    ctorNames: ["SkyMaterial"],
    title: "Sky",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, SkyMaterial),
});
