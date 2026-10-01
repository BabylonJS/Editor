import { join } from "path/posix";

import { DragEvent, KeyboardEvent, ReactNode, useEffect, useState } from "react";

import { ipcRenderer } from "electron";

import { toast } from "sonner";

import { LuFolderOpen, LuImagePlus, LuPencil, LuRefreshCw, LuScanLine, LuSearch, LuSettings2, LuStar, LuTrash2 } from "react-icons/lu";

import type { Editor } from "../../../../main";

import { isDarwin } from "../../../../../tools/os";
import { onSelectedAssetChanged } from "../../../../../tools/observables";
import { openMultipleFilesDialog, openSingleFileDialog } from "../../../../../tools/dialog";
import { TERRAIN_BUILTIN_BRUSHES } from "../../../../../tools/terrain/core/builtin-brushes";
import { getProjectDirectory, isTerrainAbsolutePath, toTerrainAbsolutePath, toTerrainRelativePath } from "../../../../../tools/terrain/io/paths";
import { TerrainBrushLibrary, type ITerrainLibraryBrush } from "../../../../../tools/terrain/io/brush-library";

import { showConfirm, showPrompt } from "../../../../../ui/dialog";
import { Input } from "../../../../../ui/shadcn/ui/input";
import { Checkbox } from "../../../../../ui/shadcn/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../../ui/shadcn/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../../../../../ui/shadcn/ui/context-menu";

import { terrainSettings, updateTerrainSettings } from "../settings";
import { addTerrainBrushFiles, reportTerrainTabError, selectTerrainBrush } from "../drop-actions";
import type { ITerrainViewportStatus, TerrainViewportController } from "../viewport/controller";

import { TerrainBrushTile, getTerrainBrushTileDescription } from "../components/brush-tile";
import { showTerrainBrushSettingsDialog } from "../dialogs/brush-settings";

import { useTerrainSettingsRevision } from "./tools";

/** HTML5 drag and drop type of the brush tiles (drag-to-reorder, §1.9). */
export const TERRAIN_BRUSH_DRAG_TYPE = "terrain/brush";

/** The search input appears above the palette when the library has more brushes than this (§1.9). */
export const TERRAIN_BRUSH_SEARCH_THRESHOLD = 12;

/** Extensions of the "Import brush images…" dialog (§1.9). */
export const TERRAIN_BRUSH_DIALOG_EXTENSIONS: readonly string[] = ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"];

/** Brush selected when the selected brush is removed from the library. */
const TERRAIN_DEFAULT_BRUSH_ID = "builtin:round";

/** Folder of the copied and captured brushes (§6.9): only their files can be moved to the trash when removed. */
const TERRAIN_BRUSHES_FOLDER = "terrain-brushes/";

/** Built-ins shown while the library is not available (never loaded or failing): the palette keeps working with procedural brushes. */
const TERRAIN_FALLBACK_PALETTE_BRUSHES: readonly ITerrainLibraryBrush[] = TERRAIN_BUILTIN_BRUSHES.map((brush) => ({
	id: brush.id,
	name: brush.name,
	builtin: true,
	path: null,
	channel: "luminance",
	invert: false,
	defaults: null,
	favorite: false,
	missing: false,
}));

/**
 * Returns the brush library, null when it is not available (never throws).
 */
export function getTerrainBrushLibrary(): TerrainBrushLibrary | null {
	try {
		return TerrainBrushLibrary.Get();
	} catch (e) {
		return null;
	}
}

/**
 * Brushes of the palette in display order (favourites first, §6.9): `TerrainBrushLibrary.brushes`, or the built-ins when the library is not
 * available or still empty.
 */
export function getTerrainPaletteBrushes(): readonly ITerrainLibraryBrush[] {
	try {
		const brushes = getTerrainBrushLibrary()?.brushes ?? [];
		if (brushes.length > 0) {
			return brushes;
		}
	} catch (e) {
		// Library not available: built-ins only.
	}

	return TERRAIN_FALLBACK_PALETTE_BRUSHES;
}

