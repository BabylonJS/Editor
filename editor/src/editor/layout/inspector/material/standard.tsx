import { Component, ReactNode } from "react";

import { StandardMaterial } from "babylonjs";

import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorTextureField } from "../fields/texture";
import { EditorInspectorSectionField } from "../fields/section";

export interface IEditorStandardMaterialInspectorProps {
    material: StandardMaterial;
}

export class EditorStandardMaterialInspector extends Component<IEditorStandardMaterialInspectorProps> {
    public constructor(props: IEditorStandardMaterialInspectorProps) {
        super(props);
    }

    public render(): ReactNode {
        return (
            <>
                <EditorInspectorSectionField title="Material" label={this.props.material.getClassName()}>
                    <EditorInspectorStringField label="Name" object={this.props.material} property="name" />
                    <EditorInspectorSwitchField label="Back Face Culling" object={this.props.material} property="backFaceCulling" />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Material Textures" label={this.props.material.getClassName()}>
                    <EditorInspectorTextureField object={this.props.material} title="Diffuse Texture" property="diffuseTexture" onChange={() => this.forceUpdate()}>
                        <EditorInspectorSwitchField label="Use Alpha" object={this.props.material} property="useAlphaFromDiffuseTexture" />
                    </EditorInspectorTextureField>

                    <EditorInspectorTextureField object={this.props.material} title="Bump Texture" property="bumpTexture" onChange={() => this.forceUpdate()}>
                        <EditorInspectorSwitchField label="Invert X" object={this.props.material} property="invertNormalMapX" />
                        <EditorInspectorSwitchField label="Invert Y" object={this.props.material} property="invertNormalMapY" />
                        <EditorInspectorSwitchField label="Use Parallax" object={this.props.material} property="useParallax" onChange={() => this.forceUpdate()} />

                        {this.props.material.useParallax && (
                            <>
                                <EditorInspectorSwitchField label="Use Parallax Occlusion" object={this.props.material} property="useParallaxOcclusion" />
                                <EditorInspectorNumberField label="Parallax Scale Bias" object={this.props.material} property="parallaxScaleBias" />
                            </>
                        )}
                    </EditorInspectorTextureField>

                    <EditorInspectorTextureField object={this.props.material} title="Specular Texture" property="specularTexture" />
                    <EditorInspectorTextureField object={this.props.material} title="Ambient Texture" property="ambientTexture" />

                    <EditorInspectorTextureField object={this.props.material} title="Reflection Texture" property="reflectionTexture" acceptCubeTexture onChange={() => this.forceUpdate()} />

                </EditorInspectorSectionField>
            </>
        );
    }
}
