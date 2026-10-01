import { useMemo } from "react";

import { ITerrainInfo } from "../../../../../tools/terrain/engine/types";

import { EditorInspectorSectionField } from "../../fields/section";

import { terrainSettings } from "../settings";

import { TerrainSettingsListField, TerrainSettingsNumberField } from "../components/settings-fields";

export interface ITerrainReplaceToolProps {
	info: ITerrainInfo;
}

/**
 * Replace tool: moves the weight of the "From layer" to the active layer under the brush (swaps them with Shift).
 */
export function TerrainReplaceTool(props: ITerrainReplaceToolProps) {
	const names = props.info.layers.map((layer) => layer.name).join();
	const items = useMemo(() => props.info.layers.map((layer) => ({ text: layer.name, value: layer.id })), [names]);

	return (
		<EditorInspectorSectionField title="Replace options">
			<TerrainSettingsListField object={terrainSettings.paint} property="replaceFromLayerId" label="From layer" items={items} />
			<TerrainSettingsNumberField object={terrainSettings.paint} property="replaceThreshold" label="Threshold" min={0} max={1} step={0.01} />
		</EditorInspectorSectionField>
	);
}
