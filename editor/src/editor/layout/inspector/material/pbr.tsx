import { Component, ReactNode } from "react";

import { PBRMaterial } from "babylonjs";

import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorTextureField } from "../fields/texture";
import { EditorInspectorSectionField } from "../fields/section";

export interface IEditorPBRMaterialInspectorProps {
    material: PBRMaterial;
}

export class EditorPBRMaterialInspector extends Component<IEditorPBRMaterialInspectorProps> {
    public constructor(props: IEditorPBRMaterialInspectorProps) {
        super(props);

        props.material.metallic ??= 0;
        props.material.roughness ??= 1;
    }

    public render(): ReactNode {
        return (
            <>
                <EditorInspectorSectionField title="Material Textures">
                    <EditorInspectorTextureField material={this.props.material} title="Albedo Texture" property="albedoTexture">
                        <EditorInspectorSwitchField label="Use Alpha" object={this.props.material} property="useAlphaFromDiffuseTexture" />
                    </EditorInspectorTextureField>

                    <EditorInspectorTextureField material={this.props.material} title="Bump Texture" property="bumpTexture" />
                    <EditorInspectorTextureField material={this.props.material} title="Reflectivity Texture" property="reflectivityTexture" />
                    <EditorInspectorTextureField material={this.props.material} title="Ambient Texture" property="ambientTexture" />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Material">
                    <EditorInspectorStringField label="Name" object={this.props.material} property="name" />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Metallic / Roughness">
                    <EditorInspectorNumberField label="Metallic" object={this.props.material} property="metallic" />
                    <EditorInspectorNumberField label="Roughness" object={this.props.material} property="roughness" />
                </EditorInspectorSectionField>
            </>
        );
    }
}
