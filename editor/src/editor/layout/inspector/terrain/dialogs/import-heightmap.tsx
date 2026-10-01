import { stat } from "fs-extra";
import { basename, join } from "path/posix";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { LuTriangleAlert } from "react-icons/lu";

import type { Mesh } from "babylonjs";

import type { Editor } from "../../../../main";

import { Button } from "../../../../../ui/shadcn/ui/button";
import { Switch } from "../../../../../ui/shadcn/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../ui/shadcn/ui/select";

import { openSingleFileDialog, saveSingleFileDialog } from "../../../../../tools/dialog";

import type { ITerrainImage } from "../../../../../tools/terrain/core/types";
import { getTerrainMeshInfo } from "../../../../../tools/terrain/engine/info";
import type { ITerrainHeightImportOptions } from "../../../../../tools/terrain/engine/types";
import { getProjectDirectory } from "../../../../../tools/terrain/io/paths";
import {
	exportTerrainHeightmap,
	getTerrainHeightmapSidecarPath,
	importTerrainHeightmap,
	isTerrainRawHeightmapPath,
	readTerrainHeightmapFile,
	readTerrainHeightmapSidecar,
} from "../../../../../tools/terrain/io/heightmap";

import { EditorInspectorNumberField } from "../../fields/number";

import { formatTerrainNumber, getTerrainFileName } from "../format";
import { TerrainFieldsRow } from "../components/fields-row";
import { assertTerrainTabNotBusy, getTerrainErrorMessage, reportTerrainTabError } from "../drop-actions";

import { getTerrainWorldSize } from "./resize";
import { showTerrainDialog, useTerrainDialogEscapeGuard, type ITerrainDialog } from "./show-dialog";

/** Extensions of the Import heightmap file dialog (§1.13.4). */
export const TERRAIN_HEIGHTMAP_IMPORT_EXTENSIONS: readonly string[] = ["png", "tif", "tiff", "jpg", "jpeg", "raw", "r16"];

/** Largest side of the heightmap preview (px). */
const TERRAIN_HEIGHTMAP_PREVIEW_SIZE = 160;

export type TerrainHeightmapImportMode = ITerrainHeightImportOptions["mode"];

const TERRAIN_HEIGHTMAP_MODES: readonly { value: TerrainHeightmapImportMode; text: string }[] = [
	{ value: "replace", text: "Replace" },
	{ value: "add", text: "Add" },
	{ value: "max", text: "Max" },
	{ value: "min", text: "Min" },
];

/**
 * Size of a RAW 16-bit heightmap of `bytes` bytes when it is square: sqrt(bytes / 2) when it is an integer, else null (§1.13.4: the RAW size
 * fields are then shown).
 * @param bytes defines the size of the file in bytes.
 */
export function getTerrainSquareRawHeightmapSize(bytes: number): number | null {
	if (!Number.isFinite(bytes) || bytes <= 0 || bytes % 2 !== 0) {
		return null;
	}

	const side = Math.round(Math.sqrt(bytes / 2));
	return side > 0 && side * side * 2 === bytes ? side : null;
}

/**
 * Whether a RAW size matches the file: rawWidth × rawHeight 16-bit pixels = bytes.
 * @param rawWidth defines the width in pixels.
 * @param rawHeight defines the height in pixels.
 * @param bytes defines the size of the file in bytes.
 */
export function isTerrainRawHeightmapSizeValid(rawWidth: number, rawHeight: number, bytes: number): boolean {
	return Number.isInteger(rawWidth) && Number.isInteger(rawHeight) && rawWidth > 0 && rawHeight > 0 && rawWidth * rawHeight * 2 === bytes;
}

/**
 * Default height range of an import without sidecar (§1.13.4): the terrain's current world range. A flat terrain has no range: black stays at
 * its height and white gets round(0.08 × the largest world side) above it (the relief height of the Generate defaults, §8.1 rule 12).
 * @param mesh defines the terrain.
 */
