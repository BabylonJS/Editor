import { useMemo } from "react";

import type { Mesh } from "babylonjs";

import type { Editor } from "../../../../main";

import type { ITerrainFilterBand, ITerrainFilterSettings } from "../../../../../tools/terrain/core/types";
import type { ITerrainInfo, ITerrainLayerInfo } from "../../../../../tools/terrain/engine/types";

import { EditorInspectorBlockField } from "../../fields/block";
import { EditorInspectorSectionField } from "../../fields/section";
import type { IEditorInspectorListFieldItem } from "../../fields/list";

import { formatTerrainNumber } from "../format";
import { terrainSettings } from "../settings";
import { TerrainFieldsRow } from "../components/fields-row";

import { getTerrainInfoSafe, TerrainSettingsListField, TerrainSettingsNumberField, TerrainSettingsSwitchField } from "./brush";
import { useTerrainSettingsRevision } from "./tools";

/** Tooltip of the Layer filter when the terrain has no painted layers to test (§1.11). */
export const TERRAIN_LAYER_FILTER_UNAVAILABLE_TOOLTIP = "Needs painted layers";

/**
 * Whether the Layer filter can be used on the terrain (§1.11, §4.13): a terrain material with layers whose weights are loaded.
 * @param info defines the information of the terrain (null: unknown, unavailable).
 */
export function isTerrainLayerFilterAvailable(info: Pick<ITerrainInfo, "material" | "layers" | "weightMapsState"> | null): boolean {
	return !!info?.material?.isTerrainMaterial && info.layers.length > 0 && info.weightMapsState === "ready";
}

/**
 * Number of active filters (section label "{n} active", §1.11): enabled height and slope bands, and the layer filter when it can be used
 * (it is ignored on terrains without painted layers, §4.13).
 * @param filters defines the filter settings.
 * @param layerFilterAvailable defines whether the layer filter can be used on the terrain.
 */
export function countTerrainActiveFilters(filters: ITerrainFilterSettings, layerFilterAvailable: boolean): number {
	let count = 0;

	if (filters.height?.enabled) {
		++count;
	}

	if (filters.slope?.enabled) {
		++count;
	}

	if (filters.layer?.enabled && layerFilterAvailable) {
		++count;
	}

	return count;
}

/**
 * Sentence of the Layer filter (§1.11): "Only where {layer} > {threshold}" ("Only where {layer} < {threshold}" when inverted).
 * @param layerName defines the name of the tested layer (null: none selected).
 * @param threshold defines the threshold (0..1).
 * @param invert defines whether the filter is inverted.
 */
export function formatTerrainLayerFilterText(layerName: string | null, threshold: number, invert: boolean): string {
	return `Only where ${layerName ? `“${layerName}”` : "the layer"} ${invert ? "<" : ">"} ${formatTerrainNumber(threshold, 2)}`;
}

interface ITerrainFilterBandRowProps {
	editor: Editor;
	band: ITerrainFilterBand;
	/** "height" or "slope": key prefix and texts. */
	kind: "height" | "slope";
}

function TerrainFilterBandRow(props: ITerrainFilterBandRowProps): JSX.Element {
	const prefix = `filters.${props.kind}`;
	const isSlope = props.kind === "slope";

	return (
		<EditorInspectorBlockField>
			<TerrainSettingsSwitchField
				editor={props.editor}
				object={props.band}
				property="enabled"
				label={isSlope ? "Slope" : "Height"}
				tooltip={isSlope ? "Only where the slope is between Min and Max (degrees)." : "Only where the world height is between Min and Max (cm)."}
				keys={[`${prefix}.enabled`]}
			/>

			{props.band.enabled && (
				<>
					<TerrainFieldsRow label="Min / Max">
						<TerrainSettingsNumberField
							editor={props.editor}
							object={props.band}
							property="min"
							keys={[`${prefix}.min`]}
							min={isSlope ? 0 : undefined}
							max={isSlope ? 90 : undefined}
							step={1}
						/>
						<TerrainSettingsNumberField
							editor={props.editor}
							object={props.band}
							property="max"
							keys={[`${prefix}.max`]}
							min={isSlope ? 0 : undefined}
							max={isSlope ? 90 : undefined}
							step={1}
						/>
					</TerrainFieldsRow>
					<TerrainSettingsNumberField
						editor={props.editor}
						object={props.band}
						property="feather"
						label="Feather"
						keys={[`${prefix}.feather`]}
						min={0}
						max={isSlope ? 90 : undefined}
						step={1}
					/>
					<TerrainSettingsSwitchField editor={props.editor} object={props.band} property="invert" label="Invert" keys={[`${prefix}.invert`]} />
				</>
			)}
		</EditorInspectorBlockField>
	);
}

