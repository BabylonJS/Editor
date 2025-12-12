import { ReactNode } from "react";

import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";
import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorColorField } from "../../../layout/inspector/fields/color";

import type { VFXEffectNode } from "../VFX";
import { VFXParticleSystem, VFXSolidParticleSystem } from "../VFX";

export interface IFXEditorParticleInitializationPropertiesProps {
	nodeData: VFXEffectNode;
	onChange?: () => void;
}

export function FXEditorParticleInitializationProperties(props: IFXEditorParticleInitializationPropertiesProps): ReactNode {
	const { nodeData } = props;
	const onChange = props.onChange || (() => {});

	if (nodeData.type !== "particle" || !nodeData.system) {
		return null;
	}

	const system = nodeData.system;

	// For VFXParticleSystem, show initialization properties
	if (system instanceof VFXParticleSystem) {
		return (
			<>
				<EditorInspectorBlockField>
					<div className="px-2">Life Time</div>
					<div className="flex items-center">
						<EditorInspectorNumberField grayLabel object={system} property="minLifeTime" label="Min" min={0} step={0.1} onChange={onChange} />
						<EditorInspectorNumberField grayLabel object={system} property="maxLifeTime" label="Max" min={0} step={0.1} onChange={onChange} />
					</div>
				</EditorInspectorBlockField>
				<EditorInspectorBlockField>
					<div className="px-2">Size</div>
					<div className="flex items-center">
						<EditorInspectorNumberField grayLabel object={system} property="minSize" label="Min" min={0} step={0.01} onChange={onChange} />
						<EditorInspectorNumberField grayLabel object={system} property="maxSize" label="Max" min={0} step={0.01} onChange={onChange} />
					</div>
				</EditorInspectorBlockField>
				<EditorInspectorBlockField>
					<div className="px-2">Speed (Emit Power)</div>
					<div className="flex items-center">
						<EditorInspectorNumberField grayLabel object={system} property="minEmitPower" label="Min" min={0} step={0.1} onChange={onChange} />
						<EditorInspectorNumberField grayLabel object={system} property="maxEmitPower" label="Max" min={0} step={0.1} onChange={onChange} />
					</div>
				</EditorInspectorBlockField>
				<EditorInspectorColorField object={system} property="color1" label="Start Color" onChange={onChange} />
				{system instanceof VFXParticleSystem && system.startColor && (
					<EditorInspectorColorField object={system} property="startColor" label="Start Color (VFX)" onChange={onChange} />
				)}
				{/* TODO: Add rotation properties */}
			</>
		);
	}

	// For VFXSolidParticleSystem, initialization properties are VFXValue format
	// TODO: Add proper editors for VFXValue (ConstantValue, IntervalValue, etc.)
	if (system instanceof VFXSolidParticleSystem) {
		// For now, show that properties exist but need proper VFXValue editors
		return (
			<>
				<div className="px-2 text-sm text-muted-foreground">
					Initialization properties are stored as VFXValue. Full editor support coming soon.
				</div>
				{/* TODO: Add VFXValue editors for startLife, startSize, startSpeed, startColor */}
			</>
		);
	}

	return null;
}
