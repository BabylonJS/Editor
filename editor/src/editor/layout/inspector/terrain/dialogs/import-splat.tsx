import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { LuFolderOpen, LuImagePlus, LuX } from "react-icons/lu";

import type { Mesh } from "babylonjs";

import type { Editor } from "../../../../main";

import { Button } from "../../../../../ui/shadcn/ui/button";
import { Switch } from "../../../../../ui/shadcn/ui/switch";

import { openSingleFileDialog } from "../../../../../tools/dialog";

import { getTerrainPlugin } from "../../../../../tools/terrain/engine/info";
import { importTerrainSplatMaps } from "../../../../../tools/terrain/io/masks";
import { getTerrainImageThumbnail } from "../../../../../tools/terrain/io/sources";

import { formatTerrainPlural, getTerrainFileName } from "../format";
import { assertTerrainTabNotBusy, reportTerrainTabError } from "../drop-actions";

import { showTerrainDialog, useTerrainDialogEscapeGuard, type ITerrainDialog } from "./show-dialog";

/** Extensions of the splat map files (§1.12: RGBA images read with sharp). */
export const TERRAIN_SPLAT_IMPORT_EXTENSIONS: readonly string[] = ["png", "tif", "tiff"];

/** Layers of one splat map (R, G, B, A). */
const TERRAIN_SPLAT_LAYERS_PER_MAP = 4;

/** Size of the slot thumbnails. */
const TERRAIN_SPLAT_THUMBNAIL_SIZE = 64;

/**
 * Number of layers the splat import adds (§4.10.10): the engine ensures layerCount >= 4 × (number of splat maps) with default layers
 * named "Splat 1…8".
 * @param layerCount defines the current number of layers (0 without terrain material).
 * @param splatCount defines the number of splat maps (1 or 2).
 */
export function getTerrainSplatAddedLayerCount(layerCount: number, splatCount: number): number {
	return Math.max(0, TERRAIN_SPLAT_LAYERS_PER_MAP * splatCount - Math.max(0, layerCount));
}

interface ITerrainSplatSlotProps {
	editor: Editor;
	label: string;
	path: string | null;
	disabled: boolean;
	onChange: (path: string | null) => void;
}

