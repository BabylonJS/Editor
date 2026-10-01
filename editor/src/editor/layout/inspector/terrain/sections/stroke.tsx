import { getActiveTerrainTool } from "../../../../../tools/terrain/core/settings";
import { TerrainTool } from "../../../../../tools/terrain/core/types";

import { EditorInspectorSectionField } from "../../fields/section";
import { IEditorInspectorListFieldItem } from "../../fields/list";

import { terrainSettings } from "../settings";

import { TerrainSettingsListField, TerrainSettingsNumberField, TerrainSettingsSwitchField } from "../components/settings-fields";

const symmetryItems: IEditorInspectorListFieldItem[] = [
	{ text: "None", value: "none" },
	{ text: "X", value: "x" },
	{ text: "Z", value: "z" },
	{ text: "X and Z", value: "xz" },
];

/** Tools applied once per stroke or with a binary result: they have no airbrush. */
const toolsWithoutAirbrush: TerrainTool[] = ["ramp", "holes"];

/**
 * "Stroke & jitter" section of the sculpt and paint modes: how the brush is applied along a stroke (spacing, rotation, jitters, airbrush,
 * smoothing and symmetry).
 */
export function TerrainStrokeSection() {
	const brush = terrainSettings.brush;

	// The airbrush is stored per tool.
	const tool = getActiveTerrainTool(terrainSettings);

	return (
		<EditorInspectorSectionField title="Stroke & jitter" closed>
			<TerrainSettingsNumberField object={brush} property="spacing" label="Spacing" percent min={2} max={200} step={1} />
			<TerrainSettingsNumberField object={brush} property="rotation" label="Rotation" min={-180} max={180} step={1} />
			<TerrainSettingsSwitchField object={brush} property="followStroke" label="Follow stroke direction" />
			<TerrainSettingsNumberField object={brush} property="positionJitter" label="Position jitter" percent min={0} max={100} step={1} />
			<TerrainSettingsNumberField object={brush} property="rotationJitter" label="Rotation jitter" min={0} max={180} step={1} />
			<TerrainSettingsNumberField object={brush} property="sizeJitter" label="Size jitter" percent min={0} max={100} step={1} />
			<TerrainSettingsNumberField object={brush} property="strengthJitter" label="Strength jitter" percent min={0} max={100} step={1} />

			{!toolsWithoutAirbrush.includes(tool) && (
				<TerrainSettingsSwitchField
					object={terrainSettings.airbrush}
					property={tool}
					label="Airbrush"
					tooltip="The tool keeps applying while the pointer is still (30 dabs per second)."
				/>
			)}

			<TerrainSettingsNumberField object={brush} property="smoothing" label="Stroke smoothing" percent min={0} max={95} step={1} />
			<TerrainSettingsListField object={brush} property="symmetry" label="Symmetry" items={symmetryItems} />
		</EditorInspectorSectionField>
	);
}
