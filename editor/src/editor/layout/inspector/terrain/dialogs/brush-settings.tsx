import { ReactNode, useState } from "react";

import { toast } from "sonner";

import type { Editor } from "../../../../main";

import { getActiveTerrainTool } from "../../../../../tools/terrain/core/settings";
import type { ITerrainToolSettings } from "../../../../../tools/terrain/core/types";
import { TerrainBrushLibrary, type ITerrainLibraryBrush } from "../../../../../tools/terrain/io/brush-library";

import { Button } from "../../../../../ui/shadcn/ui/button";
import { Checkbox } from "../../../../../ui/shadcn/ui/checkbox";
import { Input } from "../../../../../ui/shadcn/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../ui/shadcn/ui/select";
import { Switch } from "../../../../../ui/shadcn/ui/switch";

import { EditorInspectorNumberField } from "../../fields/number";

import { terrainSettings } from "../settings";
import { reportTerrainTabError } from "../drop-actions";

import { showTerrainDialog, type ITerrainDialog } from "./show-dialog";

/** Defaults a brush can carry (§1.9, §6.9). */
export type TerrainBrushDefaultKey = "radius" | "strength" | "hardness" | "rotation" | "spacing" | "stampHeight";

export type TerrainBrushDefaults = NonNullable<ITerrainLibraryBrush["defaults"]>;

export type TerrainBrushChannel = ITerrainLibraryBrush["channel"];

/** Order of the default rows in the dialog. */
export const TERRAIN_BRUSH_DEFAULT_KEYS: readonly TerrainBrushDefaultKey[] = ["radius", "strength", "hardness", "rotation", "spacing", "stampHeight"];

interface ITerrainBrushDefaultField {
	label: string;
	/** Stored value → displayed value (percent fields ×100). */
	scale: number;
	/** Range of the displayed value (undefined: unbounded on that side; the field shows a fill bar only when both are defined). */
	min?: number;
	max?: number;
	step: number;
}

/** Labels and ranges of the defaults, in displayed units (cm, %, °). Same ranges as the Brush section (§1.8). */
export const TERRAIN_BRUSH_DEFAULT_FIELDS: Readonly<Record<TerrainBrushDefaultKey, ITerrainBrushDefaultField>> = {
	radius: { label: "Radius (cm)", scale: 1, min: 0.01, step: 1 },
	strength: { label: "Strength (%)", scale: 100, min: 0, max: 100, step: 1 },
	hardness: { label: "Hardness (%)", scale: 100, min: 0, max: 95, step: 1 },
	rotation: { label: "Rotation (°)", scale: 1, min: -180, max: 180, step: 1 },
	spacing: { label: "Spacing (%)", scale: 100, min: 2, max: 200, step: 1 },
	stampHeight: { label: "Stamp height (cm)", scale: 1, step: 1 },
};

/** Items of the channel list (§1.9: Luminance · Alpha · Red). */
export const TERRAIN_BRUSH_CHANNEL_ITEMS: readonly { value: TerrainBrushChannel; text: string }[] = [
	{ value: "luminance", text: "Luminance" },
	{ value: "alpha", text: "Alpha" },
	{ value: "red", text: "Red" },
];

/** Editable state of the defaults: which defaults are stored and their values in displayed units. */
export interface ITerrainBrushDefaultsDraft {
	enabled: Record<TerrainBrushDefaultKey, boolean>;
	values: Record<TerrainBrushDefaultKey, number>;
}

function roundTerrainDraftValue(value: number): number {
	return Math.round(value * 1000) / 1000;
}

function clampTerrainDraftValue(key: TerrainBrushDefaultKey, value: number): number {
	const field = TERRAIN_BRUSH_DEFAULT_FIELDS[key];
	return Math.min(field.max ?? Number.POSITIVE_INFINITY, Math.max(field.min ?? Number.NEGATIVE_INFINITY, value));
}

