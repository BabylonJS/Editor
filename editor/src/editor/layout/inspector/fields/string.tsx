import { useState } from "react";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorStringFieldProps extends IEditorInspectorFieldProps {
    onChange?: (value: string) => void;
}

export function EditorInspectorStringField(props: IEditorInspectorStringFieldProps) {
	const [value, setValue] = useState<string>(getInspectorPropertyValue(props.object, props.property) ?? "");
	const [oldValue, setOldValue] = useState<string>(getInspectorPropertyValue(props.object, props.property) ?? "");

	return (
		<div className="flex gap-2 items-center px-2">
			<div className="w-1/2 text-ellipsis overflow-hidden whitespace-nowrap">
				{props.label}
			</div>

			<input
				type="text"
				value={value}
				onChange={(ev) => {
					setValue(ev.currentTarget.value);
					setInspectorEffectivePropertyValue(props.object, props.property, ev.currentTarget.value);

					props.onChange?.(ev.currentTarget.value);
				}}
				onKeyUp={(ev) => ev.key === "Enter" && ev.currentTarget.blur()}
				onBlur={(ev) => {
					if (ev.currentTarget.value !== oldValue && !props.noUndoRedo) {
						registerSimpleUndoRedo({
							object: props.object,
							property: props.property,

							oldValue,
							newValue: value,
						});

						setOldValue(ev.currentTarget.value);
					}
				}}
				className="px-5 py-2 rounded-lg bg-black/50 text-white/75 outline-none w-full"
			/>
		</div>
	);
}
