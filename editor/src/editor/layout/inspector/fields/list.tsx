import { ReactNode, useEffect, useState } from "react";

import { CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../ui/shadcn/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../ui/shadcn/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../../../ui/shadcn/ui/command";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorListFieldItem {
	key?: string;
	text: string;
	value: any;

	icon?: ReactNode;
	label?: string;
}

export interface IEditorInspectorListFieldProps extends IEditorInspectorFieldProps {
	search?: boolean;
	items: IEditorInspectorListFieldItem[];

	onChange?: (value: any, oldValue: any) => void;
}

export function EditorInspectorListField(props: IEditorInspectorListFieldProps) {
	const [open, setOpen] = useState(false);

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

	function SimpleList() {
		return (
			<Select value={selectedItem?.value} onValueChange={(v) => handleSetValue(v)}>
				<SelectTrigger className={`${props.label ? "w-2/3" : "w-full"}`}>
					<SelectValue placeholder="Select Value..." />
				</SelectTrigger>
				<SelectContent>
					{props.items.map((item) => (
						<SelectItem key={item.key ?? item.text} value={item.value}>
							<div className="flex gap-2 items-center">
								{item.icon}
								{item.text}
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	function SearchableList() {
		return (
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button variant="outline" role="combobox" aria-expanded={open} className={`${props.label ? "w-2/3" : "w-full"} justify-between`}>
						{selectedItem ? (
							<div className="flex gap-2 items-center">
								{selectedItem.icon}
								<div className={`!text-foreground ${selectedItem?.value === selectedItem.value ? "font-semibold" : ""}`}>{selectedItem.text}</div>
							</div>
						) : (
							"Select value..."
						)}
						<ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-full p-0">
					<Command>
						<CommandInput placeholder="Search..." />
						<CommandList>
							<CommandEmpty>No value found.</CommandEmpty>
							<CommandGroup>
								{props.items.map((item) => (
									<CommandItem
										key={item.key ?? item.text}
										value={item.value.toString()}
										onSelect={(v) => {
											const numberRegex = /^(?:-(?:[1-9](?:\d{0,2}(?:,\d{3})+|\d*))|(?:0|(?:[1-9](?:\d{0,2}(?:,\d{3})+|\d*))))(?:.\d+|)$/;
											if (v.match(numberRegex)) {
												handleSetValue(parseFloat(v) as any);
											} else {
												handleSetValue(v);
											}

											setOpen(false);
										}}
										className={`justify-between !pointer-events-auto ${selectedItem?.value === item.value ? "!opacity-100" : "hover:!opacity-100"}`}
									>
										<div className="flex gap-2 items-center">
											{item.icon}
											<div className={`!text-foreground ${selectedItem?.value === item.value ? "font-semibold" : ""}`}>{item.text}</div>
										</div>

										<CheckIcon className={`mr-2 h-4 w-4 ${selectedItem?.value === item.value ? "opacity-100" : "opacity-0"}`} />
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<div className="flex gap-2 items-center px-2">
			{props.label && <div className="w-1/3 text-ellipsis overflow-hidden whitespace-nowrap">{props.label}</div>}
			{props.search ? <SearchableList /> : <SimpleList />}
		</div>
	);
}
