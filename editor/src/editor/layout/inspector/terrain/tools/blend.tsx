import { EditorInspectorSectionField } from "../../fields/section";

import { terrainSettings } from "../settings";

import { TerrainSettingsNumberField } from "../components/settings-fields";

/**
 * Blend tool: blurs the painted layers together under the brush.
 */
export function TerrainBlendTool() {
	return (
		<EditorInspectorSectionField title="Blend options">
			<TerrainSettingsNumberField object={terrainSettings.paint} property="blendKernel" label="Blend kernel" integer min={1} max={8} />
		</EditorInspectorSectionField>
	);
}