/**
 * Defaults taken from the current tool settings ("Use current settings", §1.9): radius, strength of the active tool (the Sculpt tool in the
 * Settings category), hardness, rotation, spacing and the stamp height, in stored units.
 * @param settings defines the tool settings.
 */
export function getTerrainBrushDefaultsFromSettings(settings: ITerrainToolSettings): Required<TerrainBrushDefaults> {
	const tool = getActiveTerrainTool(settings) ?? settings.sculptTool;

	return {
		radius: settings.brush.radius,
		strength: settings.strength[tool] ?? 0,
		hardness: settings.brush.hardness,
		rotation: settings.brush.rotation,
		spacing: settings.brush.spacing,
		stampHeight: settings.sculpt.stamp.heightWorld,
	};
}

/**
 * Draft of the dialog: a default is enabled when the brush stores a finite value for it; values in displayed units, taken from the brush
 * defaults or else from the current settings (so enabling a default starts from a sensible value).
 * @param defaults defines the defaults stored with the brush (null: none).
 * @param settings defines the current tool settings.
 */
export function createTerrainBrushDefaultsDraft(defaults: TerrainBrushDefaults | null, settings: ITerrainToolSettings): ITerrainBrushDefaultsDraft {
	const current = getTerrainBrushDefaultsFromSettings(settings);
	const draft: ITerrainBrushDefaultsDraft = {
		enabled: { radius: false, strength: false, hardness: false, rotation: false, spacing: false, stampHeight: false },
		values: { radius: 0, strength: 0, hardness: 0, rotation: 0, spacing: 0, stampHeight: 0 },
	};

	for (const key of TERRAIN_BRUSH_DEFAULT_KEYS) {
		const stored = defaults?.[key];
		const isStored = typeof stored === "number" && Number.isFinite(stored);
		const value = isStored ? stored : current[key];

		draft.enabled[key] = isStored;
		draft.values[key] = roundTerrainDraftValue(clampTerrainDraftValue(key, (Number.isFinite(value) ? value : 0) * TERRAIN_BRUSH_DEFAULT_FIELDS[key].scale));
	}

	return draft;
}

/**
 * Fills every default of the draft from the current settings and enables them ("Use current settings").
 * @param draft defines the draft to update in place.
 * @param settings defines the current tool settings.
 */
export function applyTerrainSettingsToBrushDefaultsDraft(draft: ITerrainBrushDefaultsDraft, settings: ITerrainToolSettings): void {
	const current = getTerrainBrushDefaultsFromSettings(settings);

	for (const key of TERRAIN_BRUSH_DEFAULT_KEYS) {
		const value = current[key];
		draft.enabled[key] = true;
		draft.values[key] = roundTerrainDraftValue(clampTerrainDraftValue(key, (Number.isFinite(value) ? value : 0) * TERRAIN_BRUSH_DEFAULT_FIELDS[key].scale));
	}
}

/**
 * Defaults to store from the draft (stored units), null when no default is enabled.
 * @param draft defines the draft of the dialog.
 */
export function getTerrainBrushDefaultsFromDraft(draft: ITerrainBrushDefaultsDraft): TerrainBrushDefaults | null {
	const defaults: TerrainBrushDefaults = {};
	let count = 0;

	for (const key of TERRAIN_BRUSH_DEFAULT_KEYS) {
		const value = draft.values[key];
		if (!draft.enabled[key] || !Number.isFinite(value)) {
			continue;
		}

		defaults[key] = clampTerrainDraftValue(key, value) / TERRAIN_BRUSH_DEFAULT_FIELDS[key].scale;
		++count;
	}

	return count > 0 ? defaults : null;
}

/**
 * Patch of TerrainBrushLibrary.update for the dialog: built-ins only store their defaults (library.json `builtinDefaults`, §6.9); image
 * brushes also store the name (trimmed; the old name when empty), the channel and the invert flag.
 * @param brush defines the edited brush.
 * @param values defines the values of the dialog.
 */
