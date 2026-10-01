import { LuDices } from "react-icons/lu";

import { Button } from "../../../../../ui/shadcn/ui/button";

import { EditorInspectorSectionField } from "../../fields/section";
import { IEditorInspectorListFieldItem } from "../../fields/list";

import { terrainSettings, updateTerrainSettings } from "../settings";

import { TerrainSettingsListField, TerrainSettingsNumberField } from "../components/settings-fields";

import { TerrainHeightClamp } from "./height-clamp";

const typeItems: IEditorInspectorListFieldItem[] = [
	{ text: "fBm", value: "fbm" },
	{ text: "Ridged", value: "ridged" },
	{ text: "Billow", value: "billow" },
];

const modeItems: IEditorInspectorListFieldItem[] = [
	{ text: "Bipolar", value: "bipolar" },
	{ text: "Raise only", value: "raise" },
];

/**
 * Noise tool: adds procedural noise to the heights under the brush (subtracts it with Shift).
 */
export function TerrainNoiseTool() {
	const noise = terrainSettings.sculpt.noise;

	return (
		<EditorInspectorSectionField title="Noise options">
			<TerrainSettingsListField object={noise} property="type" label="Type" items={typeItems} />
			<TerrainSettingsNumberField object={noise} property="scale" label="Scale" min={1} step={1} />
			<TerrainSettingsNumberField object={noise} property="amplitude" label="Amplitude" min={0} step={1} />
			<TerrainSettingsNumberField object={noise} property="octaves" label="Octaves" integer min={1} max={8} />
			<TerrainSettingsNumberField object={noise} property="persistence" label="Persistence" min={0} max={1} step={0.01} />
			<TerrainSettingsNumberField object={noise} property="lacunarity" label="Lacunarity" min={1} max={4} step={0.01} />

			<div className="flex items-center gap-1 w-full">
				<div className="flex-1 min-w-0">
					<TerrainSettingsNumberField object={noise} property="seed" label="Seed" integer />
				</div>

				<Button
					variant="ghost"
					size="icon"
					className="w-8 h-8 shrink-0"
					title="Random seed"
					onClick={() => updateTerrainSettings(() => (noise.seed = Math.floor(Math.random() * 2147483647)))}
				>
					<LuDices className="w-4 h-4" />
				</Button>
			</div>

			<TerrainSettingsListField object={noise} property="mode" label="Mode" items={modeItems} />

			<TerrainHeightClamp />
		</EditorInspectorSectionField>
	);
}
