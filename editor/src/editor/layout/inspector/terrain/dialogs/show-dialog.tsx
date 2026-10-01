import { ReactNode } from "react";

import { DialogReturnType, showDialog } from "../../../../../ui/dialog";

/**
 * Shows a dialog that is closed by its content: the given function gets the function that closes the dialog.
 */
export function showTerrainDialog(title: ReactNode, getContent: (close: () => void) => ReactNode): void {
	let dialog: DialogReturnType;
	dialog = showDialog(
		title,
		getContent(() => dialog.close()),
		true
	);
}
