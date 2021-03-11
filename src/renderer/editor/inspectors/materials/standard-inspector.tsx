import * as React from "react";

import { StandardMaterial } from "babylonjs";

import { Inspector } from "../../components/inspector";

import { InspectorList } from "../../gui/inspector/list";
import { InspectorColor } from "../../gui/inspector/color";
import { InspectorNumber } from "../../gui/inspector/number";
import { InspectorSection } from "../../gui/inspector/section";
import { InspectorBoolean } from "../../gui/inspector/boolean";
import { InspectorColorPicker } from "../../gui/inspector/color-picker";

import { MaterialInspector } from "./material-inspector";

export class StandardMaterialInspector extends MaterialInspector<StandardMaterial> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}
                {this.getMaterialFlagsInspector()}
                {this.getAdvancedOptionsInspector()}
                {this.getMapsInspector()}

                <InspectorSection title="Diffuse">
                    <InspectorBoolean object={this.material} property="useAlphaFromDiffuseTexture" label= "Use Alpha From Diffuse Texture" />
                    <InspectorColor object={this.material} property="diffuseColor" label="Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="diffuseColor" label="Hex Color" />
                </InspectorSection>

                <InspectorSection title="Bump">
                    <InspectorBoolean object={this.material} property="invertNormalMapX" label= "Invert Normal Map X" />
                    <InspectorBoolean object={this.material} property="invertNormalMapY" label= "Invert Normal Map Y" />
                    <InspectorBoolean object={this.material} property="useParallax" label= "Use Parallax" />
                    <InspectorBoolean object={this.material} property="useParallaxOcclusion" label= "Use Parallax Occlusion" />
                    <InspectorNumber object={this.material} property="parallaxScaleBias" label="Parallax Scale Bias" step={0.001} />
                </InspectorSection>

                <InspectorSection title="Specular">
                    <InspectorBoolean object={this.material} property="useGlossinessFromSpecularMapAlpha" label= "Use Glossiness From Specular Map Alpha" />
                    <InspectorBoolean object={this.material} property="useReflectionFresnelFromSpecular" label= "Use Reflection Fresnel From Specular" />
                    <InspectorBoolean object={this.material} property="useSpecularOverAlpha" label= "Use Specular Over Alpha" />

                    <InspectorNumber object={this.material} property="specularPower" label="Power" step={0.01} />
                    <InspectorColor object={this.material} property="specularColor" label="Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="specularColor" label="Hex Color" />
                </InspectorSection>

                <InspectorSection title="Ambient">
                    <InspectorColor object={this.material} property="ambientColor" label="Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="ambientColor" label="Hex Color" />
                </InspectorSection>

                <InspectorSection title="Emissive">
                    <InspectorBoolean object={this.material} property="linkEmissiveWithDiffuse" label= "Link Emissive With Diffuse" />
                    <InspectorColor object={this.material} property="emissiveColor" label="Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="emissiveColor" label="Hex Color" />
                </InspectorSection>
            </>
        );
    }

    /**
     * Returns the inspector used to set the textures of the standard material.
     */
    protected getMapsInspector(): React.ReactNode {
        return (
            <InspectorSection title="Maps">
                <InspectorList object={this.material} property="diffuseTexture" label="Diffuse Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="bumpTexture" label="Bump Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="specularTexture" label="Specular Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="ambientTexture" label="Ambient Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="opacityTexture" label="Opacity Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="emissiveTexture" label="Emissive Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="lightmapTexture" label="Lightmap Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="reflectionTexture" label="Reflection Texture" items={() => this.getTexturesList()} />
            </InspectorSection>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: StandardMaterialInspector,
    ctorNames: ["StandardMaterial"],
    title: "Standard",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, StandardMaterial),
});