/**
 * Display name of a brush id (Brush section label, §1.4): the library name, the built-in name, else the id.
 * @param brushId defines the id of the brush.
 */
export function getTerrainBrushDisplayName(brushId: string): string {
	try {
		const brush = getTerrainBrushLibrary()?.getBrush(brushId);
		if (brush) {
			return brush.name;
		}
	} catch (e) {
		// Library not available: built-in names below.
	}

	return TERRAIN_BUILTIN_BRUSHES.find((brush) => brush.id === brushId)?.name ?? brushId;
}

/**
 * Brushes matching the search text (case insensitive, name or path); every brush when the text is empty.
 * @param brushes defines the brushes in display order.
 * @param search defines the text of the search input.
 */
export function filterTerrainPaletteBrushes(brushes: readonly ITerrainLibraryBrush[], search: string): readonly ITerrainLibraryBrush[] {
	const query = search.trim().toLowerCase();
	if (!query) {
		return brushes;
	}

	return brushes.filter((brush) => brush.name.toLowerCase().includes(query) || (brush.path?.toLowerCase().includes(query) ?? false));
}

/**
 * New display order of the non-favourite brushes after dropping `draggedId` before `beforeId` (null: at the end), as expected by
 * TerrainBrushLibrary.reorder (§1.9, §6.9: favourites keep their relative order and are not part of the list). null when nothing changes
 * or when one of the brushes is not a non-favourite brush of the list.
 * @param brushes defines every brush of the library in display order.
 * @param draggedId defines the dragged brush.
 * @param beforeId defines the brush the dragged one is dropped before (null: after the last one).
 */
export function computeTerrainBrushReorder(brushes: readonly ITerrainLibraryBrush[], draggedId: string, beforeId: string | null): string[] | null {
	const ids = brushes.filter((brush) => !brush.favorite).map((brush) => brush.id);
	const from = ids.indexOf(draggedId);

	if (from < 0 || draggedId === beforeId) {
		return null;
	}

	const next = ids.slice();
	next.splice(from, 1);

	const to = beforeId === null ? next.length : next.indexOf(beforeId);
	if (to < 0) {
		return null;
	}

	next.splice(to, 0, draggedId);

	return next.every((id, index) => id === ids[index]) ? null : next;
}

/**
 * Whether the drag carries a brush tile of the palette (private type, §1.9).
 * @param dataTransfer defines the data transfer of the drag event.
 */
export function isTerrainBrushTileDrag(dataTransfer: DataTransfer | null | undefined): boolean {
	return !!dataTransfer && Array.from(dataTransfer.types ?? []).includes(TERRAIN_BRUSH_DRAG_TYPE);
}

/** Interval (ms) of the palette's check of the missing brush files (§1.9 missing tiles); the library re-checks the files at most every second. */
export const TERRAIN_PALETTE_MISSING_POLL_MS = 1000;

/**
 * Signature of the missing state of the brushes (ids of the missing ones, in order): changes when a brush file is deleted, restored or relinked.
 * @param brushes defines the brushes of the palette.
 */
export function getTerrainBrushMissingSignature(brushes: readonly Pick<ITerrainLibraryBrush, "id" | "missing">[]): string {
	return brushes
		.filter((brush) => brush.missing)
		.map((brush) => brush.id)
		.join("|");
}

/**
 * Watches the missing state of the brushes and calls `onChange` when it changed. The library re-checks the files when its brushes are READ
 * (at most every second) but never notifies from that getter, so without this watcher a file deleted or restored in the file manager only
 * showed on the next unrelated re-render of the palette: the tile stayed normal and its context menu offered "Replace image…" instead of
 * "Relink…" (§1.9). Reads every `intervalMs` and when the window gets the focus back (files are usually deleted in the file manager).
 * @param read defines the function returning the brushes (TerrainBrushLibrary.brushes through getTerrainPaletteBrushes).
 * @param onChange defines the function called when the missing state changed.
 * @param intervalMs defines the polling interval.
 * @returns the function that stops watching.
 */