function TerrainSplatSlot(props: ITerrainSplatSlotProps): JSX.Element {
	const [thumbnail, setThumbnail] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setThumbnail(null);

		if (props.path) {
			getTerrainImageThumbnail(props.path, TERRAIN_SPLAT_THUMBNAIL_SIZE)
				.then((url) => {
					if (!cancelled) {
						setThumbnail(url);
					}
				})
				.catch((e) => console.error(e));
		}

		return () => {
			cancelled = true;
		};
	}, [props.path]);

	function browse(): void {
		try {
			const file = openSingleFileDialog({
				title: `Select the splat map of ${props.label.toLowerCase()}`,
				filters: [{ name: "Splat maps", extensions: TERRAIN_SPLAT_IMPORT_EXTENSIONS.slice() }],
			});

			if (file) {
				props.onChange(file.replace(/\\/g, "/"));
			}
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	return (
		<div className="flex items-center gap-3 w-full">
			<button
				type="button"
				disabled={props.disabled}
				onClick={() => browse()}
				className={`
					flex items-center justify-center w-14 h-14 shrink-0 rounded-lg overflow-hidden
					${props.path ? "bg-black/40" : "border-2 border-dashed border-muted-foreground/40"}
					${props.disabled ? "opacity-50" : "hover:bg-background"}
					transition-colors duration-300 ease-in-out
				`}
			>
				{thumbnail && <img src={thumbnail} alt={props.label} draggable={false} className="w-full h-full object-contain" />}
				{!props.path && <LuImagePlus className="w-5 h-5 text-muted-foreground" />}
			</button>

			<div className="flex flex-col gap-0.5 flex-1 min-w-0">
				<div className="text-sm">{props.label}</div>
				<div className="text-xs text-muted-foreground truncate" title={props.path ?? undefined}>
					{props.path ? getTerrainFileName(props.path) : "None"}
				</div>
			</div>

			<Button variant="ghost" size="icon" title="Browse…" className="w-8 h-8 shrink-0" disabled={props.disabled} onClick={() => browse()}>
				<LuFolderOpen className="w-4 h-4" />
			</Button>

			{props.path && (
				<Button variant="ghost" size="icon" title="Clear" className="w-8 h-8 shrink-0" disabled={props.disabled} onClick={() => props.onChange(null)}>
					<LuX className="w-4 h-4" />
				</Button>
			)}
		</div>
	);
}

export interface ITerrainSplatImportDialogProps {
	/** The editor reference. */
	editor: Editor;
	/** The terrain whose weights are replaced. */
	mesh: Mesh;
	/** Splat maps prefilled (drops): layers 1–4 and optional layers 5–8. */
	paths?: [string | null, string | null];
	/** Called after a successful import (true) or when Cancel is clicked (false). */
	onDone: (applied: boolean) => void;
}

/**
 * Import splat map dialog (§1.12): two file slots "Layers 1–4" and "Layers 5–8 (optional)", each an RGBA image (.png, .tif, .tiff; 8-bit,
 * read with sharp; channel c = weight of layer 4k + c), image top = +Z, "Flip vertically" switch. Apply → importTerrainSplatMaps (one undo
 * entry; texture painting is enabled first and layers are added up to the used channels, §4.10.10).
 */
export function TerrainSplatImportDialog(props: ITerrainSplatImportDialogProps): JSX.Element {
	const [first, setFirst] = useState<string | null>(props.paths?.[0] ?? null);
	const [second, setSecond] = useState<string | null>(props.paths?.[1] ?? null);
	const [flipY, setFlipY] = useState(false);
	const [applying, setApplying] = useState(false);

	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	// The import can't be cancelled once started (Cancel is disabled): Escape doesn't close the dialog meanwhile.
	useTerrainDialogEscapeGuard(applying);

	let layerCount = 0;
	try {
		layerCount = getTerrainPlugin(props.mesh)?.data.layers.length ?? 0;
	} catch (e) {
		layerCount = 0;
	}

	const splatCount = first ? (second ? 2 : 1) : 0;
	const added = splatCount > 0 ? getTerrainSplatAddedLayerCount(layerCount, splatCount) : 0;

	async function apply(): Promise<void> {
		if (!first) {
			return;
		}

		setApplying(true);

		try {
			assertTerrainTabNotBusy();

			await importTerrainSplatMaps(props.editor, props.mesh, [first, second], { flipY });
		} catch (e) {
			reportTerrainTabError(props.editor, e);

			if (mounted.current) {
				setApplying(false);
			}

			return;
		}

		toast.success(`Splat map${second ? "s" : ""} imported`);

		// Outside the try: closing the dialog is not part of the import (a failure there is no terrain error).
		props.onDone(true);
	}

	return (
		<div className="flex flex-col gap-3 w-[420px] max-w-[90vw] pt-2 text-foreground">
			<div className="text-xs text-muted-foreground">
				Each channel (R, G, B, A) of an image is the weight of one layer: the first image drives layers 1–4, the second one layers 5–8. Image top = +Z.
			</div>

			<TerrainSplatSlot editor={props.editor} label="Layers 1–4" path={first} disabled={applying} onChange={(path) => setFirst(path)} />
			<TerrainSplatSlot editor={props.editor} label="Layers 5–8 (optional)" path={second} disabled={applying} onChange={(path) => setSecond(path)} />

			<div className="flex items-center justify-between gap-2 px-2 cursor-pointer" onClick={() => !applying && setFlipY(!flipY)}>
				<div>Flip vertically</div>
				<Switch checked={flipY} disabled={applying} onChange={() => {}} />
			</div>

			{second && !first && <div className="px-2 text-xs text-amber-500">Set the splat map of layers 1–4 first.</div>}

			{added > 0 && (
				<div className="px-2 text-xs text-muted-foreground">
					{layerCount === 0 ? "Texture painting is enabled and " : ""}
					{formatTerrainPlural(added, "layer")} named “Splat …” will be added. Replace their textures afterwards.
				</div>
			)}

			<div className="px-2 text-xs text-muted-foreground">The painted weights of every layer are replaced. This can be undone.</div>

			<div className="flex flex-wrap justify-end gap-2">
				<Button variant="secondary" className="min-w-24" disabled={applying} onClick={() => props.onDone(false)}>
					Cancel
				</Button>
				<Button className="min-w-24" disabled={!first || applying} onClick={() => void apply()}>
					{applying ? "Importing…" : "Apply"}
				</Button>
			</div>
		</div>
	);
}

/**
 * Opens the Import splat map dialog (§1.12), prefilled with the splat maps of a drop (sorted by name: first = layers 1–4).
 * Never throws (errors are reported).
 * @param editor defines the editor reference.
 * @param mesh defines the terrain whose weights are replaced.
 * @param paths defines the absolute paths of the splat maps (from a drop), omitted to choose them in the dialog.
 * @returns true once the splat maps were imported, false when cancelled.
 */
export function openTerrainSplatImport(editor: Editor, mesh: Mesh, paths?: [string, string | null] | null): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const holder: { dialog: ITerrainDialog | null; settled: boolean } = { dialog: null, settled: false };

		const finish = (applied: boolean): void => {
			if (!holder.settled) {
				holder.settled = true;
				resolve(applied);
			}
		};

		try {
			const initial: [string | null, string | null] = [paths?.[0]?.replace(/\\/g, "/") ?? null, paths?.[1]?.replace(/\\/g, "/") ?? null];

			holder.dialog = showTerrainDialog(
				"Import splat map",
				<TerrainSplatImportDialog
					editor={editor}
					mesh={mesh}
					paths={initial}
					onDone={(applied) => {
						finish(applied);
						holder.dialog?.close();
					}}
				/>,
				true
			);

			void holder.dialog.wait().then(() => finish(false));
		} catch (e) {
			reportTerrainTabError(editor, e);
			finish(false);
		}
	});
}
