import { useMemo } from "react";

import { Mesh } from "babylonjs";

import { ITerrainInfo } from "../../../../../tools/terrain/engine/types";
import { getTerrainMetric } from "../../../../../tools/terrain/engine/transform";

import { EditorInspectorSectionField } from "../../fields/section";
import { IEditorInspectorListFieldItem } from "../../fields/list";

import { terrainSettings } from "../settings";

import { TerrainSettingsListField } from "../components/settings-fields";

import { TerrainHeightClamp } from "./height-clamp";

export interface ITerrainSmoothToolProps {
	mesh: Mesh;
	info: ITerrainInfo;
}

/**
 * Smooth tool: averages the heights under the brush (sharpens them with Shift). The kernel is the size of the average, in cells.
 */
export function TerrainSmoothTool(props: ITerrainSmoothToolProps) {
	// "Auto" follows the radius of the brush: a quarter of the radius in cells, between 1 and 8.
	const metric = getTerrainMetric(props.mesh);
	const cell = Math.min(props.info.cellX * metric.sx, props.info.cellZ * metric.sz);
	const auto = Math.min(8, Math.max(1, Math.round((terrainSettings.brush.radius / cell) * 0.25)));

	const items = useMemo(() => {
		const items: IEditorInspectorListFieldItem[] = [{ text: `Auto (${auto} cell${auto === 1 ? "" : "s"})`, value: 0 }];
		for (let cells = 1; cells <= 16; ++cells) {
			items.push({ text: `${cells} cell${cells === 1 ? "" : "s"}`, value: cells });
		}

		return items;
	}, [auto]);

	return (
		<EditorInspectorSectionField title="Smooth options">
			<TerrainSettingsListField object={terrainSettings.sculpt} property="smoothKernel" label="Kernel" items={items} />

			<TerrainHeightClamp />
		</EditorInspectorSectionField>
	);
}
