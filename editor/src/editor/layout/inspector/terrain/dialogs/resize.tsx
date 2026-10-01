import { useEffect, useRef, useState } from "react";

import { LuTriangleAlert } from "react-icons/lu";

import type { Mesh } from "babylonjs";

import type { Editor } from "../../../../main";

import { Button } from "../../../../../ui/shadcn/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../ui/shadcn/ui/select";

import { getDefaultTerrainSubdivisions } from "../../../../../tools/terrain/core/settings";

import { EditorInspectorNumberField } from "../../fields/number";

import { reportTerrainTabError } from "../drop-actions";
import { TerrainFieldsRow } from "../components/fields-row";
import { formatTerrainCellComparison, formatTerrainNumber, formatTerrainResolution, getTerrainCellSize } from "../format";

import { showTerrainDialog, useTerrainDialogEscapeGuard, type ITerrainDialog } from "./show-dialog";
import { resizeTerrain } from "../../../../../tools/terrain/engine/structure";
import { getTerrainMeshInfo } from "../../../../../tools/terrain/engine/info";
import { isTerrainBusy, onTerrainBusyChangedObservable } from "../../../../../tools/terrain/engine/yield";

/** Resolutions offered by the Resize / resample dialog (§1.13.2), plus the current one. */
export const TERRAIN_RESIZE_SUBDIVISIONS: readonly number[] = [64, 128, 256, 512, 1024];

/** Resolution limits of a terrain (TERRAIN_MIN_SUBDIVISIONS / TERRAIN_MAX_SUBDIVISIONS of the runtime). */
const TERRAIN_RESIZE_MIN_SUBDIVISIONS = 2;
const TERRAIN_RESIZE_MAX_SUBDIVISIONS = 1024;

/** Largest size accepted for a side (cm, same limit as MCP create_terrain). */
export const TERRAIN_RESIZE_MAX_SIZE = 1000000;

/**
 * World size (cm) of a terrain whose local size is width x height: the local sizes multiplied by the world lengths of the local X and Z axes,
 * read from the rows of the world matrix (§4.1: sx = |(m[0], m[1], m[2])|, sz = |(m[8], m[9], m[10])|).
 * @param mesh defines the terrain.
 * @param width defines the local width (cm).
 * @param height defines the local depth (cm).
 */
export function getTerrainWorldSize(mesh: Mesh, width: number, height: number): { width: number; height: number } {
	let sx = 1;
	let sz = 1;

	try {
		const m = mesh.computeWorldMatrix(true).m;
		sx = Math.hypot(m[0], m[1], m[2]);
		sz = Math.hypot(m[8], m[9], m[10]);
	} catch (e) {
		// Without a world matrix the local size is used.
	}

	return {
		width: width * (Number.isFinite(sx) && sx > 1e-6 ? sx : 1),
		height: height * (Number.isFinite(sz) && sz > 1e-6 ? sz : 1),
	};
}

/**
 * Resolutions of the Subdivisions select: 64 · 128 · 256 · 512 · 1024 plus the current resolution when it is a supported terrain resolution
 * (2..1024) outside that list. Sorted.
 * @param current defines the current resolution (subdivisions) of the terrain.
 */
export function getTerrainResizeSubdivisionOptions(current: number): number[] {
	const options = TERRAIN_RESIZE_SUBDIVISIONS.slice();
	if (isTerrainResizeSubdivisionsSupported(current) && !options.includes(current)) {
		options.push(current);
	}

	return options.sort((a, b) => a - b);
}

/**
 * Whether a resolution is a valid terrain resolution (integer in 2..1024).
 * @param subdivisions defines the resolution to test.
 */
export function isTerrainResizeSubdivisionsSupported(subdivisions: number): boolean {
	return Number.isInteger(subdivisions) && subdivisions >= TERRAIN_RESIZE_MIN_SUBDIVISIONS && subdivisions <= TERRAIN_RESIZE_MAX_SUBDIVISIONS;
}

/**
 * Cell size shown by the comparison "cell {old} cm → {new} cm": the largest of the two cell sizes (cm).
 * @param width defines the width (cm).
 * @param height defines the depth (cm).
 * @param subdivisions defines the resolution.
 */
export function getTerrainResizeCell(width: number, height: number, subdivisions: number): number {
	return Math.max(getTerrainCellSize(width, subdivisions), getTerrainCellSize(height, subdivisions));
}

