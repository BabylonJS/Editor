import { Mesh } from "babylonjs";

import { Editor } from "../../../../main";

import { ITerrainInfo } from "../../../../../tools/terrain/engine/types";

import { useTerrainSettings } from "../hooks";
import { terrainSettings } from "../settings";
import { TerrainViewportController } from "../viewport/controller";

import { TerrainBrushSection } from "../sections/brush";
import { TerrainStrokeSection } from "../sections/stroke";
import { TerrainFiltersSection } from "../sections/filters";

import { TerrainRaiseTool } from "../tools/raise";
import { TerrainSmoothTool } from "../tools/smooth";
import { TerrainFlattenTool } from "../tools/flatten";
import { TerrainSetHeightTool } from "../tools/set-height";
import { TerrainRampTool } from "../tools/ramp";
import { TerrainNoiseTool } from "../tools/noise";
import { TerrainTerraceTool } from "../tools/terrace";
import { TerrainHolesTool } from "../tools/holes";

export interface ITerrainSculptModeProps {
	editor: Editor;
	mesh: Mesh;
	info: ITerrainInfo;
	controller: TerrainViewportController;
}

/**
 * Sculpt mode: the brush, the options of the selected tool and the filters. The tools are in the "Mode & tool" section.
 */
export function TerrainSculptMode(props: ITerrainSculptModeProps) {
	useTerrainSettings();

	const tool = terrainSettings.sculptTool;

	return (
		<>
			<TerrainBrushSection editor={props.editor} mesh={props.mesh} info={props.info} />
			<TerrainStrokeSection />

			{tool === "raise" && <TerrainRaiseTool />}
			{tool === "smooth" && <TerrainSmoothTool mesh={props.mesh} info={props.info} />}
			{tool === "flatten" && <TerrainFlattenTool controller={props.controller} />}
			{tool === "set-height" && <TerrainSetHeightTool controller={props.controller} />}
			{tool === "ramp" && <TerrainRampTool />}
			{tool === "noise" && <TerrainNoiseTool />}
			{tool === "terrace" && <TerrainTerraceTool />}
			{tool === "holes" && <TerrainHolesTool />}

			<TerrainFiltersSection info={props.info} />
		</>
	);
}
