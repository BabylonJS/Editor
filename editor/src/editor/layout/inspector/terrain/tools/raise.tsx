import { EditorInspectorSectionField } from "../../fields/section";

import { formatTerrainNumber } from "../format";
import { terrainSettings } from "../settings";

import { TerrainHeightClamp } from "./height-clamp";

/**
 * Raise tool: raises the terrain under the brush (lowers it with Shift). Its speed comes from the strength and the radius of the brush.
 */
export function TerrainRaiseTool() {
	const speed = 0.25 * terrainSettings.strength.raise * terrainSettings.brush.radius;

	return (
		<EditorInspectorSectionField title="Raise options" label={`≈ ${formatTerrainNumber(speed, 1)} cm per pass`}>
			<TerrainHeightClamp />
		</EditorInspectorSectionField>
	);
}