/**
 * Whether the size fields hold a valid size (finite, > 0, at most 1 000 000 cm).
 * @param width defines the width (cm).
 * @param height defines the depth (cm).
 */
export function isTerrainResizeSizeValid(width: number, height: number): boolean {
	return [width, height].every((value) => Number.isFinite(value) && value > 0 && value <= TERRAIN_RESIZE_MAX_SIZE);
}

interface ITerrainResizeInitialValues {
	width: number;
	height: number;
	/** Current resolution of the terrain. */
	current: number;
	/** Resolution selected at opening. */
	subdivisions: number;
	/** Error when the terrain can't be read (not a valid grid). */
	error: string | null;
}

function readTerrainResizeInitialValues(mesh: Mesh, subdivisions?: number): ITerrainResizeInitialValues {
	try {
		const info = getTerrainMeshInfo(mesh);

		let target = subdivisions ?? info.subdivisions;
		if (!isTerrainResizeSubdivisionsSupported(target)) {
			// Unsupported resolution (edited outside the editor): the default resolution of this size (§1.3 [Resample to {S'}]).
			target = getDefaultTerrainSubdivisions(info.width, info.height);
		}

		return {
			width: info.width,
			height: info.height,
			current: info.subdivisions,
			subdivisions: target,
			error: null,
		};
	} catch (e) {
		return {
			width: 0,
			height: 0,
			current: 0,
			subdivisions: 0,
			error: e instanceof Error ? e.message : String(e),
		};
	}
}

export interface ITerrainResizeFormProps {
	/** The editor reference. */
	editor: Editor;
	/** The terrain to resize / resample. */
	mesh: Mesh;
	/** Resolution selected at opening (default: the current one when supported, else getDefaultTerrainSubdivisions). */
	subdivisions?: number;
	/** Called after a successful resize (true) or when Cancel is clicked (false). */
	onDone?: (applied: boolean) => void;
	/** Shows a Cancel button (dialog mode). */
	showCancel?: boolean;
	/** Extra classes of the form. */
	className?: string;
}

/**
 * Resize / resample form (§1.13.2): Width, Depth (local cm), Subdivisions (64…1024 + current), live comparison "cell {old} cm → {new} cm",
 * the warning "Details smaller than {cell} cm will be lost." when the resolution decreases, and Apply → resizeTerrain (one undo entry, §6.12).
 * Used by the modal dialog.
 */
