import { EditorInspectorSectionField } from "../../fields/section";

import { terrainSettings } from "../settings";

import { TerrainSettingsNumberField } from "../components/settings-fields";

import { TerrainHeightClamp } from "./height-clamp";

/**
 * Holes tool: cuts holes in the terrain (fills them with Shift). Physics, navigation and picking fall through holes.
 */
export function TerrainHolesTool() {
	return (
		<EditorInspectorSectionField title="Holes options">
			<TerrainSettingsNumberField object={terrainSettings.sculpt.holes} property="threshold" label="Threshold" min={0.05} max={1} step={0.01} />

			<TerrainHeightClamp />
		</EditorInspectorSectionField>
	);
}
