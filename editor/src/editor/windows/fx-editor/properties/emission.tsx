import { ReactNode } from "react";

import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";
import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";

import { Button } from "../../../../ui/shadcn/ui/button";
import { HiOutlineTrash } from "react-icons/hi2";
import { IoAddSharp } from "react-icons/io5";

import { IFXParticleData } from "./types";

export interface IFXEditorEmissionPropertiesProps {
	particleData: IFXParticleData;
	onChange: () => void;
}

export function FXEditorEmissionProperties(props: IFXEditorEmissionPropertiesProps): ReactNode {
	const { particleData, onChange } = props;

	return (
		<>
			<EditorInspectorSwitchField object={particleData.emission} property="looping" label="Looping" />
			<EditorInspectorNumberField object={particleData.emission} property="duration" label="Duration" min={0} step={0.1} />
			<EditorInspectorSwitchField object={particleData.emission} property="prewarm" label="Prewarm" />
			<EditorInspectorSwitchField object={particleData.emission} property="onlyUsedByOtherSystem" label="Only Used by other system" />
			<EditorInspectorNumberField object={particleData.emission} property="emitOverTime" label="Emit Over Time" min={0} step={0.1} />
			<EditorInspectorNumberField object={particleData.emission} property="emitOverDistance" label="Emit Over Distance" min={0} step={0.1} />

			<EditorInspectorSectionField title="Bursts">
				{particleData.bursts.map((burst, index) => (
					<EditorInspectorSectionField
						key={burst.id || `burst-${index}`}
						title={
							<div className="flex items-center justify-between w-full">
								<span>Burst {index + 1}</span>
								<Button
									variant="ghost"
									className="p-2 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
									onClick={(e) => {
										e.stopPropagation();
										particleData.bursts.splice(index, 1);
										onChange();
									}}
								>
									<HiOutlineTrash className="w-4 h-4" />
								</Button>
							</div>
						}
					>
						<EditorInspectorNumberField object={burst} property="time" label="Time" min={0} step={0.1} />
						<EditorInspectorNumberField object={burst} property="count" label="Count" min={0} step={1} />
						<EditorInspectorNumberField object={burst} property="cycle" label="Cycle" min={0} step={1} />
						<EditorInspectorNumberField object={burst} property="interval" label="Interval" min={0} step={0.1} />
						<EditorInspectorNumberField object={burst} property="probability" label="Probability" min={0} max={1} step={0.01} />
					</EditorInspectorSectionField>
				))}
				<Button
					variant="secondary"
					className="flex items-center gap-2 w-full"
					onClick={() => {
						particleData.bursts.push({
							id: `burst-${Date.now()}-${Math.random()}`,
							time: 0,
							count: 10,
							cycle: 1,
							interval: 1,
							probability: 1.0,
						});
						onChange();
					}}
				>
					<IoAddSharp className="w-6 h-6" /> Add
				</Button>
			</EditorInspectorSectionField>
		</>
	);
}
