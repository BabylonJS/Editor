import { ReactNode } from "react";

import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";
import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";

import { type EffectNode, EffectSolidParticleSystem, EffectParticleSystem, EmissionBurst, Value } from "babylonjs-editor-tools";
import { EffectValueEditor } from "./value-editor";

export interface IEffectEditorEmissionPropertiesProps {
	nodeData: EffectNode;
	onChange: () => void;
}

export function EffectEditorEmissionProperties(props: IEffectEditorEmissionPropertiesProps): ReactNode {
	const { nodeData, onChange } = props;

	if (nodeData.type !== "particle" || !nodeData.system) {
		return null;
	}

	const system = nodeData.system;

	return (
		<>
			{/* Looping / Duration / Prewarm / OnlyUsedByOther */}
			<EditorInspectorSwitchField object={system as any} property="isLooping" label="Looping" onChange={onChange} />
			<EditorInspectorNumberField
				object={system as any}
				property={"targetStopDuration" in system ? "targetStopDuration" : "duration"}
				label="Duration"
				min={0}
				step={0.1}
				onChange={onChange}
			/>
			<EditorInspectorSwitchField object={system as any} property="prewarm" label="Prewarm" onChange={onChange} />
			<EditorInspectorSwitchField object={system as any} property="onlyUsedByOther" label="Only Used By Other System" onChange={onChange} />

			{/* Emit Over Time */}
			<EditorInspectorSectionField title="Emit Over Time">
				<EffectValueEditor
					label="Emit Over Time"
					value={(system as any).emissionOverTime as Value | undefined}
					onChange={(val) => {
						(system as any).emissionOverTime = val;
						onChange();
					}}
				/>
			</EditorInspectorSectionField>

			{/* Emit Over Distance */}
			<EditorInspectorSectionField title="Emit Over Distance">
				<EffectValueEditor
					label="Emit Over Distance"
					value={(system as any).emissionOverDistance as Value | undefined}
					onChange={(val) => {
						(system as any).emissionOverDistance = val;
						onChange();
					}}
				/>
			</EditorInspectorSectionField>

			{/* Emit Power (min/max) - только для base (есть min/maxEmitPower) */}
			{system instanceof EffectParticleSystem && (
				<EditorInspectorBlockField>
					<div className="px-2">Emit Power</div>
					<div className="flex items-center">
						<EditorInspectorNumberField grayLabel object={system} property="minEmitPower" label="Min" min={0} onChange={onChange} />
						<EditorInspectorNumberField grayLabel object={system} property="maxEmitPower" label="Max" min={0} onChange={onChange} />
					</div>
				</EditorInspectorBlockField>
			)}

			{/* Bursts */}
			{renderBursts(system as any, onChange)}
		</>
	);
}

function renderBursts(system: EffectParticleSystem | EffectSolidParticleSystem, onChange: () => void): ReactNode {
	const bursts: (EmissionBurst & { cycle?: number; interval?: number; probability?: number })[] = Array.isArray((system as any).emissionBursts)
		? (system as any).emissionBursts
		: [];

	const addBurst = () => {
		bursts.push({
			time: 0,
			count: 1,
			cycle: 1,
			interval: 0,
			probability: 1,
		});
		(system as any).emissionBursts = bursts;
		onChange();
	};

	const removeBurst = (index: number) => {
		bursts.splice(index, 1);
		(system as any).emissionBursts = bursts;
		onChange();
	};

	return (
		<EditorInspectorSectionField title="Bursts">
			<div className="flex flex-col gap-3 px-2">
				{bursts.map((burst, idx) => (
					<div key={idx} className="border border-border rounded p-2 flex flex-col gap-2">
						<div className="flex justify-between items-center text-sm font-medium">
							<div>Burst #{idx + 1}</div>
							<button className="text-red-500" onClick={() => removeBurst(idx)}>
								Remove
							</button>
						</div>
						<div className="flex flex-col gap-2">
							<EffectValueEditor
								label="Time"
								value={burst.time as Value}
								onChange={(val) => {
									burst.time = val as Value;
									onChange();
								}}
							/>
							<EffectValueEditor
								label="Count"
								value={burst.count as Value}
								onChange={(val) => {
									burst.count = val as Value;
									onChange();
								}}
							/>
							<EditorInspectorNumberField object={burst as any} property="cycle" label="Cycle" min={0} step={1} onChange={onChange} />
							<EditorInspectorNumberField object={burst as any} property="interval" label="Interval" min={0} step={0.01} onChange={onChange} />
							<EditorInspectorNumberField object={burst as any} property="probability" label="Probability" min={0} max={1} step={0.01} onChange={onChange} />
						</div>
					</div>
				))}
				<button className="px-2 py-1 border border-border rounded" onClick={addBurst}>
					Add Burst
				</button>
			</div>
		</EditorInspectorSectionField>
	);
}
