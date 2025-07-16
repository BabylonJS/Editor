import { useEffect, useState } from "react";

import { MdOutlineInfo } from "react-icons/md";

import { Slider } from "../../../../ui/shadcn/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorSliderFieldProps extends IEditorInspectorFieldProps {
	min: number;
	max: number;
	step?: number;
	defaultValue?: number;
}

export function EditorInspectorSliderField(props: IEditorInspectorSliderFieldProps) {
	const [value, setValue] = useState(0);
	const [oldValue, setOldValue] = useState(0);

	useEffect(() => {
		const v = getInspectorPropertyValue(props.object, props.property) ?? 0;
		setValue(v);
		setOldValue(v);
	}, [props.object, props.property]);

	return (
		<div className="flex gap-2 px-2">
			{props.label &&
				<div className="flex items-center gap-2 text-ellipsis overflow-hidden whitespace-nowrap">
					<div>
						{props.label}
					</div>

					{props.tooltip &&
						<TooltipProvider delayDuration={0}>
							<Tooltip>
								<TooltipTrigger>
									<MdOutlineInfo size={24} />
								</TooltipTrigger>
								<TooltipContent className="bg-muted text-muted-foreground text-sm p-2">
									{props.tooltip}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					}
				</div>
			}

			<Slider
				min={props.min}
				max={props.max}
				step={props.step ?? 0.01}
				value={[value]}
				className="flex-1 px-5 py-2"
				onDoubleClick={() => {
					if (props.defaultValue !== undefined) {
						props.object[props.property] = props.defaultValue;
						setValue(props.defaultValue);
						setOldValue(props.defaultValue);
					}
				}}
				onValueChange={(result) => {
					const value = result[0];
					props.object[props.property] = value;
					setValue(value);
				}}
				onValueCommit={(result) => {
					const value = result[0];
					props.object[props.property] = value;

					if (value !== oldValue) {
						registerSimpleUndoRedo({
							object: props.object,
							property: props.property,

							newValue: result,
							oldValue: oldValue,
						});

						setValue(value);
						setOldValue(value);
					}
				}}
			/>
		</div>
	);
}
