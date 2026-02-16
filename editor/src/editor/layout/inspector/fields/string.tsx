import { useEffect, useState } from "react";
import { MdOutlineInfo } from "react-icons/md";

import { Textarea } from "../../../../ui/shadcn/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorStringFieldProps extends IEditorInspectorFieldProps {
	multiline?: boolean;
	onChange?: (value: string) => void;
}

export function EditorInspectorStringField(props: IEditorInspectorStringFieldProps) {
	const [value, setValue] = useState<string>(getInspectorPropertyValue(props.object, props.property) ?? "");
	const [oldValue, setOldValue] = useState<string>(getInspectorPropertyValue(props.object, props.property) ?? "");

	useEffect(() => {
		setValue(getInspectorPropertyValue(props.object, props.property) ?? "");
		setOldValue(getInspectorPropertyValue(props.object, props.property) ?? "");
	}, [props.object, props.property]);

	function handleChange(newValue: string) {
		setValue(newValue);
		setInspectorEffectivePropertyValue(props.object, props.property, newValue);

		props.onChange?.(newValue);
	}

	function handleBlur(newValue: string) {
		if (newValue !== oldValue && !props.noUndoRedo) {
			registerSimpleUndoRedo({
				object: props.object,
				property: props.property,

				oldValue,
				newValue: value,
			});

			setOldValue(newValue);
		}
	}

	return (
		<div className="flex gap-2 items-center px-2">
			<div className="flex items-center gap-2 w-1/3 text-ellipsis overflow-hidden whitespace-nowrap">
				{props.label}

				{props.tooltip && (
					<TooltipProvider delayDuration={0}>
						<Tooltip>
							<TooltipTrigger>
								<MdOutlineInfo size={24} />
							</TooltipTrigger>
							<TooltipContent className="bg-background text-muted-foreground text-sm p-2">{props.tooltip}</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}
			</div>

			{!props.multiline && (
				<input
					type="text"
					value={value}
					onChange={(ev) => handleChange(ev.currentTarget.value)}
					onKeyUp={(ev) => ev.key === "Enter" && ev.currentTarget.blur()}
					onBlur={(ev) => handleBlur(ev.currentTarget.value)}
					className="px-5 py-2 rounded-lg bg-muted-foreground/10 outline-none w-2/3"
				/>
			)}

			{props.multiline && (
				<Textarea
					value={value}
					onChange={(ev) => handleChange(ev.currentTarget.value)}
					onBlur={(ev) => handleBlur(ev.currentTarget.value)}
					className="px-5 py-2 rounded-lg bg-black/50 text-white/75 outline-none w-2/3"
				/>
			)}
		</div>
	);
}
