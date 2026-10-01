import { useMemo } from "react";

import { Color3, Mesh } from "babylonjs";
import { ITerrainLayerData } from "babylonjs-editor-tools";

import { getTerrainPlugin } from "../../../../../../tools/terrain/engine/info";
import { createTerrainLayerProxy, updateTerrainMaterialLayer } from "../../../../../../tools/terrain/engine/layers";

import { EditorInspectorColorField } from "../../../fields/color";
import { EditorInspectorNumberField } from "../../../fields/number";
import { EditorInspectorStringField } from "../../../fields/string";

import { useTerrainRevision } from "../../hooks";

import { TerrainFieldsRow } from "../../components/fields-row";

/**
 * Returns the tint of the given layer as a color for the color field: its changes are written in the layer while the color is edited.
 */
function createLayerTint(mesh: Mesh, layerId: string) {
	function getTint() {
		return getTerrainPlugin(mesh)?.data.layers.find((layer) => layer.id === layerId)?.tint ?? [1, 1, 1];
	}

	function setTint(r: number, g: number, b: number) {
		const tint = getTint();
		if (r !== tint[0] || g !== tint[1] || b !== tint[2]) {
			updateTerrainMaterialLayer(mesh, layerId, { tint: [r, g, b] });
		}
	}

	return {
		get r() {
			return getTint()[0];
		},
		set r(value: number) {
			setTint(value, getTint()[1], getTint()[2]);
		},
		get g() {
			return getTint()[1];
		},
		set g(value: number) {
			setTint(getTint()[0], value, getTint()[2]);
		},
		get b() {
			return getTint()[2];
		},
		set b(value: number) {
			setTint(getTint()[0], getTint()[1], value);
		},

		set: setTint,
		clone: () => new Color3(...getTint()),
		toHexString: () => new Color3(...getTint()).toHexString(),
	};
}

export interface ITerrainLayerDetailsProps {
	mesh: Mesh;
	layer: ITerrainLayerData;
	/**
	 * Called each time a field changes the layer: the fields write their value in the layer while they are edited.
	 */
	onChange: () => void;
}

/**
 * Fields of the active layer, in the "Layer options" section: its name, its tint, the size of its tiles and its PBR values. Its textures
 * are in the "Layer textures" section. Like the other inspectors, the fields write in the edited object (a proxy of the layer) and
 * register their own undo/redo.
 */
export function TerrainLayerDetails(props: ITerrainLayerDetailsProps) {
	const { mesh, layer } = props;

	const revision = useTerrainRevision();

	// Created again each time the layer changes outside of the fields (undo, redo, dropped textures...): the fields show the new values.
	const proxy = useMemo(() => createTerrainLayerProxy(mesh, layer.id), [mesh, layer.id, revision]);
	const tint = useMemo(() => ({ color: createLayerTint(mesh, layer.id) }), [mesh, layer.id]);

	return (
		<>
			<EditorInspectorStringField object={proxy} property="name" label="Name" onChange={() => props.onChange()} />

			<EditorInspectorColorField key={revision} object={tint} property="color" label="Tint" onChange={() => props.onChange()} />

			<TerrainFieldsRow label="Tile size (cm)">
				<EditorInspectorNumberField object={proxy} property="tileSizeX" min={1} max={100000} step={1} />
				<EditorInspectorNumberField object={proxy} property="tileSizeZ" min={1} max={100000} step={1} />
			</TerrainFieldsRow>

			<TerrainFieldsRow label="Tile offset (cm)">
				<EditorInspectorNumberField object={proxy} property="tileOffsetX" step={1} />
				<EditorInspectorNumberField object={proxy} property="tileOffsetZ" step={1} />
			</TerrainFieldsRow>

			<EditorInspectorNumberField object={proxy} property="roughness" label="Roughness" min={0} max={1} step={0.01} />
			<EditorInspectorNumberField object={proxy} property="metallic" label="Metallic" min={0} max={1} step={0.01} />
			<EditorInspectorNumberField object={proxy} property="normalStrength" label="Normal strength" min={0} max={2} step={0.01} />
			<EditorInspectorNumberField object={proxy} property="aoStrength" label="AO strength" min={0} max={1} step={0.01} />
			<EditorInspectorNumberField object={proxy} property="heightScale" label="Height scale" min={0} max={2} step={0.01} />
			<EditorInspectorNumberField object={proxy} property="heightOffset" label="Height offset" min={-1} max={1} step={0.01} />
		</>
	);
}
