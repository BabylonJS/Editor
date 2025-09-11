import { Component, ReactNode } from "react";

import { AbstractMesh } from "babylonjs";
import { LavaMaterial } from "babylonjs-materials";

import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorTextureField } from "../fields/texture";
import { EditorInspectorSectionField } from "../fields/section";

import { EditorMaterialInspectorUtilsComponent } from "./components/utils";

export interface IEditorLavaMaterialInspectorProps {
	mesh?: AbstractMesh;
	material: LavaMaterial;
}

export class EditorLavaMaterialInspector extends Component<IEditorLavaMaterialInspectorProps> {
	public constructor(props: IEditorLavaMaterialInspectorProps) {
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

				<EditorInspectorSectionField title="Lava">
					<EditorInspectorTextureField hideLevel object={this.props.material} title="Diffuse Texture" property="diffuseTexture" />
					<EditorInspectorTextureField hideLevel object={this.props.material} title="Noise Texture" property="noiseTexture" />

					<EditorInspectorNumberField object={this.props.material} property="speed" label="Speed" />
					<EditorInspectorNumberField object={this.props.material} property="movingSpeed" label="Moving Speed" />
					<EditorInspectorNumberField object={this.props.material} property="lowFrequencySpeed" label="Low Frequency Speed" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Fog">
					<EditorInspectorColorField object={this.props.material} property="fogColor" label="Color" />
					<EditorInspectorNumberField object={this.props.material} property="fogDensity" label="Density" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Misc">
					<EditorInspectorSwitchField label="Unlit" object={this.props.material} property="unlit" />
					<EditorInspectorSwitchField label="Disable Lighting" object={this.props.material} property="disableLighting" />
				</EditorInspectorSectionField>
			</>
		);
	}
}