export function TerrainResizeForm(props: ITerrainResizeFormProps): JSX.Element {
	const [initial, setInitial] = useState(() => readTerrainResizeInitialValues(props.mesh, props.subdivisions));
	const [subdivisions, setSubdivisions] = useState(initial.subdivisions);
	const [applying, setApplying] = useState(false);
	const [busy, setBusy] = useState(() => isTerrainBusy());
	const [baseRevision, setBaseRevision] = useState(0);
	const [, setRevision] = useState(0);

	const values = useRef({ width: initial.width, height: initial.height }).current;
	const mounted = useRef(true);

	// The resize can't be cancelled once started (Cancel is disabled): Escape doesn't close the dialog meanwhile.
	useTerrainDialogEscapeGuard(applying);

	useEffect(() => {
		mounted.current = true;

		const observer = onTerrainBusyChangedObservable.add(() => {
			try {
				setBusy(isTerrainBusy());
			} catch (e) {
				reportTerrainTabError(props.editor, e);
			}
		});

		return () => {
			mounted.current = false;
			onTerrainBusyChangedObservable.remove(observer);
		};
	}, [props.editor]);

	if (initial.error) {
		return (
			<div className={`flex items-center gap-2 text-sm text-foreground ${props.className ?? ""}`}>
				<LuTriangleAlert className="w-4 h-4 shrink-0 text-red-500" /> {initial.error}
			</div>
		);
	}

	const options = getTerrainResizeSubdivisionOptions(initial.current);
	const oldCell = getTerrainResizeCell(initial.width, initial.height, initial.current);
	const newCell = getTerrainResizeCell(values.width, values.height, subdivisions);

	const valid = isTerrainResizeSizeValid(values.width, values.height) && isTerrainResizeSubdivisionsSupported(subdivisions);
	const changed = values.width !== initial.width || values.height !== initial.height || subdivisions !== initial.current;

	async function apply(): Promise<void> {
		setApplying(true);

		try {
			await resizeTerrain(props.editor, props.mesh, {
				width: values.width,
				height: values.height,
				subdivisions,
			});
		} catch (e) {
			reportTerrainTabError(props.editor, e);

			if (mounted.current) {
				setApplying(false);
			}

			return;
		}

		if (mounted.current) {
			// Embedded forms stay mounted: the new state becomes the reference.
			const next = readTerrainResizeInitialValues(props.mesh);
			values.width = next.width;
			values.height = next.height;

			setInitial(next);
			setSubdivisions(next.subdivisions);
			setBaseRevision((revision) => revision + 1);
			setApplying(false);
		}

		// Outside the try: closing the dialog is not part of the resize (a failure there is no terrain error).
		props.onDone?.(true);
	}

	return (
		<div className={`flex flex-col gap-3 text-foreground ${props.className ?? ""}`}>
			<div className="flex flex-col gap-2">
				<TerrainFieldsRow label="Size (cm)">
					<EditorInspectorNumberField
						key={`width-${baseRevision}`}
						object={values}
						property="width"
						min={1}
						max={TERRAIN_RESIZE_MAX_SIZE}
						step={1}
						noUndoRedo
						onChange={() => setRevision((revision) => revision + 1)}
					/>
					<EditorInspectorNumberField
						key={`height-${baseRevision}`}
						object={values}
						property="height"
						min={1}
						max={TERRAIN_RESIZE_MAX_SIZE}
						step={1}
						noUndoRedo
						onChange={() => setRevision((revision) => revision + 1)}
					/>
				</TerrainFieldsRow>

				<div className="flex gap-2 items-center px-2">
					<div className="w-1/3 text-ellipsis overflow-hidden whitespace-nowrap">Subdivisions</div>
					<Select value={String(subdivisions)} disabled={applying} onValueChange={(value) => setSubdivisions(parseInt(value, 10))}>
						<SelectTrigger className="w-2/3">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{options.map((option) => (
								<SelectItem key={option} value={String(option)}>
									{formatTerrainResolution(option)}
									{option === initial.current ? " (current)" : ""}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="px-2 text-sm text-muted-foreground">{formatTerrainCellComparison(oldCell, newCell)}</div>

			{subdivisions < initial.current && (
				<div className="flex items-center gap-2 px-2 text-sm text-amber-500">
					<LuTriangleAlert className="w-4 h-4 shrink-0" /> Details smaller than {formatTerrainNumber(newCell, 1)} cm will be lost.
				</div>
			)}

			{!isTerrainResizeSubdivisionsSupported(initial.current) && (
				<div className="px-2 text-sm text-amber-500">
					This terrain has {initial.current} subdivisions; terrains support {TERRAIN_RESIZE_MIN_SUBDIVISIONS} to {TERRAIN_RESIZE_MAX_SUBDIVISIONS}.
				</div>
			)}

			<div className="px-2 text-xs text-muted-foreground">Heights and holes are resampled; a size change stretches the relief. This can be undone.</div>

			<div className="flex flex-wrap justify-end gap-2">
				{props.showCancel && (
					<Button variant="secondary" className="min-w-24" disabled={applying} onClick={() => props.onDone?.(false)}>
						Cancel
					</Button>
				)}

				<Button className="min-w-24" disabled={!valid || !changed || busy || applying} onClick={() => void apply()}>
					{applying ? "Resampling…" : "Apply"}
				</Button>
			</div>
		</div>
	);
}

/**
 * Opens the modal Resize / resample dialog of a terrain (§1.13.2, rendered with showTerrainDialog and closed through its idempotent close()).
 * Never throws (errors are reported).
 * @param editor defines the editor reference.
 * @param mesh defines the terrain to resize / resample.
 * @param options defines the resolution selected at opening (e.g. the [Resample to {S'}] banner action).
 * @returns true once the terrain was resized, false when the dialog was closed without applying.
 */
export function openTerrainResizeDialog(editor: Editor, mesh: Mesh, options?: { subdivisions?: number }): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const holder: { dialog: ITerrainDialog | null; settled: boolean } = { dialog: null, settled: false };

		const finish = (applied: boolean): void => {
			if (!holder.settled) {
				holder.settled = true;
				resolve(applied);
			}
		};

		try {
			holder.dialog = showTerrainDialog(
				"Resize / resample",
				<TerrainResizeForm
					editor={editor}
					mesh={mesh}
					subdivisions={options?.subdivisions}
					showCancel
					className="w-[420px] max-w-[90vw] pt-2"
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
