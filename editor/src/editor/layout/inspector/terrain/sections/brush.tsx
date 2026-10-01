import { basename } from "path/posix";

import { Mesh } from "babylonjs";

import { Editor } from "../../../../main";

import { TerrainGrid } from "../../../../../tools/terrain/core/grid";
import { getActiveTerrainTool, getTerrainBrushRadiusRange } from "../../../../../tools/terrain/core/settings";
import { getTerrainMetric } from "../../../../../tools/terrain/engine/transform";
import { ITerrainInfo } from "../../../../../tools/terrain/engine/types";
import { getTerrainBrush } from "../../../../../tools/terrain/io/brushes";

import { EditorInspectorSectionField } from "../../fields/section";
import { IEditorInspectorListFieldItem } from "../../fields/list";

import { terrainSettings } from "../settings";

import { TerrainFalloffPreview } from "../components/falloff-preview";
import { TerrainSettingsListField, TerrainSettingsNumberField, TerrainSettingsSwitchField } from "../components/settings-fields";

import { TerrainBrushPalette } from "./palette";

const falloffItems: IEditorInspectorListFieldItem[] = [
	{ text: "Smooth", value: "smooth" },
	{ text: "Linear", value: "linear" },
	{ text: "Spherical", value: "spherical" },
	{ text: "Sharp", value: "sharp" },
	{ text: "Constant", value: "constant" },
	{ text: "Gaussian", value: "gaussian" },
];

export interface ITerrainBrushSectionProps {
	editor: Editor;
	mesh: Mesh;
	info: ITerrainInfo;
}

/**
 * "Brush" section of the sculpt and paint modes: the palette of brushes, then the radius, strength, hardness and falloff of the brush.
 */
export function TerrainBrushSection(props: ITerrainBrushSectionProps) {
	const brush = terrainSettings.brush;

	// The strength is stored per tool.
	const tool = getActiveTerrainTool(terrainSettings);

	// The radius goes from 1.5 cells to half the diagonal of the terrain.
	const range = getTerrainBrushRadiusRange(new TerrainGrid(props.info.subdivisions, props.info.width, props.info.height), getTerrainMetric(props.mesh));

	// A custom brush is named after its texture.
	const name = getTerrainBrush(brush.brushId)?.name ?? basename(brush.brushId);

	return (
		<EditorInspectorSectionField title="Brush" label={name}>
			<TerrainBrushPalette editor={props.editor} mesh={props.mesh} />

			<TerrainSettingsNumberField object={brush} property="radius" label="Radius" min={range.min} max={range.max} step={Number(range.step.toPrecision(2))} />
			<TerrainSettingsNumberField object={terrainSettings.strength} property={tool} label="Strength" percent min={0} max={100} step={1} />
			<TerrainSettingsNumberField object={brush} property="hardness" label="Hardness" percent min={0} max={95} step={1} />

			<div className="flex items-center w-full">
				<div className="flex-1">
					<TerrainSettingsListField object={brush} property="falloff" label="Falloff" items={falloffItems} />
				</div>

				<TerrainFalloffPreview falloff={brush.falloff} hardness={brush.hardness} className="w-[72px] h-[29px] mx-2" />
			</div>

			<TerrainSettingsSwitchField object={brush} property="edgeFalloff" label="Edge falloff (image brushes)" />
		</EditorInspectorSectionField>
	);
}
