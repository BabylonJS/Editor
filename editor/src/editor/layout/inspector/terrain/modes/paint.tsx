import { useState } from "react";

import { Mesh } from "babylonjs";

import { Editor } from "../../../../main";

import { ITerrainInfo } from "../../../../../tools/terrain/engine/types";

import { useTerrainSettings } from "../hooks";
import { terrainSettings } from "../settings";

import { TerrainBrushSection } from "../sections/brush";
import { TerrainStrokeSection } from "../sections/stroke";
import { TerrainLayersSection } from "../sections/layers/layers";
import { TerrainLayerOptionsSection } from "../sections/layers/options";
import { TerrainLayerTexturesSection } from "../sections/layers/textures";
import { TerrainFiltersSection } from "../sections/filters";

import { TerrainPaintTool } from "../tools/paint";
import { TerrainBlendTool } from "../tools/blend";
import { TerrainReplaceTool } from "../tools/replace";

export interface ITerrainPaintModeProps {
	editor: Editor;
	mesh: Mesh;
	info: ITerrainInfo;
}

/**
 * Paint mode: the brush, the layers of the terrain, the options and the textures of the active layer, the options of the selected tool
 * and the filters. The tools are in the "Mode & tool" section. The brush and the options are shown once the texture painting is enabled
 * for the terrain (Layers section).
 */
export function TerrainPaintMode(props: ITerrainPaintModeProps) {
	useTerrainSettings();

	// The fields of the active layer write their values while they are edited: draw the sections again to show its new name and tint.
	const [, setRevision] = useState(0);

	const tool = terrainSettings.paintTool;

	return (
		<>
			{props.info.material?.isTerrainMaterial && (
				<>
					<TerrainBrushSection editor={props.editor} mesh={props.mesh} info={props.info} />
					<TerrainStrokeSection />
				</>
			)}
			<TerrainLayersSection editor={props.editor} mesh={props.mesh} info={props.info} />
			<TerrainLayerOptionsSection editor={props.editor} mesh={props.mesh} info={props.info} onChange={() => setRevision((revision) => revision + 1)} />
			<TerrainLayerTexturesSection editor={props.editor} mesh={props.mesh} info={props.info} />

			{props.info.material?.isTerrainMaterial && (
				<>
					{tool === "paint" && <TerrainPaintTool />}
					{tool === "blend" && <TerrainBlendTool />}
					{tool === "replace" && <TerrainReplaceTool info={props.info} />}

					<TerrainFiltersSection info={props.info} />
				</>
			)}
		</>
	);
}
