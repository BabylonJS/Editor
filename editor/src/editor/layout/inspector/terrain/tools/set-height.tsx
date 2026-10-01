import { EditorInspectorSectionField } from "../../fields/section";

import { terrainSettings } from "../settings";
import { TerrainViewportController } from "../viewport/controller";

import { TerrainSettingsListField } from "../components/settings-fields";

import { terrainBandModeItems } from "./mode-items";
import { TerrainHeightField } from "./height-field";
import { TerrainHeightClamp } from "./height-clamp";

export interface ITerrainSetHeightToolProps {
	controller: TerrainViewportController;
}

/**
 * Set height tool: moves the heights under the brush towards the given height.
 */
export function TerrainSetHeightTool(props: ITerrainSetHeightToolProps) {
	const setHeight = terrainSettings.sculpt.setHeight;

	return (
		<EditorInspectorSectionField title="Set height options">
			<TerrainHeightField object={setHeight} controller={props.controller} />
			<TerrainSettingsListField object={setHeight} property="mode" label="Mode" items={terrainBandModeItems} />

			<TerrainHeightClamp />
		</EditorInspectorSectionField>
	);
}
