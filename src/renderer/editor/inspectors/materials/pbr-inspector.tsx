import * as React from "react";

import { PBRMaterial } from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../components/inspector";

import { InspectorList } from "../../gui/inspector/list";
import { InspectorColor } from "../../gui/inspector/color";
import { InspectorNumber } from "../../gui/inspector/number";
import { InspectorBoolean } from "../../gui/inspector/boolean";
import { InspectorSection } from "../../gui/inspector/section";
import { InspectorColorPicker } from "../../gui/inspector/color-picker";

import { MaterialInspector } from "./material-inspector";

export interface IPBRMaterialInspectorState {
    /**
     * Defines wether or not the material is using the metallic workflow.
     */
    useMetallic: boolean;
    /**
     * Defines wether or not the material is using the roughness workflow.
     */
    useRoughness: boolean;
    /**
     * Defines wether or not clear coat is enabled.
     */
    clearCoatEnabled: boolean;
}

export class PBRMaterialInspector extends MaterialInspector<PBRMaterial, IPBRMaterialInspectorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
     public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            useMetallic: (this.material.metallic ?? null) !== null,
            useRoughness: (this.material.roughness ?? null) !== null,
            clearCoatEnabled: this.material.clearCoat.isEnabled,
        };
    }

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

                <InspectorSection title="Albedo">
                    <InspectorBoolean object={this.material} property="useAlphaFromAlbedoTexture" label= "Use Alpha From Albedo Texture" />
                    <InspectorColor object={this.material} property="albedoColor" label="Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="albedoColor" label="Hex Color" />
                </InspectorSection>

                <InspectorSection title="Bump">
                    {this._getBumpTextureLevelInspector()}
                    <InspectorBoolean object={this.material} property="invertNormalMapX" label= "Invert Normal Map X" />
                    <InspectorBoolean object={this.material} property="invertNormalMapY" label= "Invert Normal Map Y" />
                    <InspectorBoolean object={this.material} property="useParallax" label= "Use Parallax" />
                    <InspectorBoolean object={this.material} property="useParallaxOcclusion" label= "Use Parallax Occlusion" />
                    <InspectorNumber object={this.material} property="parallaxScaleBias" label="Parallax Scale Bias" step={0.001} />
                </InspectorSection>

                <InspectorSection title="Reflectivity">
                    <InspectorBoolean object={this.material} property="enableSpecularAntiAliasing" label= "Enable Specular Anti-Aliasing" />
                    <InspectorBoolean object={this.material} property="useSpecularOverAlpha" label= "Use Specular Over Alpha" />
                    <InspectorColor object={this.material} property="reflectivityColor" label="Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="reflectivityColor" label="Hex Color" />
                </InspectorSection>

                <InspectorSection title="Reflection">
                    <InspectorNumber object={this.material} property="environmentIntensity" label="Environment Intensity" step={0.01} />
                    <InspectorColor object={this.material} property="reflectionColor" label="Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="reflectionColor" label="Hex Color" />
                </InspectorSection>

                <InspectorSection title="Ambient">
                    <InspectorBoolean object={this.material} property="useAmbientInGrayScale" label= "Use Ambient In Gray Scale" />
                    <InspectorNumber object={this.material} property="ambientTextureStrength" label="Strength" step={0.01} />
                    <InspectorColor object={this.material} property="ambientColor" label="Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="ambientColor" label="Hex Color" />
                </InspectorSection>

                <InspectorSection title="Micro Surface (Glossiness)">
                    <InspectorNumber object={this.material} property="microSurface" label="Micro Surface" min={0} max={1} step={0.01} />
                    <InspectorBoolean object={this.material} property="useAutoMicroSurfaceFromReflectivityMap" label= "Use Auto Micro Surface From Reflectivity Map" />
                    <InspectorBoolean object={this.material} property="useMicroSurfaceFromReflectivityMapAlpha" label= "Use Micro Surface From Reflectivity Map Alpha" />
                </InspectorSection>

                <InspectorSection title="Metallic / Roughness">
                    <InspectorBoolean object={this.material} property="useMetallnessFromMetallicTextureBlue" label= "Use Metallness From Metallic Texture Blue" />
                    <InspectorBoolean object={this.material} property="useRoughnessFromMetallicTextureAlpha" label= "Use Roughness From Metallic Texture Alpha" />
                    <InspectorBoolean object={this.material} property="useRoughnessFromMetallicTextureGreen" label= "Use Roughness From Metallic Texture Green" />
                    {this._getMetallicWorkflowInspector()}
                    {this._getRoughnessWorkflowInspector()}
                </InspectorSection>

                <InspectorSection title="Emissive">
                    <InspectorColor object={this.material} property="emissiveColor" label="Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="emissiveColor" label="Hex Color" />
                </InspectorSection>

                {this._getClearCoatInspector()}
            </>
        );
    }

    /**
     * Returns the inspector used to set the textures of the standard material.
     */
    protected getMapsInspector(): React.ReactNode {
        return (
            <InspectorSection title="Maps">
                <InspectorList object={this.material} property="albedoTexture" label="Albedo Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="bumpTexture" label="Bump Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="reflectivityTexture" label="Reflectivity Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="reflectionTexture" label="Reflection Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="ambientTexture" label="Ambient Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="microSurfaceTexture" label="Micro Surface Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="metallicTexture" label="Metallic Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="opacityTexture" label="Opacity Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="emissiveTexture" label="Emissive Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="lightmapTexture" label="Lightmap Texture" items={() => this.getTexturesList()} />
            </InspectorSection>
        );
    }

    /**
     * Returns the inspector used to control the bump texture strength/level.
     */
    private _getBumpTextureLevelInspector(): React.ReactNode {
        return this.material.bumpTexture ? (
            <InspectorNumber object={this.material.bumpTexture} property="level" label="Strength" step={0.01} />
        ) : undefined;
    }

    /**
     * Returns the metallic workflow inspector used to configure the metallic properties of the
     * PBR material.
     */
    private _getMetallicWorkflowInspector(): React.ReactNode {
        if (!this.state.useMetallic) {
            return (
                <InspectorSection title="Metallic">
                    <InspectorBoolean object={this.state} property="useMetallic" label="Use Metallic" onChange={(v) => {
                        this.material.metallic = 0;
                        this.setState({ useMetallic: v });
                    }} />
                </InspectorSection>
            );
        }

        return (
            <InspectorSection title="Metallic">
                <InspectorBoolean object={this.state} property="useMetallic" label="Use Metallic" onChange={(v) => {
                    this.material.metallic = null;
                    this.setState({ useMetallic: v });
                }} />
                <InspectorNumber object={this.material} property="metallic" label="Metallic" step={0.01} />
            </InspectorSection>
        );
    }

    /**
     * Returns the roughness workflow inspector used to configure the roughness properties of the
     * PBR material.
     */
    private _getRoughnessWorkflowInspector(): React.ReactNode {
        if (!this.state.useRoughness) {
            return (
                <InspectorSection title="Roughness">
                    <InspectorBoolean object={this.state} property="useRoughness" label="Use Roughness" onChange={(v) => {
                        this.material.roughness = 0;
                        this.setState({ useRoughness: v });
                    }} />
                </InspectorSection>
            );
        }

        return (
            <InspectorSection title="Roughness">
                <InspectorBoolean object={this.state} property="useRoughness" label="Use Roughness" onChange={(v) => {
                    this.material.roughness = null;
                    this.setState({ useRoughness: v });
                }} />
                <InspectorNumber object={this.material} property="roughness" label="Roughness" step={0.01} />
            </InspectorSection>
        );
    }

    /**
     * Returns the clear coat inspector used to configure the clear coat values
     * of the PBR material.
     */
    private _getClearCoatInspector(): React.ReactNode {
        if (!this.state.clearCoatEnabled) {
            return (
                <InspectorSection title="Clear Coat">
                    <InspectorBoolean object={this.material.clearCoat} property="isEnabled" label= "Enabled" onChange={(v) => this.setState({ clearCoatEnabled: v })} />
                </InspectorSection>
            );
        }

        return (
            <InspectorSection title="Clear Coat">
                <InspectorBoolean object={this.material.clearCoat} property="isEnabled" label="Enabled" onChange={(v) => this.setState({ clearCoatEnabled: v })} />
                <InspectorNumber object={this.material.clearCoat} property="intensity" label="Intensity" step={0.01} />
                <InspectorNumber object={this.material.clearCoat} property="roughness" label="Roughness" step={0.01} />
                <InspectorNumber object={this.material.clearCoat} property="indexOfRefraction" label="Index Of Refraction" step={0.01} />

                <InspectorSection title="Textures">
                    <InspectorList object={this.material.clearCoat} property="texture" label="Texture" items={() => this.getTexturesList()} />
                    <InspectorList object={this.material.clearCoat} property="bumpTexture" label="Bump Texture" items={() => this.getTexturesList()} />
                </InspectorSection>

                <InspectorSection title="Tint">
                    <InspectorBoolean object={this.material.clearCoat} property="isTintEnabled" label="Enabled" />
                    <InspectorNumber object={this.material.clearCoat} property="tintColorAtDistance" label="Color At Distance" step={0.01} />
                    <InspectorNumber object={this.material.clearCoat} property="tintThickness" label="Thickness" step={0.01} />
                </InspectorSection>
            </InspectorSection>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: PBRMaterialInspector,
    ctorNames: ["PBRMaterial"],
    title: "PBR",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, PBRMaterial),
});
