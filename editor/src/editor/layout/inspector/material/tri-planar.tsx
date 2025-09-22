import { Component, ReactNode } from "react";

import { AbstractMesh } from "babylonjs";
import { TriPlanarMaterial } from "babylonjs-materials";

import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorTextureField } from "../fields/texture";
import { EditorInspectorSectionField } from "../fields/section";

import { EditorMaterialInspectorUtilsComponent } from "./components/utils";

export interface IEditorTriPlanarMaterialInspectorProps {
	mesh?: AbstractMesh;
	material: TriPlanarMaterial;
}

export class EditorTriPlanarMaterialInspector extends Component<IEditorTriPlanarMaterialInspectorProps> {
	public constructor(props: IEditorTriPlanarMaterialInspectorProps) {
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

				<EditorInspectorSectionField title="Tri-Planar">
					<EditorInspectorNumberField object={this.props.material} property="tileSize" label="Tile Size" step={1} />
					<EditorInspectorColorField label={<div className="w-14">Diffuse</div>} object={this.props.material} property="diffuseColor" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Diffuse Textures">
					<EditorInspectorTextureField hideLevel object={this.props.material} title="Diffuse Texture X" property="diffuseTextureX" />
					<EditorInspectorTextureField hideLevel object={this.props.material} title="Diffuse Texture Y" property="diffuseTextureY" />
					<EditorInspectorTextureField hideLevel object={this.props.material} title="Diffuse Texture Z" property="diffuseTextureZ" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Normal Textures">
					<EditorInspectorTextureField hideLevel object={this.props.material} title="Normal Texture X" property="normalTextureX" />
					<EditorInspectorTextureField hideLevel object={this.props.material} title="Normal Texture Y" property="normalTextureY" />
					<EditorInspectorTextureField hideLevel object={this.props.material} title="Normal Texture Z" property="normalTextureZ" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Misc">
					<EditorInspectorSwitchField label="Disable Lighting" object={this.props.material} property="disableLighting" />
				</EditorInspectorSectionField>
			</>
		);
	}
}
