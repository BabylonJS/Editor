import { Component, ReactNode } from "react";

import { AbstractMesh } from "babylonjs";
import { FireMaterial } from "babylonjs-materials";

import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorTextureField } from "../fields/texture";
import { EditorInspectorSectionField } from "../fields/section";

import { EditorMaterialInspectorUtilsComponent } from "./components/utils";

export interface IEditorFireMaterialInspectorProps {
	mesh?: AbstractMesh;
	material: FireMaterial;
}

export class EditorFireMaterialInspector extends Component<IEditorFireMaterialInspectorProps> {
	public constructor(props: IEditorFireMaterialInspectorProps) {
		super(props);
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Material" label={this.props.material.getClassName()}>
					<EditorInspectorStringField label="Name" object={this.props.material} property="name" />
					<EditorInspectorSwitchField label="Back Face Culling" object={this.props.material} property="backFaceCulling" />

					<EditorMaterialInspectorUtilsComponent mesh={this.props.mesh} material={this.props.material} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Fire">
					<EditorInspectorNumberField object={this.props.material} property="speed" label="Speed" />
					<EditorInspectorTextureField hideLevel object={this.props.material} title="Diffuse Texture" property="diffuseTexture" />
					<EditorInspectorTextureField hideLevel object={this.props.material} title="Distortion Texture" property="distortionTexture" />
					<EditorInspectorTextureField hideLevel object={this.props.material} title="Opacity Texture" property="opacityTexture" />
				</EditorInspectorSectionField>
			</>
		);
	}
}
