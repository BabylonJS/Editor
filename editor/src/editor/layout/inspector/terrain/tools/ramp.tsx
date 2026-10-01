import { EditorInspectorSectionField } from "../../fields/section";
import { IEditorInspectorListFieldItem } from "../../fields/list";

import { terrainSettings } from "../settings";

import { TerrainFieldsRow } from "../components/fields-row";
import { TerrainSettingsListField, TerrainSettingsNumberField } from "../components/settings-fields";

import { terrainBandModeItems } from "./mode-items";
import { TerrainHeightClamp } from "./height-clamp";

const endHeightsItems: IEditorInspectorListFieldItem[] = [
	{ text: "From terrain", value: "terrain" },
	{ text: "Custom", value: "custom" },
];

/**
 * Ramp tool: draws a ramp between the point where the stroke starts and the point where it ends. Its width is the diameter of the brush.
 */
export function TerrainRampTool() {
	const ramp = terrainSettings.sculpt.ramp;

	return (
		<EditorInspectorSectionField title="Ramp options">
			<TerrainSettingsNumberField object={ramp} property="sideFalloff" label="Side falloff" percent min={0} max={100} step={1} />
			<TerrainSettingsListField object={ramp} property="mode" label="Mode" items={terrainBandModeItems} />
			<TerrainSettingsListField object={ramp} property="endHeights" label="End heights" items={endHeightsItems} />

			{ramp.endHeights === "custom" && (
				<TerrainFieldsRow label="Start / End">
					<TerrainSettingsNumberField object={ramp} property="startWorld" step={1} />
					<TerrainSettingsNumberField object={ramp} property="endWorld" step={1} />
				</TerrainFieldsRow>
			)}

			<TerrainHeightClamp />
		</EditorInspectorSectionField>
	);
}