interface ITerrainLayerFilterRowProps {
	editor: Editor;
	layers: ITerrainLayerInfo[];
	available: boolean;
}

function TerrainLayerFilterRow(props: ITerrainLayerFilterRowProps): JSX.Element {
	const layer = terrainSettings.filters.layer;

	const layersKey = props.layers.map((l) => `${l.id}:${l.name}`).join("|");
	const items = useMemo<IEditorInspectorListFieldItem[]>(() => props.layers.map((l) => ({ key: l.id, text: l.name || `Layer ${l.index + 1}`, value: l.id })), [layersKey]);

	const layerName = props.layers.find((l) => l.id === layer.layerId)?.name ?? null;

	return (
		<EditorInspectorBlockField>
			<TerrainSettingsSwitchField
				editor={props.editor}
				object={layer}
				property="enabled"
				label="Layer"
				disabled={!props.available}
				tooltip={props.available ? "Only where the layer is painted (sculpt and paint tools)." : TERRAIN_LAYER_FILTER_UNAVAILABLE_TOOLTIP}
				keys={["filters.layer.enabled"]}
			/>

			{props.available && layer.enabled && (
				<>
					<div className="px-2 text-xs text-muted-foreground">{formatTerrainLayerFilterText(layerName, layer.threshold, layer.invert)}</div>
					<TerrainSettingsListField editor={props.editor} object={layer} property="layerId" label="Layer" keys={["filters.layer.layerId"]} items={items} />
					<TerrainSettingsNumberField
						editor={props.editor}
						object={layer}
						property="threshold"
						label="Threshold"
						keys={["filters.layer.threshold"]}
						min={0}
						max={1}
						step={0.01}
					/>
					<TerrainSettingsSwitchField editor={props.editor} object={layer} property="invert" label="Invert" keys={["filters.layer.invert"]} />
				</>
			)}
		</EditorInspectorBlockField>
	);
}

export interface ITerrainFiltersSectionProps {
	/** Editor reference. */
	editor: Editor;
	/** Target terrain of the tab. */
	mesh: Mesh;
	/** Information of the target (layers, weights state); computed with getTerrainMeshInfo when omitted. */
	info?: ITerrainInfo | null;
}

/**
 * "Filters" section (§1.11): collapsed by default (controlled by terrainSettings.view.collapsed.filters), label "{n} active"; Height and Slope
 * bands (min, max, feather, invert) and the Layer filter ("Only where {layer} > {threshold}", disabled with "Needs painted layers" when the
 * terrain has no painted layers). Filters multiply the dab weight of every tool (§4.13).
 */
export function TerrainFiltersSection(props: ITerrainFiltersSectionProps): JSX.Element {
	useTerrainSettingsRevision((change) => change.external || change.keys.some((key) => key.startsWith("filters")));

	const info = props.info === undefined ? getTerrainInfoSafe(props.mesh) : props.info;
	const filters = terrainSettings.filters;
	const available = isTerrainLayerFilterAvailable(info);

	return (
		<EditorInspectorSectionField title="Filters" label={`${countTerrainActiveFilters(filters, available)} active`}>
			<TerrainFilterBandRow editor={props.editor} band={filters.height} kind="height" />
			<TerrainFilterBandRow editor={props.editor} band={filters.slope} kind="slope" />
			<TerrainLayerFilterRow editor={props.editor} layers={info?.layers ?? []} available={available} />
		</EditorInspectorSectionField>
	);
}
