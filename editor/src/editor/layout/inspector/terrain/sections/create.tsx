import { useState } from "react";

import { LuPlus } from "react-icons/lu";
import { FaMountainSun } from "react-icons/fa6";

import { Editor } from "../../../../main";

import { Button } from "../../../../../ui/shadcn/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../../ui/shadcn/ui/popover";

import { addTerrainMesh } from "../../../../../project/add/mesh";

import { getDefaultTerrainSubdivisions } from "../../../../../tools/terrain/core/settings";
import { TERRAIN_NEW_TERRAIN_SIZE } from "../../../../../tools/terrain/engine/structure";

import { EditorInspectorListField } from "../../fields/list";
import { EditorInspectorNumberField } from "../../fields/number";

import { formatTerrainResolutionOption, formatTerrainWeightMapOption } from "../format";

import { TerrainFieldsRow } from "../components/fields-row";

const resolutions = [64, 128, 256, 512, 1024];
const textureSizes = [256, 512, 1024, 2048];

export interface ITerrainCreatePopoverProps {
	editor: Editor;
}

/**
 * "New terrain" button: opens a popover to choose the size, the resolution and the texture sizes of the new terrain.
 */
export function TerrainCreatePopover(props: ITerrainCreatePopoverProps) {
	const [open, setOpen] = useState(false);
	const [, setRevision] = useState(0);

	const [options] = useState({
		width: TERRAIN_NEW_TERRAIN_SIZE,
		height: TERRAIN_NEW_TERRAIN_SIZE,
		// 0: the resolution follows the size of the terrain.
		subdivisions: 0,
		weightMapSize: 1024,
		layerTextureSize: 1024,
	});

	const subdivisions = options.subdivisions || getDefaultTerrainSubdivisions(options.width, options.height);

	function handleCreate() {
		addTerrainMesh(props.editor, undefined, { ...options, subdivisions });
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={(open) => setOpen(open)}>
			<PopoverTrigger asChild>
				<Button className="flex items-center gap-2 w-full">
					<LuPlus className="w-4 h-4 stroke-primary-foreground" /> New terrain
				</Button>
			</PopoverTrigger>
			<PopoverContent className="flex flex-col gap-2 w-96">
				<div className="flex items-center gap-2 px-2 font-semibold">
					<FaMountainSun className="w-4 h-4" /> New terrain
				</div>

				<TerrainFieldsRow label="Size (cm)">
					<EditorInspectorNumberField object={options} property="width" min={1} step={1} noUndoRedo onChange={() => setRevision((revision) => revision + 1)} />
					<EditorInspectorNumberField object={options} property="height" min={1} step={1} noUndoRedo onChange={() => setRevision((revision) => revision + 1)} />
				</TerrainFieldsRow>

				<EditorInspectorListField
					key={subdivisions}
					noUndoRedo
					object={{ subdivisions }}
					property="subdivisions"
					label="Resolution"
					items={resolutions.map((value) => ({ text: formatTerrainResolutionOption(value, options.width, options.height), value }))}
					onChange={(value) => {
						options.subdivisions = value;
						setRevision((revision) => revision + 1);
					}}
				/>

				<EditorInspectorListField
					noUndoRedo
					object={options}
					property="weightMapSize"
					label="Weight maps"
					items={textureSizes.map((value) => ({ text: formatTerrainWeightMapOption(value), value }))}
				/>

				<EditorInspectorListField
					noUndoRedo
					object={options}
					property="layerTextureSize"
					label="Layer textures"
					items={textureSizes.map((value) => ({ text: `${value}²`, value }))}
				/>

				<Button className="flex items-center gap-2 w-full" onClick={() => handleCreate()}>
					<FaMountainSun className="w-4 h-4 fill-primary-foreground" /> Create terrain
				</Button>
			</PopoverContent>
		</Popover>
	);
}
