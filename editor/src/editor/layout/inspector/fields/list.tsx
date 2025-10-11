import { ReactNode, useEffect, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../ui/shadcn/ui/select";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorListFieldItem {
	text: string;
	value: any;

	icon?: ReactNode;
	label?: string;
}

export interface IEditorInspectorListFieldProps extends IEditorInspectorFieldProps {
	items: IEditorInspectorListFieldItem[];

	onChange?: (value: any, oldValue: any) => void;
}

export function EditorInspectorListField(props: IEditorInspectorListFieldProps) {
	const [selectedItem, setSelectedItem] = useState<IEditorInspectorListFieldItem | null>(getStartValue());
	const [oldSelectedItem, setOldSelectedItem] = useState<IEditorInspectorListFieldItem | null>(getStartValue());

	useEffect(() => {
		setSelectedItem(getStartValue());
		setOldSelectedItem(getStartValue());
	}, [props.object, props.property, props.items]);

	function getStartValue() {
		const property = getInspectorPropertyValue(props.object, props.property);

		return props.items.find((i) => i.value === property) ?? null;
	}

	function handleSetValue(value: string) {
		const item = props.items.find((i) => i.value === value);
		if (!item || item?.value === selectedItem?.value) {
			return;
		}

		const oldValue = getInspectorPropertyValue(props.object, props.property);

		setSelectedItem(item);
		setInspectorEffectivePropertyValue(props.object, props.property, item.value);

		props.onChange?.(item.value, oldValue);

		if (oldSelectedItem && item.value !== oldSelectedItem.value && !props.noUndoRedo) {
			registerSimpleUndoRedo({
				object: props.object,
				property: props.property,

				oldValue: oldSelectedItem.value,
				newValue: item.value,
			});

			setOldSelectedItem(item);
		}
	}

	return (
		<div className="flex gap-2 items-center px-2">
			{props.label && <div className="w-1/3 text-ellipsis overflow-hidden whitespace-nowrap">{props.label}</div>}

			<Select value={selectedItem?.value} onValueChange={(v) => handleSetValue(v)}>
				<SelectTrigger className={`${props.label ? "w-2/3" : "w-full"}`}>
					<SelectValue placeholder="Select Value..." />
				</SelectTrigger>
				<SelectContent>
					{props.items.map((item) => (
						<SelectItem key={item.text} value={item.value}>
							<div className="flex gap-2 items-center">
								{item.icon}
								{item.text}
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
