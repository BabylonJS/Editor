import { LuScale } from "react-icons/lu";

import { Mesh } from "babylonjs";

import { Editor } from "../../../../../main";

import { Button } from "../../../../../../ui/shadcn/ui/button";

import { getTerrainPlugin } from "../../../../../../tools/terrain/engine/info";
import { ITerrainInfo } from "../../../../../../tools/terrain/engine/types";
import { isTerrainBusy } from "../../../../../../tools/terrain/engine/yield";

import { EditorInspectorSectionField } from "../../../fields/section";

import { runTerrainOperation } from "../../operation";
import { getActiveTerrainLayerId } from "../../settings";

import { TerrainLayerDetails } from "./details";
import { TerrainMaterialSettings } from "./material-settings";

export interface ITerrainLayerOptionsSectionProps {
	editor: Editor;
	mesh: Mesh;
	info: ITerrainInfo;
	/**
	 * Called each time a field changes the name or the tint of the active layer, which are shown in the "Layers" section: the fields write
	 * their value in the layer while they are edited.
	 */
	onChange: () => void;
}

/**
 * "Layer options" section of the paint mode: the fields of the active layer of the "Layers" section, then what applies to every layer:
 * the settings of the terrain material and the normalization of the weights. The section is shown once the texture painting is enabled
 * for the terrain.
 */
export function TerrainLayerOptionsSection(props: ITerrainLayerOptionsSectionProps) {
	const { editor, mesh, info } = props;

	const plugin = getTerrainPlugin(mesh);
	if (!plugin) {
		return null;
	}

	const activeLayer = plugin.data.layers.find((layer) => layer.id === getActiveTerrainLayerId(mesh.material));

	const disabled = isTerrainBusy() || info.readOnly;

	return (
		<EditorInspectorSectionField title="Layer options">
			<div className={`flex flex-col gap-2 w-full ${disabled ? "pointer-events-none opacity-50" : ""}`}>
				{activeLayer && (
					<>
						<TerrainLayerDetails key={activeLayer.id} mesh={mesh} layer={activeLayer} onChange={() => props.onChange()} />
					</>
				)}

				<TerrainMaterialSettings editor={editor} mesh={mesh} plugin={plugin} />

				<Button variant="secondary" className="flex items-center gap-2" onClick={() => runTerrainOperation(editor, mesh, { type: "normalize-weights" })}>
					<LuScale className="w-4 h-4" /> Normalize weights
				</Button>
			</div>
		</EditorInspectorSectionField>
	);
}
