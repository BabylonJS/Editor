import { ReactNode, useMemo } from "react";

import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSwitchField } from "../../fields/switch";
import { EditorInspectorListField, IEditorInspectorListFieldItem } from "../../fields/list";

import { getTerrainSettingsExternalRevision, notifyTerrainSettingsChanged } from "../settings";

export interface ITerrainSettingsFieldProps {
	/** Object of the terrain settings that holds the value (e.g. terrainSettings.brush). */
	object: any;
	property: string;

	label?: ReactNode;
	tooltip?: ReactNode;
}

export interface ITerrainSettingsNumberFieldProps extends ITerrainSettingsFieldProps {
	min?: number;
	max?: number;
	step?: number;

	/** Rounds the value. */
	integer?: boolean;
	/** The value is a 0..1 fraction shown as a percentage. */
	percent?: boolean;

	onChange?: () => void;
}

/**
 * Number field bound to the terrain settings. Like the other settings fields it is keyed by the external revision of the settings, so it
 * shows the new value when the settings change elsewhere (shortcuts, reset...), and it notifies its own changes.
 */
export function TerrainSettingsNumberField(props: ITerrainSettingsNumberFieldProps) {
	const percent = useMemo(
		() => ({
			get value() {
				return Math.round(props.object[props.property] * 100000) / 1000;
			},
			set value(value: number) {
				props.object[props.property] = value / 100;
			},
		}),
		[props.object, props.property]
	);

	return (
		<EditorInspectorNumberField
			key={getTerrainSettingsExternalRevision()}
			noUndoRedo
			object={props.percent ? percent : props.object}
			property={props.percent ? "value" : props.property}
			label={props.label}
			tooltip={props.tooltip}
			min={props.min}
			max={props.max}
			step={props.step ?? (props.integer ? 1 : undefined)}
			onChange={() => {
				if (props.integer) {
					props.object[props.property] = Math.round(props.object[props.property]);
				}

				notifyTerrainSettingsChanged();
				props.onChange?.();
			}}
		/>
	);
}

export interface ITerrainSettingsSwitchFieldProps extends ITerrainSettingsFieldProps {
	disabled?: boolean;
	onChange?: () => void;
}

export function TerrainSettingsSwitchField(props: ITerrainSettingsSwitchFieldProps) {
	return (
		<EditorInspectorSwitchField
			key={getTerrainSettingsExternalRevision()}
			noUndoRedo
			object={props.object}
			property={props.property}
			label={props.label}
			tooltip={props.tooltip}
			disabled={props.disabled}
			onChange={() => {
				notifyTerrainSettingsChanged();
				props.onChange?.();
			}}
		/>
	);
}

export interface ITerrainSettingsListFieldProps extends ITerrainSettingsFieldProps {
	items: IEditorInspectorListFieldItem[];
	onChange?: () => void;
}

export function TerrainSettingsListField(props: ITerrainSettingsListFieldProps) {
	return (
		<EditorInspectorListField
			key={getTerrainSettingsExternalRevision()}
			noUndoRedo
			object={props.object}
			property={props.property}
			label={props.label}
			items={props.items}
			onChange={() => {
				notifyTerrainSettingsChanged();
				props.onChange?.();
			}}
		/>
	);
}
