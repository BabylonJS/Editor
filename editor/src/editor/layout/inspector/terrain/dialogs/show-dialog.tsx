import { ReactNode, useEffect } from "react";

import { showDialog, type DialogReturnType } from "../../../../../ui/dialog";

/** Dialog of the Terrain tab: showDialog with a close() that does nothing once the dialog is closed. */
export interface ITerrainDialog extends DialogReturnType {
	/** Whether the dialog is closed (close(), Escape, or any other close of showDialog). */
	readonly closed: boolean;
}

/**
 * showDialog for the dialogs of the Terrain tab (resize, heightmap and splat imports, brush settings), whose forms close the dialog themselves
 * once their asynchronous apply finished. Radix also closes the dialog on Escape (through showDialog's close()), and showDialog's close() is
 * not idempotent (a second call throws on document.body.removeChild, reported as a "Terrain tool error" right after the success toast): the
 * returned close() only closes a dialog that is still open.
 * @param title defines the title of the dialog.
 * @param children defines the content of the dialog.
 * @param asChild defines whether the content replaces the description element of the dialog.
 */
export function showTerrainDialog(title: ReactNode, children: ReactNode, asChild?: boolean): ITerrainDialog {
	const dialog = showDialog(title, children, asChild);

	let closed = false;
	void dialog.wait().then(() => {
		closed = true;
	});

	return {
		get closed(): boolean {
			return closed;
		},
		wait: () => dialog.wait(),
		close: () => {
			if (closed) {
				return;
			}

			closed = true;

			try {
				dialog.close();
			} catch (e) {
				// Already removed by a close in the same task (Escape): nothing is left to close.
			}
		},
	};
}

/**
 * Keydown listener (capture phase, document) of useTerrainDialogEscapeGuard: Escape doesn't dismiss the dialog (Radix only dismisses on
 * an Escape keydown whose default is not prevented).
 * @param ev defines the keydown event.
 */
export function preventTerrainDialogEscape(ev: KeyboardEvent): void {
	if (ev.key === "Escape") {
		ev.preventDefault();
	}
}

/**
 * While `active` (an apply runs and can't be cancelled: the Cancel button is disabled), Escape doesn't close the dialog: the change would
 * still be applied behind a closed dialog, and its opener would report it as not applied.
 * @param active defines whether Escape is blocked.
 */
export function useTerrainDialogEscapeGuard(active: boolean): void {
	useEffect(() => {
		if (!active) {
			return undefined;
		}

		document.addEventListener("keydown", preventTerrainDialogEscape, true);

		return () => {
			document.removeEventListener("keydown", preventTerrainDialogEscape, true);
		};
	}, [active]);
}
