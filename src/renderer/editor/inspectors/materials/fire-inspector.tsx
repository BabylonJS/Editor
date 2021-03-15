import * as React from "react";

import { FireMaterial } from "babylonjs-materials";

import { Inspector } from "../../components/inspector";

import { InspectorList } from "../../gui/inspector/list";
import { InspectorNumber } from "../../gui/inspector/number";
import { InspectorSection } from "../../gui/inspector/section";

import { MaterialInspector } from "./material-inspector";

export class FireMaterialInspector extends MaterialInspector<FireMaterial> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}
                {this.getMaterialFlagsInspector()}
                {this.getAdvancedOptionsInspector()}

                <InspectorSection title="Fire">
                    <InspectorNumber object={this.material} property="speed" label="Speed" step={0.01} />
                    <InspectorList object={this.material} property="diffuseTexture" label="Diffuse Texture" items={() => this.getTexturesList()} />
                    <InspectorList object={this.material} property="distortionTexture" label="Distortion Texture" items={() => this.getTexturesList()} />
                    <InspectorList object={this.material} property="opacityTexture" label="Opacity Texture" items={() => this.getTexturesList()} />
                </InspectorSection>
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: FireMaterialInspector,
    ctorNames: ["FireMaterial"],
    title: "Fire",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, FireMaterial),
});
