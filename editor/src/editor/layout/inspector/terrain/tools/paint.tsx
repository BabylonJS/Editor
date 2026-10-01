import { EditorInspectorSectionField } from "../../fields/section";

import { terrainSettings } from "../settings";

import { TerrainSettingsNumberField } from "../components/settings-fields";

/**
 * Paint tool: paints the active layer under the brush (erases it with Shift).
 */
export function TerrainPaintTool() {
	return (
		<EditorInspectorSectionField title="Paint options">
			<TerrainSettingsNumberField object={terrainSettings.paint} property="opacity" label="Opacity" percent min={0} max={100} step={1} />
		</EditorInspectorSectionField>
	);
}
