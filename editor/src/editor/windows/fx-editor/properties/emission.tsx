import { ReactNode } from "react";

import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import type { VFXEffectNode } from "../VFX";
import { VFXParticleSystem, VFXSolidParticleSystem } from "../VFX";

export interface IFXEditorEmissionPropertiesProps {
	nodeData: VFXEffectNode;
	onChange: () => void;
}

export function FXEditorEmissionProperties(props: IFXEditorEmissionPropertiesProps): ReactNode {
	const { nodeData, onChange } = props;

	if (nodeData.type !== "particle" || !nodeData.system) {
		return null;
	}

	const system = nodeData.system;

	// For VFXParticleSystem, show emission properties
	if (system instanceof VFXParticleSystem) {
		return (
			<>
				<EditorInspectorSwitchField object={system} property="isLooping" label="Looping" onChange={onChange} />
				<EditorInspectorNumberField object={system} property="targetStopDuration" label="Duration" min={0} step={0.1} onChange={onChange} />
				<EditorInspectorNumberField object={system} property="emitRate" label="Emit Rate" min={0} step={0.1} onChange={onChange} />
				<EditorInspectorBlockField>
					<div className="px-2">Emit Power</div>
					<div className="flex items-center">
						<EditorInspectorNumberField grayLabel object={system} property="minEmitPower" label="Min" min={0} onChange={onChange} />
						<EditorInspectorNumberField grayLabel object={system} property="maxEmitPower" label="Max" min={0} onChange={onChange} />
					</div>
				</EditorInspectorBlockField>
				{/* TODO: Add prewarm, onlyUsedByOtherSystem, emitOverDistance properties */}
				{/* TODO: Add bursts support */}
			</>
		);
	}

	// For VFXSolidParticleSystem, show emission properties
	if (system instanceof VFXSolidParticleSystem) {
		return (
			<>
				<EditorInspectorSwitchField object={system} property="isLooping" label="Looping" onChange={onChange} />
				<EditorInspectorNumberField object={system} property="targetStopDuration" label="Duration" min={0} step={0.1} onChange={onChange} />
				<EditorInspectorNumberField object={system} property="emitRate" label="Emit Rate" min={0} step={0.1} onChange={onChange} />
				{/* TODO: Add prewarm, onlyUsedByOtherSystem, emitOverDistance properties */}
				{/* TODO: Add bursts support */}
			</>
		);
	}

	return null;
}
