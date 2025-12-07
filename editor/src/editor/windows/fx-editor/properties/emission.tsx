import { ReactNode } from "react";

import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";
import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";

import { Button } from "../../../../ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../../ui/shadcn/ui/dropdown-menu";
import { AiOutlinePlus, AiOutlineClose } from "react-icons/ai";

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
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => e.stopPropagation()}>
							<AiOutlinePlus className="w-4 h-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem
							onClick={() => {
								particleData.bursts.push({
									time: 0,
									count: 10,
									cycle: 1,
									interval: 1,
									probability: 1.0,
								});
								onChange();
							}}
						>
							Add Burst
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				{particleData.bursts.map((burst, index) => (
					<EditorInspectorSectionField key={index} title={`Burst ${index + 1}`}>
						<EditorInspectorNumberField object={burst} property="time" label="Time" min={0} step={0.1} />
						<EditorInspectorNumberField object={burst} property="count" label="Count" min={0} step={1} />
						<EditorInspectorNumberField object={burst} property="cycle" label="Cycle" min={0} step={1} />
						<EditorInspectorNumberField object={burst} property="interval" label="Interval" min={0} step={0.1} />
						<EditorInspectorNumberField object={burst} property="probability" label="Probability" min={0} max={1} step={0.01} />
						<Button
							variant="destructive"
							size="sm"
							onClick={() => {
								particleData.bursts.splice(index, 1);
								onChange();
							}}
							className="mt-2"
						>
							<AiOutlineClose className="w-4 h-4" /> Remove
						</Button>
					</EditorInspectorSectionField>
				))}
			</EditorInspectorSectionField>
		</>
	);
}