export function getTerrainHeightmapDefaultRange(mesh: Mesh): { minWorld: number; maxWorld: number } {
	try {
		const info = getTerrainMeshInfo(mesh);
		const [minWorld, maxWorld] = info.worldHeightRange;

		if (Number.isFinite(minWorld) && Number.isFinite(maxWorld) && maxWorld - minWorld >= 1) {
			return { minWorld, maxWorld };
		}

		const base = Number.isFinite(minWorld) ? minWorld : 0;
		const size = getTerrainWorldSize(mesh, info.width, info.height);

		return { minWorld: base, maxWorld: base + Math.max(1, Math.round(0.08 * Math.max(size.width, size.height))) };
	} catch (e) {
		return { minWorld: 0, maxWorld: 1000 };
	}
}

/**
 * Grayscale preview (data URL) of a heightmap image (image order, values 0..1), at most 160 px; null outside a browser.
 * @param image defines the heightmap image.
 */
export function createTerrainHeightmapPreview(image: ITerrainImage): string | null {
	if (typeof document === "undefined" || image.width < 1 || image.height < 1) {
		return null;
	}

	const scale = Math.min(1, TERRAIN_HEIGHTMAP_PREVIEW_SIZE / Math.max(image.width, image.height));
	const width = Math.max(1, Math.round(image.width * scale));
	const height = Math.max(1, Math.round(image.height * scale));

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext("2d");
	if (!context) {
		return null;
	}

	const pixels = context.createImageData(width, height);
	for (let y = 0; y < height; ++y) {
		const sourceY = Math.min(image.height - 1, Math.floor(((y + 0.5) * image.height) / height));

		for (let x = 0; x < width; ++x) {
			const sourceX = Math.min(image.width - 1, Math.floor(((x + 0.5) * image.width) / width));
			const value = image.data[sourceY * image.width + sourceX];
			const byte = Math.round((value > 0 ? (value < 1 ? value : 1) : 0) * 255);

			const offset = (y * width + x) * 4;
			pixels.data[offset] = byte;
			pixels.data[offset + 1] = byte;
			pixels.data[offset + 2] = byte;
			pixels.data[offset + 3] = 255;
		}
	}

	context.putImageData(pixels, 0, 0);
	return canvas.toDataURL("image/png");
}

interface ITerrainHeightmapFileSummary {
	width: number;
	height: number;
	bitDepth: 8 | 16;
	preview: string | null;
}

export interface ITerrainHeightmapImportDialogProps {
	/** The editor reference. */
	editor: Editor;
	/** The terrain whose heights are replaced. */
	mesh: Mesh;
	/** Absolute path of the heightmap (read in place: it doesn't need to be inside the project). */
	path: string;
	/** Called after a successful import (true) or when Cancel is clicked (false). */
	onDone: (applied: boolean) => void;
}

/**
 * Import heightmap dialog (§1.13.4): preview, detected size and bit depth (warning for 8-bit files), RAW size fields when the size can't be
 * inferred, Min / Max height (world cm; black → min, white → max; prefilled from the `<file>.heightmap.json` sidecar with the note
 * "Range read from {sidecar name}", else the terrain's current world range), Mode (Replace · Add · Max · Min), Flip vertically (image top = +Z;
 * prefilled from the sidecar). Apply → importTerrainHeightmap (one undo entry).
 */
