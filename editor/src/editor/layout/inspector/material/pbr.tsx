import { Component, ReactNode } from "react";

import { PBRMaterial, AbstractMesh } from "babylonjs";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";

import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorTextureField } from "../fields/texture";
import { EditorInspectorSectionField } from "../fields/section";

import { EditorAlphaModeField } from "./components/alpha";
import { EditorTransparencyModeField } from "./components/transparency";
import { EditorMaterialInspectorUtilsComponent } from "./components/utils";

export interface IEditorPBRMaterialInspectorProps {
	mesh?: AbstractMesh;
	material: PBRMaterial;
}

export class EditorPBRMaterialInspector extends Component<IEditorPBRMaterialInspectorProps> {
	public constructor(props: IEditorPBRMaterialInspectorProps) {
		super(props);
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Material" label={this.props.material.getClassName()}>
					<EditorInspectorStringField label="Name" object={this.props.material} property="name" />
					<EditorInspectorSwitchField label="Back Face Culling" object={this.props.material} property="backFaceCulling" />
					<EditorInspectorNumberField label="Alpha" object={this.props.material} property="alpha" min={0} max={1} />

					<EditorAlphaModeField object={this.props.material} />

					<EditorTransparencyModeField object={this.props.material} />

					<EditorMaterialInspectorUtilsComponent mesh={this.props.mesh} material={this.props.material} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Material Textures">
					<EditorInspectorTextureField object={this.props.material} title="Albedo Texture" property="albedoTexture" onChange={() => this.forceUpdate()}>
						{this.props.material.albedoTexture && (
							<>
								<EditorInspectorSwitchField label="Use Alpha" object={this.props.material} property="useAlphaFromDiffuseTexture" />
								<EditorInspectorNumberField label="Alpha Cut Off" object={this.props.material} property="alphaCutOff" min={0} max={1} />
							</>
						)}
					</EditorInspectorTextureField>

					<EditorInspectorTextureField object={this.props.material} title="Bump Texture" property="bumpTexture" onChange={() => this.forceUpdate()}>
						{this.props.material.bumpTexture && (
							<>
								<EditorInspectorSwitchField label="Inverse X" object={this.props.material} property="invertNormalMapX" />
								<EditorInspectorSwitchField label="Inverse Y" object={this.props.material} property="invertNormalMapY" />
								<EditorInspectorSwitchField label="Use Parallax" object={this.props.material} property="useParallax" onChange={() => this.forceUpdate()} />

								{this.props.material.useParallax && (
									<>
										<EditorInspectorSwitchField label="Use Parallax Occlusion" object={this.props.material} property="useParallaxOcclusion" />
										<EditorInspectorNumberField label="Parallax Scale Bias" object={this.props.material} property="parallaxScaleBias" />
									</>
								)}
							</>
						)}
					</EditorInspectorTextureField>

					{!this.props.material.metallicTexture && (
						<>
							<EditorInspectorTextureField
								object={this.props.material}
								title="Reflectivity Texture"
								property="reflectivityTexture"
								onChange={() => this.forceUpdate()}
							/>
							<EditorInspectorTextureField
								object={this.props.material}
								title="Micro Surface Texture"
								property="microSurfaceTexture"
								onChange={() => this.forceUpdate()}
							/>
						</>
					)}

					<EditorInspectorTextureField object={this.props.material} title="Ambient Texture" property="ambientTexture" onChange={() => this.forceUpdate()}>
						{this.props.material.ambientTexture && (
							<>
								<EditorInspectorSwitchField label="Use Gray Scale" object={this.props.material} property="useAmbientInGrayScale" />
								<EditorInspectorNumberField label="Strength" object={this.props.material} property="ambientTextureStrength" min={0} />
							</>
						)}
					</EditorInspectorTextureField>

					<EditorInspectorTextureField object={this.props.material} title="Opacity Texture" property="opacityTexture" />
					<EditorInspectorTextureField
						object={this.props.material}
						title="Reflection Texture"
						property="reflectionTexture"
						acceptCubeTexture
						onChange={() => this.forceUpdate()}
					/>

					<EditorInspectorTextureField object={this.props.material} title="Metallic Texture" property="metallicTexture" onChange={() => this.forceUpdate()}>
						{this.props.material.metallicTexture && (
							<>
								<EditorInspectorSwitchField label="Use Roughness from alpha" object={this.props.material} property="useRoughnessFromMetallicTextureAlpha" />
								<EditorInspectorSwitchField label="Use Roughness from green" object={this.props.material} property="useRoughnessFromMetallicTextureGreen" />
								<EditorInspectorSwitchField label="Use Metallness From Blue" object={this.props.material} property="useMetallnessFromMetallicTextureBlue" />
								<EditorInspectorSwitchField
									label="Use Ambient From Red"
									object={this.props.material}
									property="useAmbientOcclusionFromMetallicTextureRed"
									onChange={() => this.forceUpdate()}
								/>

								{this.props.material.useAmbientOcclusionFromMetallicTextureRed && (
									<EditorInspectorNumberField label="Ambient Strength" object={this.props.material} property="ambientTextureStrength" min={0} />
								)}
							</>
						)}
					</EditorInspectorTextureField>

					<EditorInspectorTextureField object={this.props.material} title="Emissive Texture" property="emissiveTexture" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Material Colors">
					<EditorInspectorColorField label={<div className="w-14">Albedo</div>} object={this.props.material} property="albedoColor" />
					<EditorInspectorColorField label={<div className="w-14">Reflectivity</div>} object={this.props.material} property="reflectivityColor" />
					<EditorInspectorColorField label={<div className="w-14">Reflection</div>} object={this.props.material} property="reflectionColor" />
					<EditorInspectorColorField label={<div className="w-14">Ambient</div>} object={this.props.material} property="ambientColor" />
					<EditorInspectorColorField label={<div className="w-14">Emissive</div>} object={this.props.material} property="emissiveColor" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Metallic / Roughness">
					<EditorInspectorNumberField label="Metallic F0 Factor" object={this.props.material} property="metallicF0Factor" />

					<EditorInspectorSwitchField
						label="Metallic"
						object={{ checked: this.props.material.metallic !== null }}
						property="checked"
						noUndoRedo
						onChange={(v) => {
							registerSimpleUndoRedo({
								object: this.props.material,
								property: "metallic",
								oldValue: this.props.material.metallic,
								newValue: v ? 1 : null,
								executeRedo: true,
							});

							this.forceUpdate();
						}}
					/>

					{this.props.material.metallic !== null && <EditorInspectorNumberField label=" " object={this.props.material} property="metallic" min={0} max={1} />}

					<EditorInspectorSwitchField
						label="Roughness"
						object={{ checked: this.props.material.roughness !== null }}
						property="checked"
						noUndoRedo
						onChange={(v) => {
							registerSimpleUndoRedo({
								object: this.props.material,
								property: "roughness",
								oldValue: this.props.material.roughness,
								newValue: v ? 1 : null,
								executeRedo: true,
							});

							this.forceUpdate();
						}}
					/>

					{this.props.material.roughness !== null && <EditorInspectorNumberField label=" " object={this.props.material} property="roughness" min={0} max={1} />}
				</EditorInspectorSectionField>

				{this.props.material.metallic === null && this.props.material.roughness === null && (
					<EditorInspectorSectionField title="Micro Surface">
						<EditorInspectorNumberField label="Microsurface" object={this.props.material} property="microSurface" min={0} max={1} />
						{this.props.material.reflectivityTexture && (
							<>
								<EditorInspectorSwitchField
									label="Use Auto Micro Surface From Reflectivity Map"
									object={this.props.material}
									property="useAutoMicroSurfaceFromReflectivityMap"
								/>
								<EditorInspectorSwitchField
									label="Use Micro Surface From Reflectivity Map Alpha"
									object={this.props.material}
									property="useMicroSurfaceFromReflectivityMapAlpha"
								/>
							</>
						)}
					</EditorInspectorSectionField>
				)}

				<EditorInspectorSectionField title="Misc">
					<EditorInspectorNumberField label="Direct Intensity" object={this.props.material} property="directIntensity" min={0} />
					<EditorInspectorNumberField label="Environment Intensity" object={this.props.material} property="environmentIntensity" min={0} />
					<EditorInspectorSwitchField label="Unlit" object={this.props.material} property="unlit" />
					<EditorInspectorSwitchField label="Disable Lighting" object={this.props.material} property="disableLighting" />
					<EditorInspectorSwitchField label="Use Specular Over Alpha" object={this.props.material} property="useSpecularOverAlpha" />
					<EditorInspectorSwitchField label="Enable Specular Anti Aliasing" object={this.props.material} property="enableSpecularAntiAliasing" />
					<EditorInspectorSwitchField label="Force Irradiance In Fragment" object={this.props.material} property="forceIrradianceInFragment" />
					<EditorInspectorSwitchField label="Use Radiance Occlusion" object={this.props.material} property="useRadianceOcclusion" />
					<EditorInspectorSwitchField label="Use Physical Light Falloff" object={this.props.material} property="usePhysicalLightFalloff" />
					<EditorInspectorSwitchField label="Separate Culling Pass" object={this.props.material} property="separateCullingPass" />
					<EditorInspectorNumberField label="Z Offset" object={this.props.material} property="zOffset" />
				</EditorInspectorSectionField>
			</>
		);
	}
}
