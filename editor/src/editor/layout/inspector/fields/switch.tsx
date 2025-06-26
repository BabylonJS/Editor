import { useState } from "react";
import { Switch } from "@blueprintjs/core";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorSwitchFieldProps extends IEditorInspectorFieldProps {
    onChange?: (value: boolean) => void;
}

export function EditorInspectorSwitchField(props: IEditorInspectorSwitchFieldProps) {
	const [value, setValue] = useState<boolean>(getInspectorPropertyValue(props.object, props.property) ?? false);

	return (
		<div
			onClick={() => {
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
			<div className="w-full text-ellipsis overflow-hidden whitespace-nowrap">
				{props.label}
			</div>

			<div className="flex justify-end w-14 my-auto">
				<Switch
					checked={value}
					className="mt-2"
					onChange={(ev) => {
						setValue(ev.currentTarget.checked);
						setInspectorEffectivePropertyValue(props.object, props.property, ev.currentTarget.checked);
						props.onChange?.(ev.currentTarget.checked);

						if (!props.noUndoRedo) {
							registerSimpleUndoRedo({
								object: props.object,
								property: props.property,

								oldValue: !ev.currentTarget.checked,
								newValue: ev.currentTarget.checked,
							});
						}
					}}
				/>
			</div>
		</div>
	);
}
