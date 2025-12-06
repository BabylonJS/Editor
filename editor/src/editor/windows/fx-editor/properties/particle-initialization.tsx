import { ReactNode } from "react";

import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorColorField } from "../../../layout/inspector/fields/color";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import { IFXParticleData } from "./types";

export interface IFXEditorParticleInitializationPropertiesProps {
	particleData: IFXParticleData;
}

export function FXEditorParticleInitializationProperties(props: IFXEditorParticleInitializationPropertiesProps): ReactNode {
	const { particleData } = props;

	return (
		<>
			<EditorInspectorBlockField>
				<div className="px-2">Start Life</div>
				<div className="flex items-center">
					<EditorInspectorNumberField grayLabel object={particleData.particleInitialization.startLife} property="min" label="Min" min={0} step={0.1} />
					<EditorInspectorNumberField grayLabel object={particleData.particleInitialization.startLife} property="max" label="Max" min={0} step={0.1} />
				</div>
			</EditorInspectorBlockField>
			<EditorInspectorBlockField>
				<div className="px-2">Start Size</div>
				<div className="flex items-center">
					<EditorInspectorNumberField grayLabel object={particleData.particleInitialization.startSize} property="min" label="Min" min={0} step={0.01} />
					<EditorInspectorNumberField grayLabel object={particleData.particleInitialization.startSize} property="max" label="Max" min={0} step={0.01} />
				</div>
			</EditorInspectorBlockField>
			<EditorInspectorBlockField>
				<div className="px-2">Start Speed</div>
				<div className="flex items-center">
					<EditorInspectorNumberField grayLabel object={particleData.particleInitialization.startSpeed} property="min" label="Min" min={0} step={0.1} />
					<EditorInspectorNumberField grayLabel object={particleData.particleInitialization.startSpeed} property="max" label="Max" min={0} step={0.1} />
				</div>
			</EditorInspectorBlockField>
			<EditorInspectorColorField object={particleData.particleInitialization} property="startColor" label="Start Color" />
			<EditorInspectorBlockField>
				<div className="px-2">Start Rotation</div>
				<div className="flex items-center">
					<EditorInspectorNumberField grayLabel object={particleData.particleInitialization.startRotation} property="min" label="Min" asDegrees step={1} />
					<EditorInspectorNumberField grayLabel object={particleData.particleInitialization.startRotation} property="max" label="Max" asDegrees step={1} />
				</div>
			</EditorInspectorBlockField>
		</>
	);
}

