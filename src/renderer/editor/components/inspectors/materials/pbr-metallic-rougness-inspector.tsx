import * as React from "react";

import { Constants, PBRMetallicRoughnessMaterial } from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../inspector";

import { InspectorList } from "../../../gui/inspector/fields/list";
import { InspectorColor } from "../../../gui/inspector/fields/color";
import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorBoolean } from "../../../gui/inspector/fields/boolean";
import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorColorPicker } from "../../../gui/inspector/fields/color-picker";

import { IMaterialInspectorState, MaterialInspector } from "./material-inspector";

export interface IPBRMetallicRoughnesslInspectorState extends IMaterialInspectorState {

}

export class PBRMetallicRoughnessMaterialInspector extends MaterialInspector<PBRMetallicRoughnessMaterial, IPBRMetallicRoughnesslInspectorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {

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
                {this.getInspectableValuesInspector()}

                <InspectorSection title="Options">
                    <InspectorBoolean object={this.material} property="unlit" label="Unlit" defaultValue={false} />
                </InspectorSection>

                <InspectorSection title="Base">
                    <InspectorColor object={this.material} property="baseColor" label="Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="baseColor" label="Hex Color" />
                </InspectorSection>

                <InspectorSection title="Metallic / Roughness">
                    <InspectorNumber object={this.material} property="metallic" label="Metallic" min={0} max={1} step={0.01} />
                    <InspectorNumber object={this.material} property="roughness" label="Roughness" min={0} max={1} step={0.01} />
                </InspectorSection>

                <InspectorSection title="Emissive">
                    <InspectorColor object={this.material} property="emissiveColor" label="Color" step={0.01} />
                    <InspectorColorPicker object={this.material} property="emissiveColor" label="Hex Color" />
                </InspectorSection>

                <InspectorSection title="BRDF">
                    <InspectorBoolean object={this.material.brdf} property="useEnergyConservation" label="Use Energy Conservation" />
                    <InspectorBoolean object={this.material.brdf} property="useSpecularGlossinessInputEnergyConservation" label="Use Specular Glossiness Input Energy Conservation" />
                </InspectorSection>

                <InspectorSection title="Filtering">
                    <InspectorBoolean object={this.material} property="realTimeFiltering" label="Real-Time Filtering" />
                    <InspectorList object={this.material} property="realTimeFilteringQuality" label="Quality" items={[
                        { label: "Low", data: Constants.TEXTURE_FILTERING_QUALITY_LOW },
                        { label: "Medium", data: Constants.TEXTURE_FILTERING_QUALITY_MEDIUM },
                        { label: "High", data: Constants.TEXTURE_FILTERING_QUALITY_HIGH },
                    ]} />
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
                <InspectorList object={this.material} property="baseTexture" label="Base Texture" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                <InspectorList object={this.material} property="normalTexture" label="Normal Texture" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                <InspectorList object={this.material} property="environmentTexture" label="Environment Texture" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                <InspectorList object={this.material} property="occlusionTexture" label="Occlusion Texture" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                <InspectorList object={this.material} property="metallicRoughnessTexture" label="Metallic Roughness Texture" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                <InspectorList object={this.material} property="emissiveTexture" label="Emissive Texture" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                <InspectorList object={this.material} property="lightmapTexture" label="Lightmap Texture" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
            </InspectorSection>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: PBRMetallicRoughnessMaterialInspector,
    ctorNames: ["PBRMetallicRoughnessMaterial"],
    title: "PBR Metallic Roughness",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, PBRMetallicRoughnessMaterial),
});
