import { Component, ReactNode } from "react";

import { Constants, StandardMaterial, AbstractMesh } from "babylonjs";

import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorTextureField } from "../fields/texture";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorListField } from "../fields/list";

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
					<EditorInspectorNumberField label="Alpha" object={this.props.material} property="alpha" min={0} max={1} />

					<EditorInspectorListField
						label="Alpha Mode"
						object={this.props.material}
						property="alphaMode"
						onChange={() => this.forceUpdate()}
						items={[
							{ text: "Disable", value: Constants.ALPHA_DISABLE },
							{ text: "Add", value: Constants.ALPHA_ADD },
							{ text: "Combine", value: Constants.ALPHA_COMBINE },
							{ text: "Subtract", value: Constants.ALPHA_SUBTRACT },
							{ text: "Multiply", value: Constants.ALPHA_MULTIPLY },
							{ text: "Maximized", value: Constants.ALPHA_MAXIMIZED },
							{ text: "One-one", value: Constants.ALPHA_ONEONE },
							{ text: "Premultiplied", value: Constants.ALPHA_PREMULTIPLIED },
							{ text: "Premultiplied Porterduff", value: Constants.ALPHA_PREMULTIPLIED_PORTERDUFF },
							{ text: "Interpolate", value: Constants.ALPHA_INTERPOLATE },
							{ text: "Screen Mode", value: Constants.ALPHA_SCREENMODE },
						]}
					/>

					<EditorInspectorListField
						label="Transparency Mode"
						object={this.props.material}
						property="transparencyMode"
						items={[
							{ text: "None", value: null },
							{ text: "Opaque", value: StandardMaterial.MATERIAL_OPAQUE },
							{ text: "Alpha Test", value: StandardMaterial.MATERIAL_ALPHATEST },
							{ text: "Alpha Blend", value: StandardMaterial.MATERIAL_ALPHABLEND },
							{ text: "Alpha Test and Blend", value: StandardMaterial.MATERIAL_ALPHATESTANDBLEND },
						]}
					/>

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
					<EditorInspectorTextureField object={this.props.material} title="Ambient Texture" property="ambientTexture" onChange={() => this.forceUpdate()}>
						{this.props.material.ambientTexture && (
							<>
								<EditorInspectorSwitchField label="Use Gray Scale" object={this.props.material} property="useAmbientInGrayScale" />
								<EditorInspectorNumberField label="Strength" object={this.props.material} property="ambientTextureStrength" min={0} />
							</>
						)}
					</EditorInspectorTextureField>
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

				<EditorInspectorSectionField title="Specular Properties">
					<EditorInspectorNumberField label="Specular Power" object={this.props.material} property="specularPower" min={0} />
					<EditorInspectorNumberField label="Direct Intensity" object={this.props.material} property="directIntensity" min={0} />
					<EditorInspectorNumberField label="Environment Intensity" object={this.props.material} property="environmentIntensity" min={0} />
					<EditorInspectorNumberField label="Emissive Intensity" object={this.props.material} property="emissiveIntensity" min={0} />
					<EditorInspectorNumberField label="Specular Intensity" object={this.props.material} property="specularIntensity" min={0} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Misc">
					<EditorInspectorSwitchField label="Disable Lighting" object={this.props.material} property="disableLighting" />
					<EditorInspectorSwitchField label="Use Specular Over Alpha" object={this.props.material} property="useSpecularOverAlpha" />
					<EditorInspectorSwitchField label="Separate Culling Pass" object={this.props.material} property="separateCullingPass" />
					<EditorInspectorNumberField label="Z Offset" object={this.props.material} property="zOffset" />
					<EditorInspectorNumberField label="Z Offset Units" object={this.props.material} property="zOffsetUnits" />
					<EditorInspectorSwitchField label="Fog Enabled" object={this.props.material} property="fogEnabled" />
					<EditorInspectorNumberField label="Point Size" object={this.props.material} property="pointSize" min={0} />
					<EditorInspectorSwitchField label="Points Cloud" object={this.props.material} property="pointsCloud" />
				</EditorInspectorSectionField>
			</>
		);
	}
}
