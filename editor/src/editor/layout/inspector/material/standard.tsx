import { Component, ReactNode } from "react";

import { StandardMaterial, AbstractMesh } from "babylonjs";

import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorTextureField } from "../fields/texture";
import { EditorInspectorSectionField } from "../fields/section";

import { EditorMaterialInspectorUtilsComponent } from "./utils";

export interface IEditorStandardMaterialInspectorProps {
	mesh?: AbstractMesh;
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

					<EditorMaterialInspectorUtilsComponent mesh={this.props.mesh} material={this.props.material} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Material Textures">
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
					<EditorInspectorTextureField object={this.props.material} title="Opacity Texture" property="opacityTexture" />
					<EditorInspectorTextureField object={this.props.material} title="Emissive Texture" property="emissiveTexture" />

					<EditorInspectorTextureField
						object={this.props.material}
						title="Reflection Texture"
						property="reflectionTexture"
						acceptCubeTexture
						onChange={() => this.forceUpdate()}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Material Colors">
					<EditorInspectorColorField label={<div className="w-14">Diffuse</div>} object={this.props.material} property="diffuseColor" />
					<EditorInspectorColorField label={<div className="w-14">Specular</div>} object={this.props.material} property="specularColor" />
					<EditorInspectorColorField label={<div className="w-14">Ambient</div>} object={this.props.material} property="ambientColor" />
					<EditorInspectorColorField label={<div className="w-14">Emissive</div>} object={this.props.material} property="emissiveColor" />
				</EditorInspectorSectionField>
			</>
		);
	}
}