export function watchTerrainBrushMissingState(
	read: () => readonly Pick<ITerrainLibraryBrush, "id" | "missing">[],
	onChange: () => void,
	intervalMs: number = TERRAIN_PALETTE_MISSING_POLL_MS
): () => void {
	let signature: string | null = null;

	const check = (): void => {
		try {
			const next = getTerrainBrushMissingSignature(read());
			if (signature !== null && next !== signature) {
				onChange();
			}

			signature = next;
		} catch (e) {
			// The library is not available (no project): nothing to watch.
		}
	};

	check();

	const interval = setInterval(check, intervalMs);
	const hasWindow = typeof window !== "undefined" && typeof window.addEventListener === "function";
	if (hasWindow) {
		window.addEventListener("focus", check);
	}

	return () => {
		clearInterval(interval);
		if (hasWindow) {
			window.removeEventListener("focus", check);
		}
	};
}

/**
 * Re-renders the calling component when the brush library changes (added, renamed, removed, reordered or relinked brushes).
 */
export function useTerrainBrushLibraryRevision(): number {
	const [revision, setRevision] = useState(0);

	useEffect(() => {
		const library = getTerrainBrushLibrary();
		if (!library) {
			return undefined;
		}

		const observer = library.onChangedObservable.add(() => {
			try {
				setRevision((value) => value + 1);
			} catch (e) {
				console.error(e);
			}
		});

		return () => {
			library.onChangedObservable.remove(observer);
		};
	}, []);

	return revision;
}

function getTerrainBrushAbsolutePath(brush: ITerrainLibraryBrush): string | null {
	return brush.path ? toTerrainAbsolutePath(brush.path) : null;
}

/**
 * Whether "Remove from library…" offers to move the file of a brush to the trash (§1.9): only for a project-relative file that lies INSIDE
 * `<project>/terrain-brushes/` once resolved. A raw prefix test would accept "terrain-brushes/../../x.png" (a crafted or hand-edited
 * library.json), which resolves outside the folder, even outside the project.
 * @param brush defines the brush (built-ins have no file).
 * @param projectDirectory defines the project directory ("/" separators), null when no project is opened.
 */
export function isTerrainBrushFileTrashable(brush: Pick<ITerrainLibraryBrush, "builtin" | "path">, projectDirectory: string | null): boolean {
	if (brush.builtin || !brush.path || !projectDirectory) {
		return false;
	}

	const path = brush.path.replace(/\\/g, "/");
	if (isTerrainAbsolutePath(path)) {
		return false;
	}

	return toTerrainRelativePath(join(projectDirectory, TERRAIN_BRUSHES_FOLDER), join(projectDirectory, path)) !== null;
}

function selectTerrainDefaultBrushIfRemoved(brushId: string): void {
	if (terrainSettings.brush?.brushId === brushId) {
		updateTerrainSettings(
			(settings) => {
				settings.brush.brushId = TERRAIN_DEFAULT_BRUSH_ID;
			},
			["brush.brushId"]
		);
	}
}

interface ITerrainBrushRemoveConfirmationProps {
	brush: ITerrainLibraryBrush;
	/** The file is inside terrain-brushes/: the checkbox "Also move the file to the trash" is shown. */
	trashable: boolean;
	/** Receives the state of the checkbox (showConfirm only returns a boolean). */
	state: { trash: boolean };
}