export function createTerrainBrushSettingsPatch(
	brush: Pick<ITerrainLibraryBrush, "builtin" | "name">,
	values: { name: string; channel: TerrainBrushChannel; invert: boolean; draft: ITerrainBrushDefaultsDraft }
): Partial<Pick<ITerrainLibraryBrush, "name" | "channel" | "invert" | "defaults">> {
	const defaults = getTerrainBrushDefaultsFromDraft(values.draft);

	if (brush.builtin) {
		return { defaults };
	}

	return {
		name: values.name.trim() || brush.name,
		channel: values.channel,
		invert: values.invert,
		defaults,
	};
}

export interface ITerrainBrushSettingsDialogProps {
	/** Brush edited: built-ins only edit their defaults (§1.9). */
	brush: ITerrainLibraryBrush;
	/** Editor reference (error reports). */
	editor?: Editor | null;
	/** Closes the dialog (the idempotent close() returned by showTerrainDialog: Escape may have closed it during a save). */
	onClose: () => void;
	/** Called after the brush was updated (e.g. to refresh the brush shape of the viewport). */
	onSaved?: () => void;
}

/**
 * Content of the "Brush settings" dialog (§1.9, §1.13): name, channel (Luminance · Alpha · Red) and invert of image brushes, and the defaults
 * applied when the brush is selected with "Apply brush defaults" on (radius, strength, hardness, rotation, spacing, stamp height), with
 * "Use current settings". Built-ins only edit their defaults. Saved with TerrainBrushLibrary.update.
 */
