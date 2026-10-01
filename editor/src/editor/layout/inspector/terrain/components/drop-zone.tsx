import { CSSProperties, DragEvent, PropsWithChildren, useRef, useState } from "react";

import type { Mesh } from "babylonjs";

import type { Editor } from "../../../../main";

import { executeTerrainDropAction, predictTerrainDraggedPaths, readTerrainDropPathsAsync, reportTerrainTabError } from "../drop-actions";
import { TERRAIN_DROP_PENDING_TEXT, formatTerrainDropAction, routeTerrainDrop, type ITerrainDropContext, type TerrainDropAction } from "../drop-routing";

import { TerrainDropOverlay } from "./drop-overlay";

/** Highlight of a drop zone while a drag hovers it (§1.9). */
export const TERRAIN_DROP_ZONE_HIGHLIGHT_CLASS = "outline outline-2 -outline-offset-2 outline-primary/60";

/**
 * Whether the drag carries assets of the assets browser or OS files (§1.9): `types` includes "assets" or "Files".
 * @param dataTransfer defines the data transfer of the drag event.
 */
export function isTerrainDragEventAccepted(dataTransfer: DataTransfer | null | undefined): boolean {
	const types = dataTransfer?.types;
	if (!types) {
		return false;
	}

	return Array.from(types).some((type) => type === "assets" || type === "Files");
}

export interface ITerrainDropZoneProps extends PropsWithChildren {
	/** The editor reference. */
	editor: Editor;
	/** Target terrain of the actions (null: nothing can be dropped, the router answers "Create a terrain first."). */
	mesh: Mesh | null;
	/** Routing context of the zone (§4.19): zone, category, terrain state, layer and slot. Read at every event. */
	context: ITerrainDropContext;
	/**
	 * Runs the routed action instead of executeTerrainDropAction (e.g. to assign a map in place). Return (or resolve) false to let
	 * executeTerrainDropAction run after it.
	 */
	onDropAction?: (action: TerrainDropAction, paths: string[]) => void | boolean | Promise<void | boolean>;
	/** Called once the drop was processed (after the action ran), with the routed action. */
	onDropped?: (action: TerrainDropAction) => void;
	/** Resolves layer ids to names for the overlay texts ("Set the mask of “Rock”"). */
	getLayerName?: (layerId: string) => string | null | undefined;
	/** When true the zone ignores drags. */
	disabled?: boolean;
	/** Shows the TerrainDropOverlay naming the action inside the zone during a drag (the zone becomes `relative`). */
	overlay?: boolean;
	/** Classes of the zone element. */
	className?: string;
	/** Classes added while a drag hovers the zone. Default TERRAIN_DROP_ZONE_HIGHLIGHT_CLASS. */
	dragOverClassName?: string;
	/** Style of the zone element. */
	style?: CSSProperties;
	/** Tooltip of the zone element. */
	title?: string;
}

/**
 * Routed drop zone of the Terrain tab (§1.9, §4.19): accepts assets of the assets browser and OS files (and folders, expanded recursively),
 * highlights itself during the drag, routes the files with routeTerrainDrop(context) and runs the action (executeTerrainDropAction by default).
 * These zones are the only drop targets of the tab: files dropped anywhere else are not handled.
 */
export function TerrainDropZone(props: ITerrainDropZoneProps): JSX.Element {
	const [dragOver, setDragOver] = useState(false);
	const [overlayText, setOverlayText] = useState<string | null>(null);
	const [overlayDisabled, setOverlayDisabled] = useState(false);

	const dragOverRef = useRef(false);

	function setDragState(over: boolean, text: string | null, disabled: boolean): void {
		if (dragOverRef.current !== over) {
			dragOverRef.current = over;
			setDragOver(over);
		}

		setOverlayText((previous) => (previous === text ? previous : text));
		setOverlayDisabled((previous) => (previous === disabled ? previous : disabled));
	}

	function handleDragOver(ev: DragEvent<HTMLDivElement>): void {
		try {
			if (props.disabled || !isTerrainDragEventAccepted(ev.dataTransfer)) {
				return;
			}

			ev.preventDefault();

			const predicted = predictTerrainDraggedPaths(props.editor, ev.dataTransfer);
			const action = predicted ? routeTerrainDrop(props.context, predicted) : null;
			const none = action?.type === "none";

			ev.dataTransfer.dropEffect = none ? "none" : "copy";

			const text = action ? formatTerrainDropAction(action, { getLayerName: props.getLayerName }) : null;
			setDragState(true, text, none);
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	function handleDragLeave(ev: DragEvent<HTMLDivElement>): void {
		try {
			if (ev.currentTarget.contains(ev.relatedTarget as Node | null)) {
				return;
			}

			setDragState(false, null, false);
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	function handleDrop(ev: DragEvent<HTMLDivElement>): void {
		if (props.disabled || !isTerrainDragEventAccepted(ev.dataTransfer)) {
			return;
		}

		ev.preventDefault();
		ev.stopPropagation();

		setDragState(false, null, false);

		// The DataTransfer is unreadable once the event returns: the paths are read synchronously, the folders expanded afterwards.
		const pathsPromise = readTerrainDropPathsAsync(props.editor, ev.dataTransfer);
		const context = { ...props.context };

		void (async () => {
			try {
				const paths = await pathsPromise;
				if (!paths.length) {
					return;
				}

				const action = routeTerrainDrop(context, paths);

				let handled: void | boolean = false;
				if (props.onDropAction) {
					handled = await props.onDropAction(action, paths);
				}

				if (!props.onDropAction || handled === false) {
					await executeTerrainDropAction(props.editor, props.mesh, action, { paths, zone: context.zone });
				}

				props.onDropped?.(action);
			} catch (e) {
				reportTerrainTabError(props.editor, e);
			}
		})();
	}

	const highlight = dragOver ? (props.dragOverClassName ?? TERRAIN_DROP_ZONE_HIGHLIGHT_CLASS) : "";

	return (
		<div
			data-terrain-drop-zone={props.context.zone}
			title={props.title}
			style={props.style}
			className={`${props.overlay ? "relative" : ""} ${props.className ?? ""} ${highlight}`}
			onDragOver={(ev) => handleDragOver(ev)}
			onDragLeave={(ev) => handleDragLeave(ev)}
			onDrop={(ev) => handleDrop(ev)}
		>
			{props.children}

			{props.overlay && dragOver && <TerrainDropOverlay text={overlayText ?? TERRAIN_DROP_PENDING_TEXT} disabled={overlayDisabled} />}
		</div>
	);
}
