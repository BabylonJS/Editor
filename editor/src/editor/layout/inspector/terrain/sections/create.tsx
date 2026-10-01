import { useState } from "react";

import { LuPlus, LuTriangleAlert } from "react-icons/lu";
import { FaMountainSun } from "react-icons/fa6";

import type { Mesh } from "babylonjs";

import type { Editor } from "../../../../main";

import { Badge } from "../../../../../ui/shadcn/ui/badge";
import { Button } from "../../../../../ui/shadcn/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../../ui/shadcn/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../ui/shadcn/ui/select";

import { addTerrainMesh } from "../../../../../project/add/mesh";

import { getDefaultTerrainSubdivisions } from "../../../../../tools/terrain/core/settings";
import { TERRAIN_NEW_TERRAIN_SIZE } from "../../../../../tools/terrain/engine/structure";

import { EditorInspectorNumberField } from "../../fields/number";

import { reportTerrainTabError } from "../drop-actions";
import { TerrainFieldsRow } from "../components/fields-row";
import { TerrainCollapsibleBlock } from "../components/collapsible-block";
import { formatTerrainResolutionOption, formatTerrainWeightMapOption } from "../format";

/** Resolutions offered by the New terrain panel (§1.13.1). */
export const TERRAIN_CREATE_RESOLUTIONS: readonly number[] = [64, 128, 256, 512, 1024];
/** Weight map and layer texture resolutions (TERRAIN_WEIGHT_MAP_SIZES / TERRAIN_LAYER_TEXTURE_SIZES of the runtime). */
export const TERRAIN_CREATE_TEXTURE_SIZES: readonly number[] = [256, 512, 1024, 2048];

interface ITerrainCreateSize {
	width: number;
	height: number;
}

export interface ITerrainCreatePanelProps {
	/** The editor reference. */
	editor: Editor;
	/** Disables the Create button (a terrain operation runs). */
	busy?: boolean;
	/** Called after the terrain was created. */
	onCreated?: (mesh: Mesh) => void;
}

/**
 * New terrain panel (§1.13.1), inside the New terrain popover: size, resolution and texture sizes of a new flat TerrainMesh (addTerrainMesh:
 * selected and not undoable like the other "add mesh" commands).
 */
export function TerrainCreatePanel(props: ITerrainCreatePanelProps): JSX.Element {
	// Stable object bound to the Width / Depth fields (the NumberField resyncs only when its object changes).
	const [size] = useState<ITerrainCreateSize>(() => ({ width: TERRAIN_NEW_TERRAIN_SIZE, height: TERRAIN_NEW_TERRAIN_SIZE }));

	const [, setSizeRevision] = useState(0);
	const [resolution, setResolution] = useState<number | null>(null);
	const [weightMapSize, setWeightMapSize] = useState(1024);
	const [layerTextureSize, setLayerTextureSize] = useState(1024);

	const subdivisions = resolution ?? getDefaultTerrainSubdivisions(size.width, size.height);

	function handleCreate(): void {
		try {
			const mesh = addTerrainMesh(props.editor, undefined, {
				subdivisions,
				width: size.width,
				height: size.height,
				weightMapSize,
				layerTextureSize,
			});

			props.onCreated?.(mesh);
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	return (
		<div className="flex flex-col gap-3 w-full">
			<TerrainFieldsRow label="Size (cm)">
				<EditorInspectorNumberField object={size} property="width" min={1} step={1} noUndoRedo onChange={() => setSizeRevision((revision) => revision + 1)} />
				<EditorInspectorNumberField object={size} property="height" min={1} step={1} noUndoRedo onChange={() => setSizeRevision((revision) => revision + 1)} />
			</TerrainFieldsRow>

			<div className="flex flex-col gap-2 px-2">
				<div className="text-sm">Resolution</div>
				<Select value={String(subdivisions)} onValueChange={(value) => setResolution(parseInt(value, 10))}>
					<SelectTrigger className="h-8">
						<SelectValue>{formatTerrainResolutionOption(subdivisions, size.width, size.height)}</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{TERRAIN_CREATE_RESOLUTIONS.map((value) => (
							<SelectItem key={value} value={String(value)}>
								{formatTerrainResolutionOption(value, size.width, size.height)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{subdivisions >= 1024 && (
					<Badge variant="secondary" className="flex items-center gap-2 w-fit">
						<LuTriangleAlert className="w-4 h-4 text-amber-500" /> 1M vertices: heavy saves and physics
					</Badge>
				)}
			</div>

			<TerrainCollapsibleBlock id="create-advanced" title="Advanced">
				<div className="flex flex-col gap-2 px-1">
					<div className="text-sm">Weight map resolution</div>
					<Select value={String(weightMapSize)} onValueChange={(value) => setWeightMapSize(parseInt(value, 10))}>
						<SelectTrigger className="h-8">
							<SelectValue>{formatTerrainWeightMapOption(weightMapSize)}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{TERRAIN_CREATE_TEXTURE_SIZES.map((value) => (
								<SelectItem key={value} value={String(value)}>
									{formatTerrainWeightMapOption(value)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<div className="text-sm">Layer texture resolution</div>
					<Select value={String(layerTextureSize)} onValueChange={(value) => setLayerTextureSize(parseInt(value, 10))}>
						<SelectTrigger className="h-8">
							<SelectValue>{layerTextureSize}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{TERRAIN_CREATE_TEXTURE_SIZES.map((value) => (
								<SelectItem key={value} value={String(value)}>
									{value}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</TerrainCollapsibleBlock>

			<Button className="flex items-center gap-2 w-full" disabled={props.busy} onClick={() => handleCreate()}>
				<FaMountainSun className="w-4 h-4" /> Create terrain
			</Button>
		</div>
	);
}

export interface ITerrainCreatePopoverProps {
	/** The editor reference. */
	editor: Editor;
	/** Disables the Create button (a terrain operation runs). */
	busy?: boolean;
	/** Extra classes of the New terrain button. */
	className?: string;
}

/**
 * Primary "New terrain" button opening the New terrain panel in a popover (§1.3, §1.13.1).
 */
export function TerrainCreatePopover(props: ITerrainCreatePopoverProps): JSX.Element {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={(value) => setOpen(value)}>
			<PopoverTrigger asChild>
				<Button className={`flex items-center gap-2 ${props.className ?? ""}`}>
					<LuPlus className="w-4 h-4" /> New terrain
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-96 max-w-[95vw] max-h-[80vh] overflow-y-auto">
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2 font-semibold">
						<FaMountainSun className="w-4 h-4" /> New terrain
					</div>

					{open && <TerrainCreatePanel editor={props.editor} busy={props.busy} onCreated={() => setOpen(false)} />}
				</div>
			</PopoverContent>
		</Popover>
	);
}
