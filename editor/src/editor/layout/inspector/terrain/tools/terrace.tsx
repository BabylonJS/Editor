import { EditorInspectorSectionField } from "../../fields/section";

import { terrainSettings } from "../settings";

import { TerrainSettingsNumberField } from "../components/settings-fields";

import { TerrainHeightClamp } from "./height-clamp";

/**
 * Terrace tool: quantizes the heights under the brush in steps.
 */
export function TerrainTerraceTool() {
	const terrace = terrainSettings.sculpt.terrace;

	return (
		<EditorInspectorSectionField title="Terrace options">
			<TerrainSettingsNumberField object={terrace} property="step" label="Step" min={0.01} step={1} />
			<TerrainSettingsNumberField object={terrace} property="sharpness" label="Sharpness" min={0} max={1} step={0.01} />
			<TerrainSettingsNumberField object={terrace} property="offset" label="Offset" step={1} />

			<TerrainHeightClamp />
		</EditorInspectorSectionField>
	);
}