function TerrainBrushRemoveConfirmation(props: ITerrainBrushRemoveConfirmationProps): JSX.Element {
	const [trash, setTrash] = useState(false);

	return (
		<div className="flex flex-col gap-4 text-sm text-muted-foreground">
			<div>“{props.brush.name}” is removed from the brush library of this project. Terrains already sculpted or painted with it don't change.</div>

			{props.trashable && (
				<label className="flex items-center gap-2 text-foreground cursor-pointer select-none">
					<Checkbox
						checked={trash}
						onCheckedChange={(checked) => {
							props.state.trash = checked === true;
							setTrash(checked === true);
						}}
					/>
					Also move the file to the trash
				</label>
			)}
		</div>
	);
}

/**
 * Renames a brush of the library (context menu "Rename…", showPrompt).
 * @param brush defines the brush to rename.
 */
async function renameTerrainBrush(brush: ITerrainLibraryBrush): Promise<void> {
	const name = await showPrompt("Rename brush", `Enter the new name of “${brush.name}”.`, brush.name);
	const trimmed = name?.trim();

	if (trimmed && trimmed !== brush.name) {
		await TerrainBrushLibrary.Get().update(brush.id, { name: trimmed });
	}
}

/**
 * Removes a brush from the library (context menu "Remove from library…"): confirmation with, for files of terrain-brushes/, the checkbox
 * "Also move the file to the trash" (OS trash through the library, never a permanent delete).
 * @param brush defines the brush to remove.
 */
async function removeTerrainBrush(brush: ITerrainLibraryBrush): Promise<void> {
	const trashable = isTerrainBrushFileTrashable(brush, getProjectDirectory());
	const state = { trash: false };

	const confirmed = await showConfirm(`Remove “${brush.name}” from the library?`, <TerrainBrushRemoveConfirmation brush={brush} trashable={trashable} state={state} />, {
		asChild: true,
		confirmText: "Remove",
	});

	if (!confirmed) {
		return;
	}

	await TerrainBrushLibrary.Get().remove(brush.id, trashable && state.trash);
	selectTerrainDefaultBrushIfRemoved(brush.id);
}

/**
 * Replaces the image of a brush (keeps name, favourite and defaults) or relinks a missing brush (§1.9).
 * @param brush defines the brush.
 * @param relink defines whether the file is missing (Relink…) or not (Replace image…).
 */
async function replaceTerrainBrushImage(brush: ITerrainLibraryBrush, relink: boolean): Promise<void> {
	const path = openSingleFileDialog({
		title: relink ? `Relink “${brush.name}”` : `Replace the image of “${brush.name}”`,
		filters: [{ name: "Images", extensions: TERRAIN_BRUSH_DIALOG_EXTENSIONS.slice() }],
	});

	if (!path) {
		return;
	}

	const library = TerrainBrushLibrary.Get();
	if (relink) {
		await library.relink(brush.id, path);
	} else {
		await library.replaceImage(brush.id, path);
	}
}

export interface ITerrainBrushPaletteProps {
	/** Editor reference (error reports, drops). */
	editor: Editor;
	/** Viewport controller of the tab (brush capture); null while none is mounted. */
	controller: TerrainViewportController | null;
	/** Last status of the controller (captureArmed); read from the controller when omitted. */
	status?: Readonly<ITerrainViewportStatus> | null;
}

/**
 * Brush palette of the Brush section (§1.9): grid of 56 px tiles in the library display order (favourites first), search input above 12
 * brushes, click to select (brush defaults applied when "Apply brush defaults" is on), double-click for "Brush settings…", context menu
 * (rename, settings, favourites, show in assets browser, reveal, replace image, relink, remove), drag-to-reorder (private type
 * "terrain/brush"), and the dashed "Import brush images…" and "Capture from terrain" tiles. Image drops are handled by the Brush section's
 * routed drop zone around it.
 */
