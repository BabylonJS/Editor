import { ReactNode } from "react";

import { StandardMaterial, AbstractMesh } from "babylonjs";

import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorTextureField } from "../fields/texture";
import { EditorInspectorSectionField } from "../fields/section";

import { EditorAlphaModeField } from "./components/alpha";
import { EditorTransparencyModeField } from "./components/transparency";
import { EditorMaterialInspectorUtilsComponent } from "./components/utils";

export interface IEditorStandardMaterialInspectorProps {
	mesh?: AbstractMesh;
	material: StandardMaterial;
}

export function EditorStandardMaterialInspector(props: IEditorStandardMaterialInspectorProps): ReactNode {
	return (
		<>
			<EditorInspectorSectionField title="Material" label={props.material.getClassName()}>
				<EditorInspectorStringField label="Name" object={props.material} property="name" />
				<EditorInspectorSwitchField label="Back Face Culling" object={props.material} property="backFaceCulling" />
				<EditorInspectorNumberField label="Alpha" object={props.material} property="alpha" min={0} max={1} />

				<EditorAlphaModeField object={props.material} />

				<EditorTransparencyModeField object={props.material} />

				<EditorMaterialInspectorUtilsComponent mesh={props.mesh} material={props.material} />
			</EditorInspectorSectionField>

			<EditorInspectorSectionField title="Material Textures">
				<EditorInspectorTextureField object={props.material} title="Diffuse Texture" property="diffuseTexture" onChange={() => {}}>
					<EditorInspectorSwitchField label="Use Alpha" object={props.material} property="useAlphaFromDiffuseTexture" />
				</EditorInspectorTextureField>

				<EditorInspectorTextureField object={props.material} title="Bump Texture" property="bumpTexture" onChange={() => {}}>
					<EditorInspectorSwitchField label="Invert X" object={props.material} property="invertNormalMapX" />
					<EditorInspectorSwitchField label="Invert Y" object={props.material} property="invertNormalMapY" />
					<EditorInspectorSwitchField label="Use Parallax" object={props.material} property="useParallax" onChange={() => {}} />

					{props.material.useParallax && (
						<>
							<EditorInspectorSwitchField label="Use Parallax Occlusion" object={props.material} property="useParallaxOcclusion" />
							<EditorInspectorNumberField label="Parallax Scale Bias" object={props.material} property="parallaxScaleBias" />
						</>
					)}
				</EditorInspectorTextureField>

				<EditorInspectorTextureField object={props.material} title="Specular Texture" property="specularTexture" />
				<EditorInspectorTextureField object={props.material} title="Ambient Texture" property="ambientTexture" onChange={() => {}}>
					{props.material.ambientTexture && (
						<>
							<EditorInspectorSwitchField label="Use Gray Scale" object={props.material} property="useAmbientInGrayScale" />
							<EditorInspectorNumberField label="Strength" object={props.material} property="ambientTextureStrength" min={0} />
						</>
					)}
				</EditorInspectorTextureField>
				<EditorInspectorTextureField object={props.material} title="Opacity Texture" property="opacityTexture" />
				<EditorInspectorTextureField object={props.material} title="Emissive Texture" property="emissiveTexture" />

				<EditorInspectorTextureField object={props.material} title="Reflection Texture" property="reflectionTexture" acceptCubeTexture onChange={() => {}} />
			</EditorInspectorSectionField>

			<EditorInspectorSectionField title="Material Colors">
				<EditorInspectorColorField label={<div className="w-14">Diffuse</div>} object={props.material} property="diffuseColor" />
				<EditorInspectorColorField label={<div className="w-14">Specular</div>} object={props.material} property="specularColor" />
				<EditorInspectorColorField label={<div className="w-14">Ambient</div>} object={props.material} property="ambientColor" />
				<EditorInspectorColorField label={<div className="w-14">Emissive</div>} object={props.material} property="emissiveColor" />
			</EditorInspectorSectionField>

			<EditorInspectorSectionField title="Specular Properties">
				<EditorInspectorNumberField label="Specular Power" object={props.material} property="specularPower" min={0} />
				<EditorInspectorNumberField label="Direct Intensity" object={props.material} property="directIntensity" min={0} />
				<EditorInspectorNumberField label="Environment Intensity" object={props.material} property="environmentIntensity" min={0} />
				<EditorInspectorNumberField label="Emissive Intensity" object={props.material} property="emissiveIntensity" min={0} />
				<EditorInspectorNumberField label="Specular Intensity" object={props.material} property="specularIntensity" min={0} />
			</EditorInspectorSectionField>

			<EditorInspectorSectionField title="Misc">
				<EditorInspectorSwitchField label="Disable Lighting" object={props.material} property="disableLighting" />
				<EditorInspectorSwitchField label="Use Specular Over Alpha" object={props.material} property="useSpecularOverAlpha" />
				<EditorInspectorSwitchField label="Separate Culling Pass" object={props.material} property="separateCullingPass" />
				<EditorInspectorNumberField label="Z Offset" object={props.material} property="zOffset" />
				<EditorInspectorNumberField label="Z Offset Units" object={props.material} property="zOffsetUnits" />
				<EditorInspectorSwitchField label="Fog Enabled" object={props.material} property="fogEnabled" />
			</EditorInspectorSectionField>
		</>
	);
}
