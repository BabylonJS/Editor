import { ReactNode, useState } from "react";

import { CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons";

import { Button } from "../../../../../ui/shadcn/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../../ui/shadcn/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../../../../ui/shadcn/ui/command";

export interface IUpdateResourcesMatchSelectProps<T> {
	/**
	 * Defines the currently selected choice, or null if none.
	 */
	value: T | null;
	/**
	 * Defines the list of the available choices.
	 */
	choices: T[];
	/**
	 * Defines whether or not the select is disabled.
	 */
	disabled?: boolean;
	/**
	 * Returns the text shown for the given choice.
	 */
	getLabel: (choice: T) => string;
	/**
	 * Returns an optional text shown under the label of the given choice to tell apart choices having the same label.
	 */
	getDescription?: (choice: T) => string | null;
	/**
	 * Called when the user selects a choice, or "None".
	 */
	onChange: (value: T | null) => void;
}

/**
 * Defines the classes of the items of the list. cmdk sets "data-disabled" to "false" on the enabled items, which the classes
 * of the command items of shadcn ("data-[disabled]:...") consider as disabled.
 */
const itemClassName = "justify-between !pointer-events-auto !opacity-100";

/**
 * Searchable select used to choose the object of the asset corresponding to an object of the scene. Choices are identified by
 * their index so objects having the same name can be told apart. Clicks don't propagate to the row containing the select.
 */
export function UpdateResourcesMatchSelect<T>(props: IUpdateResourcesMatchSelectProps<T>): ReactNode {
	const [open, setOpen] = useState(false);

	/**
	 * Selects the given choice and closes the list.
	 */
	function select(choice: T | null): void {
		setOpen(false);

		if (choice !== props.value) {
			props.onChange(choice);
		}
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={props.disabled}
					className="w-full justify-between font-normal"
					onClick={(ev) => ev.stopPropagation()}
				>
					<span className={`truncate ${props.value === null ? "text-muted-foreground" : ""}`}>{props.value === null ? "None" : props.getLabel(props.value)}</span>
					<ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>

			<PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" onClick={(ev) => ev.stopPropagation()}>
				<Command>
					<CommandInput placeholder="Search..." />
					<CommandList>
						<CommandEmpty>No result found.</CommandEmpty>
						<CommandGroup>
							<CommandItem value="none" keywords={["None"]} onSelect={() => select(null)} className={itemClassName}>
								<span className="text-muted-foreground">None</span>
								<CheckIcon className={`h-4 w-4 ${props.value === null ? "opacity-100" : "opacity-0"}`} />
							</CommandItem>

							{props.choices.map((choice, index) => {
								const label = props.getLabel(choice);
								const description = props.getDescription?.(choice) ?? null;

								return (
									<CommandItem
										key={index}
										value={`${index}`}
										keywords={description ? [label, description] : [label]}
										onSelect={() => select(choice)}
										className={itemClassName}
									>
										<div className="flex flex-col overflow-hidden">
											<span className="truncate">{label}</span>
											{description && <span className="truncate text-xs text-muted-foreground">{description}</span>}
										</div>
										<CheckIcon className={`h-4 w-4 shrink-0 ${props.value === choice ? "opacity-100" : "opacity-0"}`} />
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