export function TerrainBrushPalette(props: ITerrainBrushPaletteProps): JSX.Element {
	useTerrainSettingsRevision((change) => change.external || change.keys.includes("brush.brushId"));
	const libraryRevision = useTerrainBrushLibraryRevision();

	const [loadRevision, setLoadRevision] = useState(0);
	const [missingRevision, setMissingRevision] = useState(0);
	const [search, setSearch] = useState("");
	const [draggedId, setDraggedId] = useState<string | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);

	useEffect(() => {
		let canceled = false;

		const load = async (): Promise<void> => {
			try {
				await TerrainBrushLibrary.Get().load(getProjectDirectory());
				if (!canceled) {
					setLoadRevision((value) => value + 1);
				}
			} catch (e) {
				if (!canceled) {
					reportTerrainTabError(props.editor, e);
				}
			}
		};

		void load();

		return () => {
			canceled = true;
		};
	}, []);

	// Files deleted, restored or relinked outside the palette: the tiles and their context menus follow within a second.
	useEffect(() => watchTerrainBrushMissingState(getTerrainPaletteBrushes, () => setMissingRevision((value) => value + 1)), []);

	const brushes = getTerrainPaletteBrushes();
	const filtered = filterTerrainPaletteBrushes(brushes, search);
	const selectedId = terrainSettings.brush?.brushId ?? TERRAIN_DEFAULT_BRUSH_ID;
	const captureArmed = props.status?.captureArmed ?? props.controller?.status.captureArmed ?? false;
	const thumbnailRevision = libraryRevision + loadRevision + missingRevision;

	function run(action: () => void | Promise<void>): void {
		try {
			const result = action();
			if (result instanceof Promise) {
				result.catch((e) => reportTerrainTabError(props.editor, e));
			}
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	function handleKeyActivate(ev: KeyboardEvent<HTMLDivElement>, action: () => void): void {
		if (ev.key === "Enter" || ev.key === " ") {
			ev.preventDefault();
			action();
		}
	}

	function handleSelect(brush: ITerrainLibraryBrush): void {
		run(() => selectTerrainBrush(brush));
	}

	function handleOpenSettings(brush: ITerrainLibraryBrush): void {
		run(() => {
			showTerrainBrushSettingsDialog(brush.id, {
				editor: props.editor,
				// Channel and invert change the mask of the selected brush.
				onSaved: () => props.controller?.refreshBrushShape(),
			});
		});
	}

	function handleImport(): void {
		run(async () => {
			const paths = openMultipleFilesDialog({
				title: "Import brushes",
				filters: [{ name: "Images", extensions: TERRAIN_BRUSH_DIALOG_EXTENSIONS.slice() }],
			});

			if (paths?.length) {
				await addTerrainBrushFiles(paths);
			}
		});
	}

	function handleCapture(): void {
		run(() => {
			if (!props.controller) {
				toast.info("Hover the terrain in the viewport to capture a brush.");
				return;
			}

			props.controller.startBrushCapture();
		});
	}

	function resetDragState(): void {
		setDraggedId(null);
		setDropTargetId(null);
	}

	function handleTileDragStart(ev: DragEvent<HTMLDivElement>, brush: ITerrainLibraryBrush): void {
		try {
			if (brush.favorite) {
				ev.preventDefault();
				return;
			}

			ev.dataTransfer.setData(TERRAIN_BRUSH_DRAG_TYPE, brush.id);
			ev.dataTransfer.effectAllowed = "move";
			setDraggedId(brush.id);
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	function handleTileDragOver(ev: DragEvent<HTMLElement>, targetId: string | null): void {
		try {
			if (!isTerrainBrushTileDrag(ev.dataTransfer)) {
				return;
			}

			ev.preventDefault();
			ev.stopPropagation();

			const valid = targetId === null || targetId !== draggedId;
			ev.dataTransfer.dropEffect = valid ? "move" : "none";

			const nextTarget = valid ? (targetId ?? "") : null;
			if (nextTarget !== dropTargetId) {
				setDropTargetId(nextTarget);
			}
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	function handleTileDragLeave(ev: DragEvent<HTMLElement>, targetId: string | null): void {
		try {
			if (ev.currentTarget.contains(ev.relatedTarget as Node | null)) {
				return;
			}

			if (dropTargetId === (targetId ?? "")) {
				setDropTargetId(null);
			}
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	function handleTileDrop(ev: DragEvent<HTMLElement>, beforeId: string | null): void {
		if (!isTerrainBrushTileDrag(ev.dataTransfer)) {
			return;
		}

		ev.preventDefault();
		ev.stopPropagation();

		let id: string | null = null;
		try {
			id = ev.dataTransfer.getData(TERRAIN_BRUSH_DRAG_TYPE) || draggedId;
		} catch (e) {
			id = draggedId;
		}

		resetDragState();

		if (!id) {
			return;
		}

		const order = computeTerrainBrushReorder(getTerrainPaletteBrushes(), id, beforeId);
		if (order) {
			run(() => TerrainBrushLibrary.Get().reorder(order));
		}
	}

	function getContextMenuContent(brush: ITerrainLibraryBrush): ReactNode {
		const absolutePath = getTerrainBrushAbsolutePath(brush);
		const inAssets = !!brush.path?.startsWith("assets/");

		if (brush.builtin) {
			return (
				<ContextMenuContent>
					<ContextMenuItem className="flex items-center gap-2" onClick={() => handleOpenSettings(brush)}>
						<LuSettings2 className="w-4 h-4" /> Brush settings…
					</ContextMenuItem>
				</ContextMenuContent>
			);
		}

		return (
			<ContextMenuContent>
				<ContextMenuItem className="flex items-center gap-2" onClick={() => run(() => renameTerrainBrush(brush))}>
					<LuPencil className="w-4 h-4" /> Rename…
				</ContextMenuItem>
				<ContextMenuItem className="flex items-center gap-2" onClick={() => handleOpenSettings(brush)}>
					<LuSettings2 className="w-4 h-4" /> Brush settings…
				</ContextMenuItem>
				<ContextMenuItem className="flex items-center gap-2" onClick={() => run(() => TerrainBrushLibrary.Get().update(brush.id, { favorite: !brush.favorite }))}>
					<LuStar className="w-4 h-4" /> {brush.favorite ? "Remove from favourites" : "Add to favourites"}
				</ContextMenuItem>

				<ContextMenuSeparator />

				{inAssets && !brush.missing && absolutePath && (
					<ContextMenuItem
						className="flex items-center gap-2"
						onClick={() =>
							run(() => {
								onSelectedAssetChanged.notifyObservers(absolutePath);
							})
						}
					>
						<LuFolderOpen className="w-4 h-4" /> Show in Assets Browser
					</ContextMenuItem>
				)}

				{!brush.missing && absolutePath && (
					<ContextMenuItem className="flex items-center gap-2" onClick={() => run(() => ipcRenderer.send("editor:show-item", absolutePath))}>
						<LuFolderOpen className="w-4 h-4" /> {`Reveal in ${isDarwin() ? "Finder" : "Explorer"}`}
					</ContextMenuItem>
				)}

				{brush.missing ? (
					<ContextMenuItem className="flex items-center gap-2" onClick={() => run(() => replaceTerrainBrushImage(brush, true))}>
						<LuRefreshCw className="w-4 h-4" /> Relink…
					</ContextMenuItem>
				) : (
					<ContextMenuItem className="flex items-center gap-2" onClick={() => run(() => replaceTerrainBrushImage(brush, false))}>
						<LuRefreshCw className="w-4 h-4" /> Replace image…
					</ContextMenuItem>
				)}

				<ContextMenuSeparator />

				<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => run(() => removeTerrainBrush(brush))}>
					<LuTrash2 className="w-4 h-4" /> Remove from library…
				</ContextMenuItem>
			</ContextMenuContent>
		);
	}

	const dashedTileClassName = `
		flex items-center justify-center w-14 h-14 p-1 rounded-lg cursor-pointer
		border-2 border-dashed border-muted-foreground/40 text-muted-foreground
		hover:border-primary/60 hover:bg-background hover:text-foreground
		transition-all duration-300 ease-in-out
	`;

	return (
		<TooltipProvider delayDuration={400}>
			<div className="flex flex-col gap-2 w-full">
				{brushes.length > TERRAIN_BRUSH_SEARCH_THRESHOLD && (
					<div className="relative px-2">
						<LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
						<Input value={search} onChange={(ev) => setSearch(ev.currentTarget.value)} placeholder="Search brushes…" className="h-8 pl-8" aria-label="Search brushes" />
					</div>
				)}

				<div
					role="group"
					aria-label="Brushes"
					style={{ gridTemplateColumns: "repeat(auto-fill, 56px)" }}
					className="grid gap-2 p-2 rounded-lg w-full max-h-64 overflow-y-auto bg-black/30"
				>
					{filtered.map((brush) => (
						<ContextMenu key={brush.id}>
							<Tooltip>
								<ContextMenuTrigger asChild>
									<TooltipTrigger asChild>
										<TerrainBrushTile
											brush={brush}
											selected={brush.id === selectedId}
											revision={thumbnailRevision}
											dragging={draggedId === brush.id}
											dropTarget={dropTargetId === brush.id}
											draggable={!brush.favorite}
											onSelect={() => handleSelect(brush)}
											onOpenSettings={() => handleOpenSettings(brush)}
											onDragStart={(ev) => handleTileDragStart(ev, brush)}
											onDragEnd={() => resetDragState()}
											onDragOver={brush.favorite ? undefined : (ev) => handleTileDragOver(ev, brush.id)}
											onDragLeave={(ev) => handleTileDragLeave(ev, brush.id)}
											onDrop={brush.favorite ? undefined : (ev) => handleTileDrop(ev, brush.id)}
										/>
									</TooltipTrigger>
								</ContextMenuTrigger>
								<TooltipContent className="max-w-64 whitespace-pre-line break-all">{getTerrainBrushTileDescription(brush)}</TooltipContent>
							</Tooltip>
							{getContextMenuContent(brush)}
						</ContextMenu>
					))}

					{filtered.length === 0 && <div className="col-span-full py-2 text-xs text-center text-muted-foreground">No brush matches “{search.trim()}”.</div>}

					<Tooltip>
						<TooltipTrigger asChild>
							<div
								role="button"
								tabIndex={0}
								aria-label="Import brush images…"
								onClick={() => handleImport()}
								onKeyDown={(ev) => handleKeyActivate(ev, () => handleImport())}
								onDragOver={(ev) => handleTileDragOver(ev, null)}
								onDragLeave={(ev) => handleTileDragLeave(ev, null)}
								onDrop={(ev) => handleTileDrop(ev, null)}
								className={`${dashedTileClassName} ${dropTargetId === "" ? "outline outline-2 outline-offset-2 outline-primary" : ""}`}
							>
								<LuImagePlus className="w-5 h-5" />
							</div>
						</TooltipTrigger>
						<TooltipContent>Import brush images…</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<div
								role="button"
								tabIndex={0}
								aria-label="Capture from terrain"
								aria-pressed={captureArmed}
								onClick={() => handleCapture()}
								onKeyDown={(ev) => handleKeyActivate(ev, () => handleCapture())}
								className={`${dashedTileClassName} ${captureArmed ? "!border-primary text-primary bg-primary/20" : ""} ${props.controller ? "" : "opacity-50"}`}
							>
								<LuScanLine className="w-5 h-5" />
							</div>
						</TooltipTrigger>
						<TooltipContent>{captureArmed ? "Click on the terrain to capture a brush · Esc to cancel" : "Capture from terrain"}</TooltipContent>
					</Tooltip>
				</div>
			</div>
		</TooltipProvider>
	);
}
