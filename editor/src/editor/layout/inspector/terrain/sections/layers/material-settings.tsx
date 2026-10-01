import { useMemo } from "react";

import { LuRefreshCw } from "react-icons/lu";

import { Mesh } from "babylonjs";
import { TerrainMaterialPlugin } from "babylonjs-editor-tools";

import { Editor } from "../../../../../main";

import { Button } from "../../../../../../ui/shadcn/ui/button";

import { setTerrainMaterialSettings } from "../../../../../../tools/terrain/engine/material";

import { EditorInspectorListField } from "../../../fields/list";
import { EditorInspectorNumberField } from "../../../fields/number";
import { EditorInspectorSwitchField } from "../../../fields/switch";

import { formatTerrainLayerTextureOption } from "../../format";

import { TerrainCollapsibleBlock } from "../../components/collapsible-block";

const layerTextureSizes = [256, 512, 1024, 2048];

export interface ITerrainMaterialSettingsProps {
	editor: Editor;
	mesh: Mesh;
	plugin: TerrainMaterialPlugin;
}

/**
 * Settings of the terrain material shared by its layers: the blending of the layers based on their height maps, the size of the
 * textures of the layers and their anisotropy.
 * The settings are stored in the terrain with one undo/redo per change: the fields edit a copy of them, stored when a change is done.
 */
export function TerrainMaterialSettings(props: ITerrainMaterialSettingsProps) {
	const data = props.plugin.data;
	const layerCount = data.layers.length;

	// Created again each time the settings change (stored below, undo, redo...): the fields show the new values.
	const values = useMemo(
		() => ({
			heightBlend: data.heightBlend,
			heightBlendTransition: data.heightBlendTransition,
			layerTextureSize: data.layerTextureSize,
			anisotropy: data.anisotropy,
		}),
		[data.heightBlend, data.heightBlendTransition, data.layerTextureSize, data.anisotropy]
	);

	const sizeItems = useMemo(() => layerTextureSizes.map((size) => ({ text: formatTerrainLayerTextureOption(size, layerCount), value: size })), [layerCount]);

	/**
	 * Does nothing when the values are the ones of the terrain.
	 */
	function handleStore() {
		setTerrainMaterialSettings(props.editor, props.mesh, values);
	}

	return (
		<TerrainCollapsibleBlock id="material-settings" title="Material settings">
			{/* A field dragged with the mouse doesn't tell when the drag ends: the settings are stored when the mouse is released. */}
			<div className="flex flex-col gap-2 w-full" onMouseUp={() => handleStore()}>
				<EditorInspectorSwitchField noUndoRedo object={values} property="heightBlend" label="Height-based blending" onChange={() => handleStore()} />

				{values.heightBlend && (
					<EditorInspectorNumberField
						noUndoRedo
						object={values}
						property="heightBlendTransition"
						label="Transition"
						min={0.01}
						max={1}
						step={0.01}
						onFinishChange={() => handleStore()}
					/>
				)}

				<EditorInspectorListField noUndoRedo object={values} property="layerTextureSize" label="Layer textures" items={sizeItems} onChange={() => handleStore()} />
				<EditorInspectorNumberField noUndoRedo object={values} property="anisotropy" label="Anisotropy" min={1} max={16} step={1} onFinishChange={() => handleStore()} />

				<Button variant="secondary" className="flex items-center gap-2" onClick={() => props.plugin.rebuildLayerTextures()}>
					<LuRefreshCw className="w-4 h-4" /> Rebuild layer textures
				</Button>
			</div>
		</TerrainCollapsibleBlock>
	);
}
