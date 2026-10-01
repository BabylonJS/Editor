import { Scene } from "babylonjs";

import { TERRAIN_BRUSHES } from "../../tools/terrain/io/brushes";

import { IMCPActionOptions } from "../action";

/**
 * Brush of list_terrain_brushes.
 */
export interface ITerrainMcpBrushSummary {
	id: string;
	name: string;
}

/**
 * list_terrain_brushes: the brushes of the terrain tool, in display order.
 */
export async function listTerrainBrushes(_scene: Scene, _data: any, _options: IMCPActionOptions): Promise<{ brushes: ITerrainMcpBrushSummary[] }> {
	return {
		brushes: TERRAIN_BRUSHES.map((brush) => ({ id: brush.id, name: brush.name })),
	};
}
