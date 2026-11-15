import { Light } from "babylonjs";

import { Editor } from "../../../../main";

import { registerUndoRedo } from "../../../../../tools/undoredo";
import { isDirectionalLight } from "../../../../../tools/guards/nodes";
import {
	getVolumetricLightOcclusionMode,
	getVolumetricLightColorObject,
	getVolumetricLightConfigurationProxy,
	isVolumetricLightingAvailable,
} from "../../../../../tools/light/volumetric";

import { markVolumetricLightsDirty } from "../../../../rendering/volumetric-lighting";

import { EditorInspectorColorField } from "../../fields/color";
import { EditorInspectorSwitchField } from "../../fields/switch";
import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSectionField } from "../../fields/section";

export interface IEditorLightVolumetricInspectorProps {
	light: Light;
	editor: Editor;
}

/**
 * Draws the "Volumetric Lighting" section of the inspector of a light. Each light of the scene, including
 * the ones that live inside a clustered light container, is configured individually here.
 */
export function EditorLightVolumetricInspector(props: IEditorLightVolumetricInspectorProps) {
	if (!isVolumetricLightingAvailable(props.light)) {
		return null;
	}

	const configuration = getVolumetricLightConfigurationProxy(props.light);
	const colorObject = getVolumetricLightColorObject(props.light);
	const occlusion = getVolumetricLightOcclusionMode(props.light, props.editor);

	return (
		<EditorInspectorSectionField title="Volumetric Lighting" tooltip="Makes this light produce light shafts in the participating medium of the scene.">
			<EditorInspectorSwitchField
				noUndoRedo
				object={configuration}
				property="enabled"
				label="Enabled"
				onChange={(value) => {
					const oldValue = !value;

					registerUndoRedo({
						undo: () => {
							configuration.enabled = oldValue;
							props.editor.layout.inspector.forceUpdate();
						},
						redo: () => {
							configuration.enabled = value;
							props.editor.layout.inspector.forceUpdate();
						},
					});

					markVolumetricLightsDirty();
					props.editor.layout.inspector.forceUpdate();
				}}
			/>

			{configuration.enabled && (
				<>
					<EditorInspectorNumberField object={configuration} property="volumeIntensity" label="Volume Intensity" min={0} step={0.0001} />
					<EditorInspectorNumberField object={configuration} property="anisotropy" label="Scattering Direction" min={-0.95} max={0.95} step={0.01} />

					<EditorInspectorSwitchField
						object={configuration}
						property="useCustomColor"
						label="Use Custom Color"
						onChange={() => {
							markVolumetricLightsDirty();
							props.editor.layout.inspector.forceUpdate();
						}}
					/>

					{configuration.useCustomColor && <EditorInspectorColorField object={colorObject} property="color" label={<div className="w-14">Color</div>} />}

					<EditorInspectorSwitchField
						object={configuration}
						property="castVolumetricShadows"
						label="Occluded By Geometry"
						onChange={() => {
							markVolumetricLightsDirty();
							props.editor.layout.inspector.forceUpdate();
						}}
					/>

					{configuration.castVolumetricShadows && occlusion.usesShadowMap && (
						<EditorInspectorNumberField object={configuration} property="shadowDarkness" label="Shadow Strength" min={0} max={1} step={0.01} />
					)}

					{!isDirectionalLight(props.light) && (
						<EditorInspectorNumberField object={configuration} property="rangeMultiplier" label="Range Multiplier" min={0} max={1} step={0.01} />
					)}
				</>
			)}
		</EditorInspectorSectionField>
	);
}
