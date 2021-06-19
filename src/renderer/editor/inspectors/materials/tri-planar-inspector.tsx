import * as React from "react";

import { TriPlanarMaterial } from "babylonjs-materials";

import { Inspector } from "../../components/inspector";

import { InspectorList } from "../../gui/inspector/fields/list";
import { InspectorNumber } from "../../gui/inspector/fields/number";
import { InspectorSection } from "../../gui/inspector/fields/section";

import { MaterialInspector } from "./material-inspector";

export class TriPlanarMaterialInspector extends MaterialInspector<TriPlanarMaterial> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        this.material;

        return (
            <>
                {super.renderContent()}
                {this.getMaterialFlagsInspector()}
                {this.getAdvancedOptionsInspector()}

                <InspectorSection title="Tri Planar">
                    <InspectorNumber object={this.material} property="tileSize" label="Tile Size" step={0.01} />
                    <InspectorSection title="Diffuse Textures">
                        <InspectorList object={this.material} property="diffuseTextureX" label="Texture X" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                        <InspectorList object={this.material} property="diffuseTextureY" label="Texture Y" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                        <InspectorList object={this.material} property="diffuseTextureZ" label="Texture Z" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                    </InspectorSection>
                    <InspectorSection title="Normal Textures">
                        <InspectorList object={this.material} property="normalTextureX" label="Normal X" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                        <InspectorList object={this.material} property="normalTextureY" label="Normal Y" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                        <InspectorList object={this.material} property="normalTextureZ" label="Normal Z" items={() => this.getTexturesList()} dndHandledTypes={["asset/texture"]} />
                    </InspectorSection>
                </InspectorSection>
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: TriPlanarMaterialInspector,
    ctorNames: ["TriPlanarMaterial"],
    title: "Tri Planar",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, TriPlanarMaterial),
});