export function TerrainBrushSettingsDialog(props: ITerrainBrushSettingsDialogProps): JSX.Element {
	const brush = props.brush;

	const [name, setName] = useState(brush.name);
	const [channel, setChannel] = useState<TerrainBrushChannel>(brush.channel);
	const [invert, setInvert] = useState(brush.invert);
	const [draft] = useState<ITerrainBrushDefaultsDraft>(() => createTerrainBrushDefaultsDraft(brush.defaults, terrainSettings));
	const [fieldsRevision, setFieldsRevision] = useState(0);
	const [, setRenderRevision] = useState(0);
	const [saving, setSaving] = useState(false);

	function handleToggleDefault(key: TerrainBrushDefaultKey, enabled: boolean): void {
		try {
			draft.enabled[key] = enabled;
			setRenderRevision((value) => value + 1);
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	function handleDefaultChanged(key: TerrainBrushDefaultKey): void {
		try {
			if (!draft.enabled[key]) {
				draft.enabled[key] = true;
				setRenderRevision((value) => value + 1);
			}
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	function handleUseCurrentSettings(): void {
		try {
			applyTerrainSettingsToBrushDefaultsDraft(draft, terrainSettings);
			setFieldsRevision((value) => value + 1);
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	async function handleSave(): Promise<void> {
		if (saving) {
			return;
		}

		setSaving(true);

		try {
			const patch = createTerrainBrushSettingsPatch(brush, { name, channel, invert, draft });
			await TerrainBrushLibrary.Get().update(brush.id, patch);
		} catch (e) {
			setSaving(false);
			reportTerrainTabError(props.editor, e);
			return;
		}

		try {
			props.onSaved?.();
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}

		closeDialog();
	}

	function closeDialog(): void {
		try {
			props.onClose();
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	let imageSettings: ReactNode = null;
	if (!brush.builtin) {
		imageSettings = (
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<div className="w-1/3 shrink-0">Name</div>
					<Input value={name} onChange={(ev) => setName(ev.currentTarget.value)} placeholder={brush.name} className="flex-1 min-w-0" />
				</div>

				<div className="flex items-center gap-2">
					<div className="w-1/3 shrink-0">Channel</div>
					<Select value={channel} onValueChange={(value) => setChannel(value as TerrainBrushChannel)}>
						<SelectTrigger className="flex-1 min-w-0">
							<SelectValue>{TERRAIN_BRUSH_CHANNEL_ITEMS.find((item) => item.value === channel)?.text ?? channel}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{TERRAIN_BRUSH_CHANNEL_ITEMS.map((item) => (
								<SelectItem key={item.value} value={item.value}>
									{item.text}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<label className="flex items-center justify-between gap-2 cursor-pointer">
					<span>Invert</span>
					<Switch checked={invert} onCheckedChange={(checked) => setInvert(checked)} />
				</label>

				{brush.path && <div className="text-xs text-muted-foreground break-all">{brush.path}</div>}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 w-[380px] max-w-[85vw] pt-4 text-foreground text-sm">
			{imageSettings}

			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<div className="font-semibold">Defaults</div>
					<Button variant="secondary" size="sm" onClick={() => handleUseCurrentSettings()}>
						Use current settings
					</Button>
				</div>

				<div className="text-xs text-muted-foreground">Applied when the brush is selected and “Apply brush defaults” is on (Brush section, Pen & image).</div>

				{TERRAIN_BRUSH_DEFAULT_KEYS.map((key) => {
					const field = TERRAIN_BRUSH_DEFAULT_FIELDS[key];

					return (
						<div key={key} className="flex items-center gap-1">
							<Checkbox
								checked={draft.enabled[key]}
								onCheckedChange={(checked) => handleToggleDefault(key, checked === true)}
								aria-label={`Store the ${field.label}`}
							/>
							<div className={`flex-1 min-w-0 ${draft.enabled[key] ? "" : "opacity-50"} transition-opacity duration-300`}>
								<EditorInspectorNumberField
									key={`${key}-${fieldsRevision}`}
									noUndoRedo
									object={draft.values}
									property={key}
									label={field.label}
									min={field.min}
									max={field.max}
									step={field.step}
									onChange={() => handleDefaultChanged(key)}
								/>
							</div>
						</div>
					);
				})}
			</div>

			<div className="flex justify-end gap-2">
				<Button variant="secondary" className="min-w-24" onClick={() => closeDialog()}>
					Cancel
				</Button>
				<Button className="min-w-24" disabled={saving} onClick={() => void handleSave()}>
					Save
				</Button>
			</div>
		</div>
	);
}

export interface IShowTerrainBrushSettingsDialogOptions {
	/** Editor reference (error reports). */
	editor?: Editor | null;
	/** Called after the brush was updated. */
	onSaved?: () => void;
}

/**
 * Opens the modal "Brush settings" dialog of a brush (§1.13: showTerrainDialog(title, <Comp/>, true), closed through the returned idempotent
 * close()).
 * Shows an error toast when the brush is not in the library anymore.
 * @param brushId defines the id of the brush ("builtin:<name>" or "b-xxxxxxxx").
 * @param options defines the editor reference and the saved callback.
 */
export function showTerrainBrushSettingsDialog(brushId: string, options?: IShowTerrainBrushSettingsDialogOptions): ITerrainDialog | null {
	let brush: ITerrainLibraryBrush | null = null;
	try {
		brush = TerrainBrushLibrary.Get().getBrush(brushId);
	} catch (e) {
		reportTerrainTabError(options?.editor, e);
		return null;
	}

	if (!brush) {
		toast.error("This brush is not in the library anymore.");
		return null;
	}

	const holder: { dialog: ITerrainDialog | null } = { dialog: null };

	const title = (
		<div>
			Brush settings
			<br />
			<b className="text-muted-foreground font-semibold tracking-tighter">{brush.name}</b>
		</div>
	);

	holder.dialog = showTerrainDialog(
		title,
		<TerrainBrushSettingsDialog brush={brush} editor={options?.editor} onSaved={options?.onSaved} onClose={() => holder.dialog?.close()} />,
		true
	);

	return holder.dialog;
}
