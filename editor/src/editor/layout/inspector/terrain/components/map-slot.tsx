import { pathExists } from "fs-extra";

import { useEffect, useRef, useState } from "react";

import { XMarkIcon } from "@heroicons/react/20/solid";
import { LuFolderOpen, LuImagePlus, LuTrash2 } from "react-icons/lu";

import type { Mesh } from "babylonjs";
import type { ITerrainLayerData } from "babylonjs-editor-tools";

import type { Editor } from "../../../../main";

import { openSingleFileDialog } from "../../../../../tools/dialog";
import { onSelectedAssetChanged } from "../../../../../tools/observables";

import { updateTerrainMaterialLayer } from "../../../../../tools/terrain/engine/layers";
import { getTerrainImageThumbnail } from "../../../../../tools/terrain/io/sources";
import { isTerrainAbsolutePath, resolveRenamedAssetPath, toTerrainAbsolutePath } from "../../../../../tools/terrain/io/paths";

import { getTerrainFileName } from "../format";
import { executeTerrainDropAction, reportTerrainTabError } from "../drop-actions";
import { createTerrainSlotMaps, type ITerrainDropContext } from "../drop-routing";

import { TerrainDropZone } from "./drop-zone";

/** Map slots of a layer (§1.10 "Active layer details"). */
export type TerrainMapSlotKind = "albedo" | "normal" | "roughness" | "ao" | "height";

/** Layer data key holding the path of each slot. */
export const TERRAIN_MAP_SLOT_KEYS: Readonly<Record<TerrainMapSlotKind, "albedo" | "normal" | "roughnessMap" | "aoMap" | "heightMap">> = {
	albedo: "albedo",
	normal: "normal",
	roughness: "roughnessMap",
	ao: "aoMap",
	height: "heightMap",
};

/** Layer sources are decoded by the browser at runtime (§5.5.1): the file dialog offers the same extensions as the drops (no TIFF). */
export const TERRAIN_MAP_SLOT_EXTENSIONS: readonly string[] = ["png", "jpg", "jpeg", "webp", "bmp"];

/** Size of the slot thumbnails (the slot is 48 px, thumbnails are generated at 64 px for HiDPI screens). */
const TERRAIN_MAP_SLOT_THUMBNAIL_SIZE = 64;

/**
 * Absolute path ("/" separators) of a layer source stored in the layer data: project-relative paths are resolved through the pending asset
 * renames (§6.10) then against the project directory. null for an empty slot.
 * @param path defines the path stored in the layer data.
 */
export function getTerrainMapSlotAbsolutePath(path: string | null | undefined): string | null {
	if (!path) {
		return null;
	}

	const slashPath = path.replace(/\\/g, "/");
	return isTerrainAbsolutePath(slashPath) ? slashPath : toTerrainAbsolutePath(resolveRenamedAssetPath(slashPath));
}

/**
 * Asks for an image with the file dialog and assigns it to a map slot of a layer exactly like a drop on the slot (§4.19 "assign-maps"): files
 * outside the project's assets are copied into assets/terrain-textures/ first, a DirectX normal map name sets the DirectX convention and a
 * recognised roughness/AO/height name sets the channel; one undo entry. Errors are reported, never thrown.
 * @param editor defines the editor reference.
 * @param mesh defines the terrain.
 * @param layerId defines the layer whose slot changes.
 * @param slot defines the slot.
 * @param label defines the label of the slot, used by the dialog title ("Albedo").
 * @returns true when a map was assigned.
 */
export async function pickTerrainMapSlotFile(editor: Editor, mesh: Mesh, layerId: string, slot: TerrainMapSlotKind, label: string): Promise<boolean> {
	try {
		const file = openSingleFileDialog({
			title: `Select the ${label.toLowerCase()} map`,
			filters: [{ name: "Images", extensions: TERRAIN_MAP_SLOT_EXTENSIONS.slice() }],
		});

		if (!file) {
			return false;
		}

		const path = file.replace(/\\/g, "/");
		return await executeTerrainDropAction(editor, mesh, { type: "assign-maps", layerId, maps: createTerrainSlotMaps(slot, path) }, { paths: [path], zone: "map-slot" });
	} catch (e) {
		reportTerrainTabError(editor, e);
		return false;
	}
}

/**
 * Accessible name of the main button of a map slot (its thumbnail or icon has no text, and the tooltip sits on the drop zone around it):
 * "Choose the albedo map" when empty, "Albedo map: rock.png" (+ " (missing)") otherwise.
 * @param label defines the label of the slot ("Albedo").
 * @param fileName defines the file name of the assigned map, null for an empty slot.
 * @param missing defines whether the assigned file can't be found.
 */
export function getTerrainMapSlotButtonLabel(label: string, fileName: string | null, missing: boolean): string {
	if (!fileName) {
		return `Choose the ${label.toLowerCase()} map`;
	}

	return `${label} map: ${fileName}${missing ? " (missing)" : ""}`;
}

/**
 * Clears a map slot of a layer (one undo entry).
 * @param editor defines the editor reference.
 * @param mesh defines the terrain.
 * @param layerId defines the layer whose slot is cleared.
 * @param slot defines the slot.
 */
export function clearTerrainMapSlot(editor: Editor, mesh: Mesh, layerId: string, slot: TerrainMapSlotKind): void {
	try {
		const patch: Partial<Omit<ITerrainLayerData, "id">> = {};
		patch[TERRAIN_MAP_SLOT_KEYS[slot]] = null;

		updateTerrainMaterialLayer(mesh, layerId, patch, { undo: true });
	} catch (e) {
		reportTerrainTabError(editor, e);
	}
}