export function TerrainHeightmapImportDialog(props: ITerrainHeightmapImportDialogProps): JSX.Element {
	const raw = isTerrainRawHeightmapPath(props.path);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [summary, setSummary] = useState<ITerrainHeightmapFileSummary | null>(null);
	const [rangeNote, setRangeNote] = useState<string | null>(null);
	const [mode, setMode] = useState<TerrainHeightmapImportMode>("replace");
	const [flipY, setFlipY] = useState(false);
	const [rawBytes, setRawBytes] = useState(0);
	const [rawFieldsVisible, setRawFieldsVisible] = useState(false);
	const [applying, setApplying] = useState(false);
	const [fieldsRevision, setFieldsRevision] = useState(0);
	const [, setRevision] = useState(0);

	const values = useRef({ minWorld: 0, maxWorld: 0, rawWidth: 0, rawHeight: 0 }).current;
	const mounted = useRef(true);

	// The import can't be cancelled once started (Cancel is disabled): Escape doesn't close the dialog meanwhile.
	useTerrainDialogEscapeGuard(applying);

	async function loadPreview(rawWidth?: number, rawHeight?: number): Promise<void> {
		try {
			const file = await readTerrainHeightmapFile(props.path, raw ? { rawWidth, rawHeight } : undefined);
			if (!mounted.current) {
				return;
			}

			setSummary({ width: file.width, height: file.height, bitDepth: file.bitDepth, preview: createTerrainHeightmapPreview(file) });
			setError(null);
		} catch (e) {
			if (mounted.current) {
				setSummary(null);
				setError(`Can't read the heightmap "${getTerrainFileName(props.path)}": ${getTerrainErrorMessage(e)}`);
			}
		}
	}

	useEffect(() => {
		mounted.current = true;

		void (async () => {
			try {
				const sidecar = await readTerrainHeightmapSidecar(props.path);
				if (!mounted.current) {
					return;
				}

				if (sidecar) {
					values.minWorld = sidecar.minHeight;
					values.maxWorld = sidecar.maxHeight;
					setFlipY(sidecar.flipY);
					setRangeNote(`Range read from ${basename(getTerrainHeightmapSidecarPath(props.path))}`);
				} else {
					const range = getTerrainHeightmapDefaultRange(props.mesh);
					values.minWorld = range.minWorld;
					values.maxWorld = range.maxWorld;
				}

				if (raw) {
					const bytes = (await stat(props.path)).size;
					if (!mounted.current) {
						return;
					}

					setRawBytes(bytes);

					const side = getTerrainSquareRawHeightmapSize(bytes);
					if (sidecar && isTerrainRawHeightmapSizeValid(sidecar.width, sidecar.height, bytes)) {
						values.rawWidth = sidecar.width;
						values.rawHeight = sidecar.height;
					} else if (side !== null) {
						values.rawWidth = side;
						values.rawHeight = side;
					}

					setRawFieldsVisible(side === null);

					if (isTerrainRawHeightmapSizeValid(values.rawWidth, values.rawHeight, bytes)) {
						await loadPreview(values.rawWidth, values.rawHeight);
					}
				} else {
					await loadPreview();
				}
			} catch (e) {
				if (mounted.current) {
					setError(`Can't read the heightmap "${getTerrainFileName(props.path)}": ${getTerrainErrorMessage(e)}`);
				}
			} finally {
				if (mounted.current) {
					setLoading(false);
					setFieldsRevision((revision) => revision + 1);
				}
			}
		})();

		return () => {
			mounted.current = false;
		};
	}, [props.path]);

	const rawSizeValid = !raw || isTerrainRawHeightmapSizeValid(values.rawWidth, values.rawHeight, rawBytes);
	const rangeValid = Number.isFinite(values.minWorld) && Number.isFinite(values.maxWorld);
	const canApply = !loading && !applying && rangeValid && rawSizeValid && (raw || summary !== null);

	function handleRawSizeChanged(): void {
		values.rawWidth = Math.round(values.rawWidth);
		values.rawHeight = Math.round(values.rawHeight);
		setRevision((revision) => revision + 1);

		if (isTerrainRawHeightmapSizeValid(values.rawWidth, values.rawHeight, rawBytes)) {
			void loadPreview(values.rawWidth, values.rawHeight);
		} else {
			setSummary(null);
		}
	}

	async function apply(): Promise<void> {
		setApplying(true);

		let result: Awaited<ReturnType<typeof importTerrainHeightmap>>;
		try {
			assertTerrainTabNotBusy();

			result = await importTerrainHeightmap(props.editor, props.mesh, props.path, {
				minWorld: values.minWorld,
				maxWorld: values.maxWorld,
				mode,
				flipY,
				...(raw ? { rawWidth: values.rawWidth, rawHeight: values.rawHeight } : {}),
			});
		} catch (e) {
			reportTerrainTabError(props.editor, e);

			if (mounted.current) {
				setApplying(false);
			}

			return;
		}

		toast.success(`Heightmap imported (${result.bitDepth}-bit, ${formatTerrainNumber(result.minWorld, 1)}–${formatTerrainNumber(result.maxWorld, 1)} cm)`);

		// Outside the try: closing the dialog is not part of the import (a failure there is no terrain error).
		props.onDone(true);
	}

	return (
		<div className="flex flex-col gap-3 w-[440px] max-w-[90vw] pt-2 text-foreground">
			<div className="flex gap-3 items-start">
				<div className="flex items-center justify-center w-32 h-32 shrink-0 rounded-lg bg-black/40 overflow-hidden">
					{summary?.preview ? (
						<img
							src={summary.preview}
							alt="Heightmap preview"
							draggable={false}
							className="w-full h-full object-contain"
							style={{ transform: flipY ? "scaleY(-1)" : undefined }}
						/>
					) : (
						<div className="text-xs text-muted-foreground text-center p-2">{loading ? "Loading…" : "No preview"}</div>
					)}
				</div>

				<div className="flex flex-col gap-1 min-w-0 text-sm">
					<div className="font-semibold break-all">{getTerrainFileName(props.path)}</div>

					{summary && (
						<div className="text-muted-foreground">
							{summary.width} × {summary.height} px · {summary.bitDepth}-bit{raw ? " RAW" : ""}
						</div>
					)}

					{summary?.bitDepth === 8 && (
						<div className="flex items-center gap-1 text-amber-500">
							<LuTriangleAlert className="w-4 h-4 shrink-0" /> 8-bit heightmaps produce visible terraces
						</div>
					)}

					<div className="text-xs text-muted-foreground">Image top = +Z · black = min height, white = max height</div>
				</div>
			</div>

			{error && (
				<div className="flex items-start gap-2 px-2 text-sm text-red-500">
					<LuTriangleAlert className="w-4 h-4 shrink-0 mt-0.5" /> <span className="break-words min-w-0">{error}</span>
				</div>
			)}

			{!loading && (
				<div className="flex flex-col gap-2">
					{raw && rawFieldsVisible && (
						<>
							<div className="px-2 text-xs text-muted-foreground">
								The size of this RAW file ({rawBytes} bytes) can't be inferred: enter it (width × height × 2 bytes).
							</div>
							<TerrainFieldsRow label="RAW size (px)">
								<EditorInspectorNumberField
									key={`raw-width-${fieldsRevision}`}
									object={values}
									property="rawWidth"
									min={1}
									step={1}
									noUndoRedo
									onChange={() => handleRawSizeChanged()}
								/>
								<EditorInspectorNumberField
									key={`raw-height-${fieldsRevision}`}
									object={values}
									property="rawHeight"
									min={1}
									step={1}
									noUndoRedo
									onChange={() => handleRawSizeChanged()}
								/>
							</TerrainFieldsRow>
						</>
					)}

					<TerrainFieldsRow label="Height (cm)">
						<EditorInspectorNumberField
							key={`min-${fieldsRevision}`}
							object={values}
							property="minWorld"
							step={1}
							noUndoRedo
							onChange={() => setRevision((revision) => revision + 1)}
						/>
						<EditorInspectorNumberField
							key={`max-${fieldsRevision}`}
							object={values}
							property="maxWorld"
							step={1}
							noUndoRedo
							onChange={() => setRevision((revision) => revision + 1)}
						/>
					</TerrainFieldsRow>

					{rangeNote && <div className="px-2 text-xs text-muted-foreground">{rangeNote}</div>}

					<div className="flex gap-2 items-center px-2">
						<div className="w-1/3">Mode</div>
						<Select value={mode} disabled={applying} onValueChange={(value) => setMode(value as TerrainHeightmapImportMode)}>
							<SelectTrigger className="w-2/3">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{TERRAIN_HEIGHTMAP_MODES.map((item) => (
									<SelectItem key={item.value} value={item.value}>
										{item.text}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center justify-between gap-2 px-2 cursor-pointer" onClick={() => !applying && setFlipY(!flipY)}>
						<div>Flip vertically</div>
						<Switch checked={flipY} disabled={applying} onChange={() => {}} />
					</div>
				</div>
			)}

			<div className="flex flex-wrap justify-end gap-2">
				<Button variant="secondary" className="min-w-24" disabled={applying} onClick={() => props.onDone(false)}>
					Cancel
				</Button>
				<Button className="min-w-24" disabled={!canApply} onClick={() => void apply()}>
					{applying ? "Importing…" : "Apply"}
				</Button>
			</div>
		</div>
	);
}

/**
 * Import heightmap (§1.13.4): asks for the file with `openSingleFileDialog({ title: "Import heightmap", filters: [{ name:
 * "Heightmaps", extensions: ["png", "tif", "tiff", "jpg", "jpeg", "raw", "r16"] }] })`, then shows the import dialog.
 * Never throws (errors are reported).
 * @param editor defines the editor reference.
 * @param mesh defines the terrain whose heights are replaced.
 * @returns true once the heightmap was imported, false when cancelled.
 */
export async function openTerrainHeightmapImport(editor: Editor, mesh: Mesh): Promise<boolean> {
	try {
		const file = openSingleFileDialog({
			title: "Import heightmap",
			filters: [{ name: "Heightmaps", extensions: TERRAIN_HEIGHTMAP_IMPORT_EXTENSIONS.slice() }],
		});

		if (!file) {
			return false;
		}

		const absolutePath = file.replace(/\\/g, "/");

		return await new Promise<boolean>((resolve) => {
			const holder: { dialog: ITerrainDialog | null; settled: boolean } = { dialog: null, settled: false };

			const finish = (applied: boolean): void => {
				if (!holder.settled) {
					holder.settled = true;
					resolve(applied);
				}
			};

			holder.dialog = showTerrainDialog(
				"Import heightmap",
				<TerrainHeightmapImportDialog
					editor={editor}
					mesh={mesh}
					path={absolutePath}
					onDone={(applied) => {
						finish(applied);
						holder.dialog?.close();
					}}
				/>,
				true
			);

			void holder.dialog.wait().then(() => finish(false));
		});
	} catch (e) {
		reportTerrainTabError(editor, e);
		return false;
	}
}

/**
 * Export heightmap (§1.13.5): `saveSingleFileDialog({ title: "Export heightmap", filters: [16-bit PNG, RAW 16-bit] })` → exportTerrainHeightmap
 * (the file plus `<file>.heightmap.json`) → toast "Heightmap exported ({min}–{max} cm)". RAW is chosen by the ".r16"/".raw" extension.
 * Never throws (errors are reported).
 * @param editor defines the editor reference.
 * @param mesh defines the terrain to export.
 * @returns true once the file was written.
 */
export async function openTerrainHeightmapExport(editor: Editor, mesh: Mesh): Promise<boolean> {
	try {
		const projectDirectory = getProjectDirectory();
		const name = (mesh.name || "terrain").replace(/[^A-Za-z0-9_-]+/g, "_");

		let path = saveSingleFileDialog({
			title: "Export heightmap",
			filters: [
				{ name: "16-bit PNG", extensions: ["png"] },
				{ name: "RAW 16-bit", extensions: ["r16", "raw"] },
			],
			defaultPath: projectDirectory ? join(projectDirectory, `${name}-heightmap.png`) : undefined,
		});

		if (!path) {
			return false;
		}

		path = path.replace(/\\/g, "/");
		if (!/\.(png|r16|raw)$/i.test(path)) {
			path = `${path}.png`;
		}

		const format = isTerrainRawHeightmapPath(path) ? "raw16" : "png16";
		const range = await exportTerrainHeightmap(mesh, path, format);

		toast.success(`Heightmap exported (${formatTerrainNumber(range.minWorld, 1)}–${formatTerrainNumber(range.maxWorld, 1)} cm)`);
		return true;
	} catch (e) {
		reportTerrainTabError(editor, e);
		return false;
	}
}
