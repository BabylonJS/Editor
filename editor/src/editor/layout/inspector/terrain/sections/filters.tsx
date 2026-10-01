import { useMemo } from "react";

import { ITerrainFilterBand } from "../../../../../tools/terrain/core/types";
import { ITerrainInfo } from "../../../../../tools/terrain/engine/types";

import { EditorInspectorBlockField } from "../../fields/block";
import { EditorInspectorSectionField } from "../../fields/section";

import { terrainSettings } from "../settings";

import { TerrainFieldsRow } from "../components/fields-row";
import { TerrainSettingsListField, TerrainSettingsNumberField, TerrainSettingsSwitchField } from "../components/settings-fields";

interface ITerrainFilterBandProps {
	band: ITerrainFilterBand;
	label: string;
	tooltip: string;
	/** Maximum of the values of the band: 90 for the slope (degrees), none for the height. */
	max?: number;
}

function TerrainFilterBand(props: ITerrainFilterBandProps) {
	const min = props.max !== undefined ? 0 : undefined;

	return (
		<EditorInspectorBlockField>
			<TerrainSettingsSwitchField object={props.band} property="enabled" label={props.label} tooltip={props.tooltip} />

			{props.band.enabled && (
				<>
					<TerrainFieldsRow label="Min / Max">
						<TerrainSettingsNumberField object={props.band} property="min" min={min} max={props.max} step={1} />
						<TerrainSettingsNumberField object={props.band} property="max" min={min} max={props.max} step={1} />
					</TerrainFieldsRow>

					<TerrainSettingsNumberField object={props.band} property="feather" label="Feather" min={0} max={props.max} step={1} />
					<TerrainSettingsSwitchField object={props.band} property="invert" label="Invert" />
				</>
			)}
		</EditorInspectorBlockField>
	);
}

export interface ITerrainFiltersSectionProps {
	info: ITerrainInfo;
}

/**
 * "Filters" section of the sculpt and paint modes: the brush only applies where the height, the slope and the painted layer of the
 * terrain match the enabled filters.
 */
export function TerrainFiltersSection(props: ITerrainFiltersSectionProps) {
	const filters = terrainSettings.filters;
	const layer = filters.layer;

	// The layer filter needs painted layers.
	const hasLayers = props.info.layers.length > 0 && props.info.weightMapsState === "ready";
	const activeCount = [filters.height.enabled, filters.slope.enabled, layer.enabled && hasLayers].filter((enabled) => enabled).length;

	const names = props.info.layers.map((layer) => layer.name).join();
	const items = useMemo(() => props.info.layers.map((layer) => ({ text: layer.name, value: layer.id })), [names]);
	const layerName = props.info.layers.find((item) => item.id === layer.layerId)?.name ?? "the layer";

	return (
		<EditorInspectorSectionField title="Filters" label={`${activeCount} active`}>
			<TerrainFilterBand band={filters.height} label="Height" tooltip="Only where the world height is between Min and Max (cm)." />
			<TerrainFilterBand band={filters.slope} label="Slope" tooltip="Only where the slope is between Min and Max (degrees)." max={90} />

			<EditorInspectorBlockField>
				<TerrainSettingsSwitchField
					object={layer}
					property="enabled"
					label="Layer"
					disabled={!hasLayers}
					tooltip={hasLayers ? "Only where the layer is painted (sculpt and paint tools)." : "Needs painted layers"}
				/>

				{hasLayers && layer.enabled && (
					<>
						<div className="px-2 text-xs text-muted-foreground">
							Only where “{layerName}” {layer.invert ? "<" : ">"} {layer.threshold}
						</div>

						<TerrainSettingsListField object={layer} property="layerId" label="Layer" items={items} />
						<TerrainSettingsNumberField object={layer} property="threshold" label="Threshold" min={0} max={1} step={0.01} />
						<TerrainSettingsSwitchField object={layer} property="invert" label="Invert" />
					</>
				)}
			</EditorInspectorBlockField>
		</EditorInspectorSectionField>
	);
}
