import { useEffect, useState } from "react";

import { MdOutlineInfo } from "react-icons/md";

import { Switch } from "../../../../ui/shadcn/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorSwitchFieldProps extends IEditorInspectorFieldProps {
	onChange?: (value: boolean) => void;
}

export function EditorInspectorSwitchField(props: IEditorInspectorSwitchFieldProps) {
	const [value, setValue] = useState<boolean>(getInspectorPropertyValue(props.object, props.property) ?? false);

	useEffect(() => {
		setValue(getInspectorPropertyValue(props.object, props.property) ?? false);
	}, [props.object, props.property]);

	return (
		<div
			onClick={(ev) => {
				ev.stopPropagation();

				setValue(!value);
				setInspectorEffectivePropertyValue(props.object, props.property, !value);
				props.onChange?.(!value);

				if (!props.noUndoRedo) {
					registerSimpleUndoRedo({
						object: props.object,
						property: props.property,

						oldValue: value,
						newValue: !value,
					});
				}
			}}
			className="flex gap-2 justify-center items-center px-2 cursor-pointer hover:bg-white/10 hover:px-2 rounded-lg transition-all duration-300"
		>
			<div className="flex items-center gap-2 w-full text-ellipsis overflow-hidden whitespace-nowrap">
				{props.label}

				{props.tooltip && (
					<TooltipProvider delayDuration={0}>
						<Tooltip>
							<TooltipTrigger>
								<MdOutlineInfo size={24} />
							</TooltipTrigger>
							<TooltipContent className="bg-background text-muted-foreground text-sm p-2 border border-border whitespace-break-spaces">
								{props.tooltip}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}
			</div>

			<div className="flex justify-end w-14 py-2">
				<Switch checked={value} onChange={() => {}} />
			</div>
		</div>
	);
}
