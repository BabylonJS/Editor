import * as React from "react";

import { PBRMaterial } from "babylonjs";

import { Inspector } from "../../components/inspector";

import { InspectorList } from "../../gui/inspector/list";
import { InspectorSection } from "../../gui/inspector/section";

import { MaterialInspector } from "./material-inspector";

export class PBRMaterialInspector extends MaterialInspector<PBRMaterial> {
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
                <InspectorList object={this.material} property="opacityTexture" label="Opacity Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="emissiveTexture" label="Emissive Texture" items={() => this.getTexturesList()} />
                <InspectorList object={this.material} property="lightmapTexture" label="Lightmap Texture" items={() => this.getTexturesList()} />
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
