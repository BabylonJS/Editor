import { EditorInspectorSectionField } from "../../fields/section";
import { IEditorInspectorListFieldItem } from "../../fields/list";

import { terrainSettings } from "../settings";
import { TerrainViewportController } from "../viewport/controller";

import { TerrainSettingsListField } from "../components/settings-fields";

import { terrainBandModeItems } from "./mode-items";
import { TerrainHeightField } from "./height-field";
import { TerrainHeightClamp } from "./height-clamp";

const targetItems: IEditorInspectorListFieldItem[] = [
	{ text: "Stroke start", value: "stroke-start" },
	{ text: "Fixed height", value: "fixed" },
	{ text: "Slope plane", value: "slope" },
];

export interface ITerrainFlattenToolProps {
	controller: TerrainViewportController;
}

/**
 * Flatten tool: moves the heights under the brush towards the height where the stroke started, a fixed height or a slope plane.
 */
export function TerrainFlattenTool(props: ITerrainFlattenToolProps) {
	const flatten = terrainSettings.sculpt.flatten;

	return (
		<EditorInspectorSectionField title="Flatten options">
			<TerrainSettingsListField object={flatten} property="target" label="Target" items={targetItems} />
			{flatten.target === "fixed" && <TerrainHeightField object={flatten} controller={props.controller} />}
			<TerrainSettingsListField object={flatten} property="mode" label="Mode" items={terrainBandModeItems} />

			<TerrainHeightClamp />
		</EditorInspectorSectionField>
	);
}
