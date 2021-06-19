import * as React from "react";

import { LavaMaterial } from "babylonjs-materials";

import { Inspector } from "../../components/inspector";

import { InspectorList } from "../../gui/inspector/fields/list";
import { InspectorNumber } from "../../gui/inspector/fields/number";
import { InspectorSection } from "../../gui/inspector/fields/section";
import { InspectorBoolean } from "../../gui/inspector/fields/boolean";

import { MaterialInspector } from "./material-inspector";

export class FireMaterialInspector extends MaterialInspector<LavaMaterial> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}
                {this.getMaterialFlagsInspector()}
                {this.getAdvancedOptionsInspector()}

                <InspectorSection title="Lava">
                    <InspectorNumber object={this.material} property="speed" label="Speed" step={0.01} />
                    <InspectorNumber object={this.material} property="movingSpeed" label="Moving Speed" step={0.01} />
                    <InspectorNumber object={this.material} property="lowFrequencySpeed" label="Low Frequency Speed" step={0.01} />
                    <InspectorNumber object={this.material} property="fogDensity" label="Fog Density" step={0.01} />
                    <InspectorBoolean object={this.material} property="unlit" label="Unlit" />

                    <InspectorList object={this.material} property="diffuseTexture" label="Diffuse Texture" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                    <InspectorList object={this.material} property="noiseTexture" label="Noise Texture" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                </InspectorSection>
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: FireMaterialInspector,
    ctorNames: ["LavaMaterial"],
    title: "Lava",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, LavaMaterial),
});
