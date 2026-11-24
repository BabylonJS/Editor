import { ReactNode } from "react";

import { Checkbox } from "../../../../../ui/shadcn/ui/checkbox";

export interface IUpdateResourcesSelectAllCheckboxProps {
	/**
	 * Defines the number of selected items.
	 */
	selectedCount: number;
	/**
	 * Defines the number of items that can be selected.
	 */
	selectableCount: number;
	/**
	 * Called when the user checks (true) or unchecks (false) the checkbox.
	 */
	onChange: (selected: boolean) => void;
}

/**
 * Checkbox shown in the header of the lists of the dialog to select or unselect all the items of the list at once. It is
 * checked when all the items are selected, indeterminate when only some of them are.
 */
export function UpdateResourcesSelectAllCheckbox(props: IUpdateResourcesSelectAllCheckboxProps): ReactNode {
	let checked: boolean | "indeterminate" = false;
	if (props.selectedCount && props.selectedCount === props.selectableCount) {
		checked = true;
	} else if (props.selectedCount) {
		checked = "indeterminate";
	}

	return <Checkbox checked={checked} disabled={!props.selectableCount} onCheckedChange={() => props.onChange(checked !== true)} />;
}
