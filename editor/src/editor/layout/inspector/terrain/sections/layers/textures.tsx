import { ReactNode, useMemo } from "react";

import { Mesh, Texture } from "babylonjs";
import { ITerrainLayerData } from "babylonjs-editor-tools";

import { Editor } from "../../../../../main";

import { getTerrainPlugin } from "../../../../../../tools/terrain/engine/info";
import { createTerrainLayerProxy, updateTerrainMaterialLayer } from "../../../../../../tools/terrain/engine/layers";
import { ITerrainInfo } from "../../../../../../tools/terrain/engine/types";
import { isTerrainBusy } from "../../../../../../tools/terrain/engine/yield";
import { resolveRenamedAssetPath, toTerrainAbsolutePath } from "../../../../../../tools/terrain/io/paths";

import { EditorInspectorSwitchField } from "../../../fields/switch";
import { EditorInspectorSectionField } from "../../../fields/section";
import { EditorInspectorTextureField } from "../../../fields/texture";
import { EditorInspectorListField, IEditorInspectorListFieldItem } from "../../../fields/list";

import { useTerrainRevision } from "../../hooks";
import { getActiveTerrainLayerId } from "../../settings";
import { dropTerrainFiles, TerrainMapSlotKind } from "../../drop";

const normalConventionItems: IEditorInspectorListFieldItem[] = [
	{ text: "OpenGL", value: "opengl" },
	{ text: "DirectX", value: "directx" },
];

const channelItems: IEditorInspectorListFieldItem[] = [
	{ text: "R", value: "r" },
	{ text: "G", value: "g" },
	{ text: "B", value: "b" },
	{ text: "A", value: "a" },
	{ text: "Luminance", value: "luminance" },
];

/** Key of the path of each texture in the data of a layer. */
const textureKeys = {
	albedo: "albedo",
	normal: "normal",
	roughness: "roughnessMap",
	ao: "aoMap",
	height: "heightMap",
} as const;

/**
 * Returns the textures of the given layer for the texture fields. A layer stores the paths of its textures, which are loaded by the terrain
 * material: the texture read by a field only holds the path of its file, and only the path of the texture set by a field is used.
 */
function createLayerTextures(editor: Editor, mesh: Mesh, layerId: string) {
	const textures = {} as Record<TerrainMapSlotKind, Texture | null>;

	for (const slot of Object.keys(textureKeys) as TerrainMapSlotKind[]) {
		let texture: Texture | null = null;

		Object.defineProperty(textures, slot, {
			get: () => {
				const path = getTerrainPlugin(mesh)?.data.layers.find((layer) => layer.id === layerId)?.[textureKeys[slot]];
				if (!path) {
					return null;
				}

				// The assets renamed since the last save are found with their new path.
				const url = resolveRenamedAssetPath(path);
				if (texture?.url !== url) {
					texture = new Texture(null, mesh.getEngine());
					texture.name = texture.url = url;
				}

				return texture;
			},
			set: (value: Texture | null) => {
				if (value) {
					// Like an image dropped on the layer: the name of its file gives the channel that holds the map.
					dropTerrainFiles(editor, mesh, { zone: "map-slot", layerId, slot }, [toTerrainAbsolutePath(value.name)]);

					// The texture created by the field is not used.
					value.onLoadObservable.addOnce(() => value.dispose());
				} else {
					updateTerrainMaterialLayer(mesh, layerId, { [textureKeys[slot]]: null }, { undo: true });
				}
			},
		});
	}

	return textures;
}

export interface ITerrainLayerTexturesSectionProps {
	editor: Editor;
	mesh: Mesh;
	info: ITerrainInfo;
}

/**
 * "Layer textures" section of the paint mode: the textures of the active layer of the "Layers" section, with the channel that holds each
 * map. Drop a texture of the assets browser on a texture field to set the texture. The section is shown once the terrain has layers.
 */
export function TerrainLayerTexturesSection(props: ITerrainLayerTexturesSectionProps) {
	const { editor, mesh, info } = props;

	const layer = getTerrainPlugin(mesh)?.data.layers.find((layer) => layer.id === getActiveTerrainLayerId(mesh.material));
	if (!layer) {
		return null;
	}

	return (
		<EditorInspectorSectionField title="Layer textures">
			<div className={`flex flex-col gap-2 w-full ${isTerrainBusy() || info.readOnly ? "pointer-events-none opacity-50" : ""}`}>
				<TerrainLayerTextures key={layer.id} editor={editor} mesh={mesh} layer={layer} />
			</div>
		</EditorInspectorSectionField>
	);
}

interface ITerrainLayerTexturesProps {
	editor: Editor;
	mesh: Mesh;
	layer: ITerrainLayerData;
}

/**
 * Texture fields of the given layer. Like the other fields of a layer, the lists and the switch write in a proxy of the layer and register
 * their own undo/redo.
 */
function TerrainLayerTextures(props: ITerrainLayerTexturesProps) {
	const { editor, mesh, layer } = props;

	const revision = useTerrainRevision();

	// Created again each time the layer changes outside of the fields (undo, redo, dropped textures...): the fields show the new values.
	const proxy = useMemo(() => createTerrainLayerProxy(mesh, layer.id), [mesh, layer.id, revision]);
	const textures = useMemo(() => createLayerTextures(editor, mesh, layer.id), [editor, mesh, layer.id]);

	// The field is created again when the texture changes (drop, clear, undo, redo...) to show its new preview. Its children are shown
	// once the texture is set.
	function getTextureField(slot: TerrainMapSlotKind, title: string, children?: ReactNode) {
		return (
			<EditorInspectorTextureField
				key={`${slot}-${layer[textureKeys[slot]]}`}
				noUndoRedo
				hideLevel
				hideSize
				hideInvert
				noPopover
				object={textures}
				property={slot}
				title={title}
				scene={mesh.getScene()}
			>
				{children}
			</EditorInspectorTextureField>
		);
	}

	return (
		<>
			{getTextureField("albedo", "Albedo")}

			{getTextureField("normal", "Normal", <EditorInspectorListField object={proxy} property="normalConvention" label="Convention" items={normalConventionItems} />)}

			{getTextureField(
				"roughness",
				"Roughness",
				<>
					<EditorInspectorListField object={proxy} property="roughnessChannel" label="Channel" items={channelItems} />
					<EditorInspectorSwitchField object={proxy} property="roughnessInvert" label="Glossiness map (invert)" />
				</>
			)}

			{getTextureField("ao", "Ambient occlusion", <EditorInspectorListField object={proxy} property="aoChannel" label="Channel" items={channelItems} />)}

			{getTextureField("height", "Height", <EditorInspectorListField object={proxy} property="heightChannel" label="Channel" items={channelItems} />)}
		</>
	);
}