export interface ITerrainMapSlotProps {
	/** The editor reference. */
	editor: Editor;
	/** The terrain whose layer is edited. */
	mesh: Mesh;
	/** The layer whose slot is shown. */
	layerId: string;
	/** The slot. */
	slot: TerrainMapSlotKind;
	/** Label of the slot ("Albedo", "Normal", "Roughness", "Ambient occlusion", "Height"). */
	label: string;
	/** Path stored in the layer data (project-relative), null for an empty slot. */
	path: string | null;
	/** Number of layers of the terrain material (drop routing context). */
	layerCount: number;
	/** Disables every change (busy or read-only terrain). */
	disabled?: boolean;
	/** Changing it reloads the thumbnail and the missing state (the file may have changed on disk). */
	revision?: number;
}

/**
 * Map slot of the active layer details (§1.10): a 48 px thumbnail of the map (or a "+" tile when empty), a missing state (red cross and
 * "Locate…") when the file can't be found, a drop zone (assets or OS files; one image assigns the slot, §4.19), a click opens the file dialog,
 * and hover buttons to clear the slot and to show the file in the assets browser. Thumbnails are loaded asynchronously, never in render.
 */
export function TerrainMapSlot(props: ITerrainMapSlotProps): JSX.Element {
	const [thumbnail, setThumbnail] = useState<string | null>(null);
	const [missing, setMissing] = useState(false);

	const shownPath = useRef<string | null>(null);
	const absolutePath = getTerrainMapSlotAbsolutePath(props.path);

	useEffect(() => {
		let cancelled = false;

		// Another file: the previous thumbnail goes away at once. Same file (revision changed): it stays until the new one is known.
		if (shownPath.current !== absolutePath) {
			shownPath.current = absolutePath;
			setThumbnail(null);
			setMissing(false);
		}

		if (!absolutePath) {
			return;
		}

		void (async () => {
			try {
				const exists = await pathExists(absolutePath);
				if (cancelled) {
					return;
				}

				setMissing(!exists);
				if (!exists) {
					setThumbnail(null);
					return;
				}

				const url = await getTerrainImageThumbnail(absolutePath, TERRAIN_MAP_SLOT_THUMBNAIL_SIZE);
				if (!cancelled) {
					setThumbnail(url);
				}
			} catch (e) {
				// A thumbnail is cosmetic: the slot still works without it.
				console.error(e);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [absolutePath, props.revision]);

	const context: ITerrainDropContext = {
		zone: "map-slot",
		isTerrain: true,
		hasTerrainMaterial: true,
		layerCount: props.layerCount,
		layerId: props.layerId,
		slot: props.slot,
	};

	const fileName = props.path ? getTerrainFileName(props.path) : null;
	const title = props.path ? `${props.label}: ${props.path}` : `${props.label}: drop an image or click to choose one`;
	const buttonLabel = getTerrainMapSlotButtonLabel(props.label, fileName, missing);

	function handleShowInAssetsBrowser(): void {
		try {
			if (absolutePath) {
				onSelectedAssetChanged.notifyObservers(absolutePath);
			}
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	return (
		<div className="flex items-center gap-2 w-full min-w-0">
			<TerrainDropZone
				editor={props.editor}
				mesh={props.mesh}
				context={context}
				disabled={props.disabled}
				title={title}
				className="group relative w-12 h-12 shrink-0 rounded-lg"
			>
				<button
					type="button"
					aria-label={buttonLabel}
					disabled={props.disabled}
					onClick={() => void pickTerrainMapSlotFile(props.editor, props.mesh, props.layerId, props.slot, props.label)}
					className={`
						flex items-center justify-center w-12 h-12 rounded-lg overflow-hidden
						${props.path ? "bg-secondary" : "border-2 border-dashed border-muted-foreground/40"}
						${missing ? "ring-2 ring-red-500/70" : ""}
						${props.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-background"}
						transition-colors duration-300 ease-in-out
					`}
				>
					{thumbnail && !missing && <img src={thumbnail} alt={props.label} draggable={false} className="w-full h-full object-cover" />}
					{missing && <XMarkIcon className="w-7 h-7 text-red-500" />}
					{!props.path && <LuImagePlus className="w-5 h-5 text-muted-foreground" />}
				</button>

				{props.path && !props.disabled && (
					<div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-0.5 rounded-b-lg bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
						<button
							type="button"
							title={`Clear the ${props.label.toLowerCase()} map`}
							onClick={(ev) => {
								ev.stopPropagation();
								clearTerrainMapSlot(props.editor, props.mesh, props.layerId, props.slot);
							}}
							className="p-0.5 rounded text-white hover:text-red-400"
						>
							<LuTrash2 className="w-3.5 h-3.5" />
						</button>

						{!missing && (
							<button
								type="button"
								title="Show in Assets Browser"
								onClick={(ev) => {
									ev.stopPropagation();
									handleShowInAssetsBrowser();
								}}
								className="p-0.5 rounded text-white hover:text-primary"
							>
								<LuFolderOpen className="w-3.5 h-3.5" />
							</button>
						)}
					</div>
				)}
			</TerrainDropZone>

			<div className="flex flex-col gap-0.5 flex-1 min-w-0">
				<div className="text-sm">{props.label}</div>

				{!missing && <div className="text-xs text-muted-foreground truncate">{fileName ?? "None"}</div>}

				{missing && (
					<div className="flex flex-wrap items-center gap-x-2 text-xs text-red-500 min-w-0">
						<span className="truncate" title={props.path ?? undefined}>
							Missing: {fileName}
						</span>
						<button
							type="button"
							disabled={props.disabled}
							onClick={() => void pickTerrainMapSlotFile(props.editor, props.mesh, props.layerId, props.slot, props.label)}
							className="underline underline-offset-2 font-semibold hover:text-primary disabled:opacity-50"
						>
							Locate…
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
