import { useState } from "react";
import { useEventListener } from "usehooks-ts";

import { IconType } from "react-icons";
import { TbStairs } from "react-icons/tb";
import {
	LuArrowDownToLine,
	LuArrowUpFromLine,
	LuBlend,
	LuCircleDashed,
	LuEqual,
	LuMountain,
	LuPaintbrush,
	LuReplace,
	LuRuler,
	LuSparkles,
	LuSpline,
	LuWaves,
} from "react-icons/lu";

import { ToolbarRadioGroup, ToolbarRadioGroupItem } from "../../../../../ui/shadcn/ui/toolbar-radio-group";

import { TERRAIN_PAINT_TOOLS } from "../../../../../tools/terrain/core/settings";
import { ITerrainInfo } from "../../../../../tools/terrain/engine/types";
import { TerrainCategory, TerrainPaintTool, TerrainSculptTool, TerrainTool } from "../../../../../tools/terrain/core/types";

import { EditorInspectorSectionField } from "../../fields/section";

import { TerrainInspectorTool, terrainSculptTools, terrainSettings, updateTerrainSettings } from "../settings";
import { Separator } from "../../../../../ui/shadcn/ui/separator";

const modes: { mode: TerrainCategory; label: string; icon: IconType }[] = [
	{ mode: "sculpt", label: "Sculpt", icon: LuMountain },
	{ mode: "paint", label: "Paint", icon: LuPaintbrush },
];

const tools: Record<TerrainInspectorTool, { label: string; icon: IconType }> = {
	raise: { label: "Raise", icon: LuArrowUpFromLine },
	smooth: { label: "Smooth", icon: LuWaves },
	flatten: { label: "Flatten", icon: LuEqual },
	"set-height": { label: "Set height", icon: LuRuler },
	ramp: { label: "Ramp", icon: LuSpline },
	noise: { label: "Noise", icon: LuSparkles },
	terrace: { label: "Terrace", icon: TbStairs },
	holes: { label: "Holes", icon: LuCircleDashed },
	paint: { label: "Paint", icon: LuPaintbrush },
	blend: { label: "Blend", icon: LuBlend },
	replace: { label: "Replace", icon: LuReplace },
};

export interface ITerrainModeProps {
	info: ITerrainInfo;
}

/**
 * "Mode & tool" section: the sculpt and paint modes of the terrain tool, then the tools of the current mode. The mode is stored as the
 * category of the terrain settings. The keys 1, 2, 3... select the tools in the preview.
 */
export function TerrainTools(props: ITerrainModeProps) {
	const [shift, setShift] = useState(false);

	useEventListener("keydown", (ev) => ev.key === "Shift" && setShift(true));
	useEventListener("keyup", (ev) => ev.key === "Shift" && setShift(false));

	const currentMode = terrainSettings.category;
	const paint = currentMode === "paint";

	const currentTools: readonly TerrainInspectorTool[] = paint ? TERRAIN_PAINT_TOOLS : terrainSculptTools;
	const currentTool = (paint ? terrainSettings.paintTool : terrainSettings.sculptTool) as TerrainInspectorTool;

	// The paint tools are shown once the texture painting is enabled for the terrain (Layers section).
	const hasTools = !paint || props.info.material?.isTerrainMaterial;

	// Shift or the "invert" toggle (X) lowers the terrain instead of raising it.
	const inverted = terrainSettings.invertToggle !== shift;

	function handleSelectMode(mode: TerrainCategory) {
		updateTerrainSettings((settings) => (settings.category = mode));
	}

	function handleSelectTool(tool: TerrainTool) {
		updateTerrainSettings((settings) => {
			if (paint) {
				settings.paintTool = tool as TerrainPaintTool;
			} else {
				settings.sculptTool = tool as TerrainSculptTool;
			}
		});
	}

	return (
		<EditorInspectorSectionField title="Mode & tool">
			<ToolbarRadioGroup value={currentMode} onValueChange={(mode) => handleSelectMode(mode as TerrainCategory)} className="flex-wrap justify-center">
				{modes.map((item) => (
					<ToolbarRadioGroupItem key={item.mode} value={item.mode} className={`w-auto gap-2 px-3 ${item.mode === currentMode ? "!bg-indigo-700" : ""}`}>
						<item.icon className="w-4 h-4" />
						{item.label}
					</ToolbarRadioGroupItem>
				))}
			</ToolbarRadioGroup>

			{hasTools && (
				<>
					<Separator className="my-2" />

					<div className="text-center text-lg font-semibold">{tools[currentTool].label}</div>

					<ToolbarRadioGroup value={currentTool} onValueChange={(tool) => handleSelectTool(tool as TerrainTool)} className="flex-wrap justify-center">
						{currentTools.map((tool) => {
							const Icon = tool === "raise" && inverted ? LuArrowDownToLine : tools[tool].icon;

							return (
								<ToolbarRadioGroupItem key={tool} value={tool} aria-label={tools[tool].label} className={tool === currentTool ? "!bg-indigo-700" : ""}>
									<Icon className="w-4 h-4" />
								</ToolbarRadioGroupItem>
							);
						})}
					</ToolbarRadioGroup>
				</>
			)}
		</EditorInspectorSectionField>
	);
}
