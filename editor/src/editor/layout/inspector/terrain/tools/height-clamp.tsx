import { EditorInspectorBlockField } from "../../fields/block";

import { terrainSettings } from "../settings";

import { TerrainFieldsRow } from "../components/fields-row";
import { TerrainSettingsNumberField, TerrainSettingsSwitchField } from "../components/settings-fields";

/**
 * Height clamp shared by the sculpt tools: keeps the heights between a minimum and a maximum.
 */
export function TerrainHeightClamp() {
	const clamp = terrainSettings.sculpt.heightClamp;

	return (
		<EditorInspectorBlockField>
			<TerrainSettingsSwitchField
				object={clamp}
				property="enabled"
				label="Height clamp"
				tooltip="Keeps the heights between Min and Max (world cm) after every sculpt tool."
			/>

			{clamp.enabled && (
				<TerrainFieldsRow label="Min / Max">
					<TerrainSettingsNumberField object={clamp} property="minWorld" step={1} />
					<TerrainSettingsNumberField object={clamp} property="maxWorld" step={1} />
				</TerrainFieldsRow>
			)}
		</EditorInspectorBlockField>
	);
}
