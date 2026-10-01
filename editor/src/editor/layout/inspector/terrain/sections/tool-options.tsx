import { ReactNode, useMemo } from "react";

import { toast } from "sonner";

import { LuDices, LuPipette } from "react-icons/lu";

import type { Mesh } from "babylonjs";

import type { Editor } from "../../../../main";

import { getActiveTerrainTool } from "../../../../../tools/terrain/core/settings";
import type { ITerrainToolSettings, TerrainPaintTool, TerrainSculptTool, TerrainTool } from "../../../../../tools/terrain/core/types";
import type { ITerrainInfo } from "../../../../../tools/terrain/engine/types";

import { Button } from "../../../../../ui/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../../ui/shadcn/ui/tooltip";

import { EditorInspectorBlockField } from "../../fields/block";
import { EditorInspectorSectionField } from "../../fields/section";
import type { IEditorInspectorListFieldItem } from "../../fields/list";

import { formatTerrainNumber } from "../format";
import { reportTerrainTabError } from "../drop-actions";
import { terrainSettings, updateTerrainSettings } from "../settings";
import type { TerrainViewportController } from "../viewport/controller";
import { getTerrainShortcutLabel } from "../viewport/shortcuts";
import { TerrainFieldsRow } from "../components/fields-row";
import { TerrainCollapsibleBlock } from "../components/collapsible-block";

import { getTerrainInfoSafe, getTerrainMeshMetric, getTerrainWorldCellSize, TerrainSettingsListField, TerrainSettingsNumberField, TerrainSettingsSwitchField } from "./brush";
import { getTerrainToolHint, isTerrainPaintToolId, TERRAIN_TOOL_NAMES, useTerrainSettingsRevision } from "./tools";

/** Items of the Mode lists of Flatten, Set height and Ramp (§1.7). */
export const TERRAIN_BAND_MODE_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "Both", value: "both" },
	{ text: "Raise only", value: "raise" },
	{ text: "Lower only", value: "lower" },
];

/** Items of the Flatten target (§1.7). */
export const TERRAIN_FLATTEN_TARGET_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "Stroke start", value: "stroke-start" },
	{ text: "Fixed height", value: "fixed" },
	{ text: "Slope plane", value: "slope" },
];

/** Items of the Ramp end heights (§1.7). */
export const TERRAIN_RAMP_END_HEIGHTS_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "From terrain", value: "terrain" },
	{ text: "Custom", value: "custom" },
];

/** Items of the Noise type (§1.7). */
export const TERRAIN_NOISE_TYPE_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "fBm", value: "fbm" },
	{ text: "Ridged", value: "ridged" },
	{ text: "Billow", value: "billow" },
];

/** Items of the Noise mode (§1.7). */
export const TERRAIN_NOISE_MODE_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "Bipolar", value: "bipolar" },
	{ text: "Raise only", value: "raise" },
];

/** Items of the Erode type (§1.7). */
export const TERRAIN_ERODE_TYPE_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "Thermal", value: "thermal" },
	{ text: "Hydraulic", value: "hydraulic" },
];

/** Items of the Stamp blend (§1.7). */
export const TERRAIN_STAMP_BLEND_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "Add", value: "add" },
	{ text: "Max", value: "max" },
	{ text: "Min", value: "min" },
	{ text: "Replace", value: "replace" },
];

/** Largest kernel of the Smooth list (§1.7: Auto, 1…16 cells). */
export const TERRAIN_SMOOTH_KERNEL_MAX = 16;

/** Text of the options of the Auto-paint tool (it has no option of its own). */
export const TERRAIN_AUTO_PAINT_OPTIONS_TEXT = "Moves the weights towards the result of the auto-paint rules of the layers (Layers section, “Auto-paint rule” of each layer).";

/** §1.17 refused.no-material: paint options without terrain material. */
const TERRAIN_NO_MATERIAL_TEXT = "Enable texture painting in the Layers section first.";

/**
 * Kernel used by the Smooth tool in "Auto" (§1.7): clamp(round(radiusCells × 0.25), 1, 8), radiusCells = radius / world cell size.
 * @param radius defines the brush radius (world cm).
 * @param cell defines the smallest world cell size of the terrain (cm).
 */
export function getTerrainAutoSmoothKernel(radius: number, cell: number): number {
	if (!Number.isFinite(radius) || !Number.isFinite(cell) || cell <= 0) {
		return 1;
	}

	return Math.min(8, Math.max(1, Math.round((radius / cell) * 0.25)));
}

/**
 * Items of the Smooth kernel list (§1.7): "Auto" (with the kernel it resolves to when known) then 1…16 cells.
 * @param autoKernel defines the kernel of "Auto" for the current radius and terrain (null when unknown).
 */
export function getTerrainSmoothKernelItems(autoKernel: number | null): IEditorInspectorListFieldItem[] {
	const items: IEditorInspectorListFieldItem[] = [{ key: "auto", text: autoKernel === null ? "Auto" : `Auto (${autoKernel} cell${autoKernel === 1 ? "" : "s"})`, value: 0 }];

	for (let cells = 1; cells <= TERRAIN_SMOOTH_KERNEL_MAX; ++cells) {
		items.push({ key: cells, text: `${cells} cell${cells === 1 ? "" : "s"}`, value: cells });
	}

	return items;
}

/**
 * Label of the Raise options (§1.7): "≈ {0.25 × strength × radius} cm per pass".
 * @param settings defines the tool settings.
 */
export function getTerrainRaiseRateLabel(settings: ITerrainToolSettings): string {
	const strength = settings.strength?.raise ?? 0;
	const radius = settings.brush?.radius ?? 0;

	return `≈ ${formatTerrainNumber(0.25 * strength * radius, 1)} cm per pass`;
}

/**
 * Title of the section (§1.7): "{Tool} options".
 * @param tool defines the tool.
 */
export function getTerrainToolOptionsTitle(tool: TerrainTool): string {
	return `${TERRAIN_TOOL_NAMES[tool] ?? tool} options`;
}

/**
 * Writes the height under the cursor of the viewport into a height option (pipette button, §1.7), as an external settings change so the
 * height field remounts with the picked value. Returns false (with an info toast) when the cursor is not over the target terrain.
 * @param controller defines the viewport controller.
 * @param target defines the option object holding `heightWorld`.
 * @param keys defines the notified keys.
 */
export function pickTerrainHeightInto(controller: TerrainViewportController | null, target: { heightWorld: number }, keys: string[]): boolean {
	const height = controller?.pickHeightUnderCursor() ?? null;
	if (height === null || !Number.isFinite(height)) {
		toast.info(`Hover the terrain in the viewport first: the pipette picks the height under the cursor (or press ${getTerrainShortcutLabel("KeyI")} there).`);
		return false;
	}

	updateTerrainSettings(() => {
		target.heightWorld = Math.round(height * 10) / 10;
	}, keys);

	return true;
}

interface ITerrainToolOptionsContext {
	editor: Editor;
	mesh: Mesh;
	controller: TerrainViewportController | null;
	info: ITerrainInfo | null;
}

interface ITerrainHeightPickFieldProps extends ITerrainToolOptionsContext {
	target: { heightWorld: number };
	label: string;
	keys: string[];
}

function TerrainHeightPickField(props: ITerrainHeightPickFieldProps): JSX.Element {
	function handlePick(): void {
		try {
			pickTerrainHeightInto(props.controller, props.target, props.keys);
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	return (
		<div className="flex items-center gap-1 w-full">
			<div className="flex-1 min-w-0">
				<TerrainSettingsNumberField editor={props.editor} object={props.target} property="heightWorld" label={props.label} keys={props.keys} step={1} />
			</div>

			<TooltipProvider delayDuration={300}>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="w-8 h-8 shrink-0"
							disabled={!props.controller}
							onClick={() => handlePick()}
							aria-label="Pick height from terrain"
						>
							<LuPipette className="w-4 h-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>{`Pick height from terrain (${getTerrainShortcutLabel("KeyI")})`}</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	);
}

function TerrainSmoothOptions(props: ITerrainToolOptionsContext): JSX.Element {
	const cell = getTerrainWorldCellSize(props.info, getTerrainMeshMetric(props.mesh));
	const autoKernel = cell === null ? null : getTerrainAutoSmoothKernel(terrainSettings.brush.radius, cell);
	const items = useMemo(() => getTerrainSmoothKernelItems(autoKernel), [autoKernel]);

	return <TerrainSettingsListField editor={props.editor} object={terrainSettings.sculpt} property="smoothKernel" label="Kernel" keys={["sculpt.smoothKernel"]} items={items} />;
}

function TerrainFlattenOptions(props: ITerrainToolOptionsContext): JSX.Element {
	const flatten = terrainSettings.sculpt.flatten;

	return (
		<>
			<TerrainSettingsListField
				editor={props.editor}
				object={flatten}
				property="target"
				label="Target"
				keys={["sculpt.flatten.target"]}
				items={TERRAIN_FLATTEN_TARGET_ITEMS}
			/>
			{flatten.target === "fixed" && <TerrainHeightPickField {...props} target={flatten} label="Height" keys={["sculpt.flatten.heightWorld"]} />}
			<TerrainSettingsListField editor={props.editor} object={flatten} property="mode" label="Mode" keys={["sculpt.flatten.mode"]} items={TERRAIN_BAND_MODE_ITEMS} />
		</>
	);
}

function TerrainSetHeightOptions(props: ITerrainToolOptionsContext): JSX.Element {
	const setHeight = terrainSettings.sculpt.setHeight;

	return (
		<>
			<TerrainHeightPickField {...props} target={setHeight} label="Height" keys={["sculpt.setHeight.heightWorld"]} />
			<TerrainSettingsListField editor={props.editor} object={setHeight} property="mode" label="Mode" keys={["sculpt.setHeight.mode"]} items={TERRAIN_BAND_MODE_ITEMS} />
		</>
	);
}

function TerrainRampOptions(props: ITerrainToolOptionsContext): JSX.Element {
	const ramp = terrainSettings.sculpt.ramp;

	return (
		<>
			<TerrainSettingsNumberField
				editor={props.editor}
				object={ramp}
				property="sideFalloff"
				label="Side falloff"
				keys={["sculpt.ramp.sideFalloff"]}
				percent
				min={0}
				max={100}
				step={1}
			/>
			<TerrainSettingsListField editor={props.editor} object={ramp} property="mode" label="Mode" keys={["sculpt.ramp.mode"]} items={TERRAIN_BAND_MODE_ITEMS} />
			<TerrainSettingsListField
				editor={props.editor}
				object={ramp}
				property="endHeights"
				label="End heights"
				keys={["sculpt.ramp.endHeights"]}
				items={TERRAIN_RAMP_END_HEIGHTS_ITEMS}
			/>
			{ramp.endHeights === "custom" && (
				<TerrainFieldsRow label="Start / End">
					<TerrainSettingsNumberField editor={props.editor} object={ramp} property="startWorld" keys={["sculpt.ramp.startWorld"]} step={1} />
					<TerrainSettingsNumberField editor={props.editor} object={ramp} property="endWorld" keys={["sculpt.ramp.endWorld"]} step={1} />
				</TerrainFieldsRow>
			)}
		</>
	);
}

function TerrainNoiseOptions(props: ITerrainToolOptionsContext): JSX.Element {
	const noise = terrainSettings.sculpt.noise;

	function handleRandomSeed(): void {
		try {
			const seed = Math.floor(Math.random() * 2147483647);
			updateTerrainSettings(
				(settings) => {
					settings.sculpt.noise.seed = seed;
				},
				["sculpt.noise.seed"]
			);
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	return (
		<>
			<TerrainSettingsListField editor={props.editor} object={noise} property="type" label="Type" keys={["sculpt.noise.type"]} items={TERRAIN_NOISE_TYPE_ITEMS} />
			<TerrainSettingsNumberField editor={props.editor} object={noise} property="scale" label="Scale" keys={["sculpt.noise.scale"]} min={1} step={1} />
			<TerrainSettingsNumberField editor={props.editor} object={noise} property="amplitude" label="Amplitude" keys={["sculpt.noise.amplitude"]} min={0} step={1} />
			<TerrainSettingsNumberField editor={props.editor} object={noise} property="octaves" label="Octaves" keys={["sculpt.noise.octaves"]} integer min={1} max={8} step={1} />
			<TerrainSettingsNumberField
				editor={props.editor}
				object={noise}
				property="persistence"
				label="Persistence"
				keys={["sculpt.noise.persistence"]}
				min={0}
				max={1}
				step={0.01}
			/>
			<TerrainSettingsNumberField
				editor={props.editor}
				object={noise}
				property="lacunarity"
				label="Lacunarity"
				keys={["sculpt.noise.lacunarity"]}
				min={1}
				max={4}
				step={0.01}
			/>

			<div className="flex items-center gap-1 w-full">
				<div className="flex-1 min-w-0">
					<TerrainSettingsNumberField editor={props.editor} object={noise} property="seed" label="Seed" keys={["sculpt.noise.seed"]} integer step={1} />
				</div>

				<TooltipProvider delayDuration={300}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={() => handleRandomSeed()} aria-label="Random seed">
								<LuDices className="w-4 h-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Random seed</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			<TerrainSettingsListField editor={props.editor} object={noise} property="mode" label="Mode" keys={["sculpt.noise.mode"]} items={TERRAIN_NOISE_MODE_ITEMS} />
		</>
	);
}

function TerrainTerraceOptions(props: ITerrainToolOptionsContext): JSX.Element {
	const terrace = terrainSettings.sculpt.terrace;

	return (
		<>
			<TerrainSettingsNumberField editor={props.editor} object={terrace} property="step" label="Step" keys={["sculpt.terrace.step"]} min={0.01} step={1} />
			<TerrainSettingsNumberField
				editor={props.editor}
				object={terrace}
				property="sharpness"
				label="Sharpness"
				keys={["sculpt.terrace.sharpness"]}
				min={0}
				max={1}
				step={0.01}
			/>
			<TerrainSettingsNumberField editor={props.editor} object={terrace} property="offset" label="Offset" keys={["sculpt.terrace.offset"]} step={1} />
		</>
	);
}

function TerrainErodeOptions(props: ITerrainToolOptionsContext): JSX.Element {
	const erode = terrainSettings.sculpt.erode;

	return (
		<>
			<TerrainSettingsListField editor={props.editor} object={erode} property="type" label="Type" keys={["sculpt.erode.type"]} items={TERRAIN_ERODE_TYPE_ITEMS} />

			{erode.type === "thermal" && (
				<>
					<TerrainSettingsNumberField
						editor={props.editor}
						object={erode}
						property="talusDegrees"
						label="Talus angle"
						keys={["sculpt.erode.talusDegrees"]}
						min={0}
						max={89}
						step={1}
					/>
					<TerrainSettingsNumberField
						editor={props.editor}
						object={erode}
						property="iterations"
						label="Iterations per dab"
						keys={["sculpt.erode.iterations"]}
						integer
						min={1}
						max={8}
						step={1}
					/>
				</>
			)}

			{erode.type === "hydraulic" && (
				<>
					<TerrainSettingsNumberField
						editor={props.editor}
						object={erode}
						property="droplets"
						label="Droplets per dab"
						keys={["sculpt.erode.droplets"]}
						integer
						min={1}
						max={1024}
						step={1}
					/>
					<TerrainSettingsNumberField
						editor={props.editor}
						object={erode}
						property="lifetime"
						label="Lifetime"
						keys={["sculpt.erode.lifetime"]}
						integer
						min={5}
						max={100}
						step={1}
					/>

					<TerrainCollapsibleBlock id="erode-advanced" title="Advanced">
						<TerrainSettingsNumberField
							editor={props.editor}
							object={erode}
							property="inertia"
							label="Inertia"
							keys={["sculpt.erode.inertia"]}
							min={0}
							max={0.99}
							step={0.01}
						/>
						<TerrainSettingsNumberField
							editor={props.editor}
							object={erode}
							property="capacity"
							label="Capacity"
							keys={["sculpt.erode.capacity"]}
							min={0.01}
							max={64}
							step={0.1}
						/>
						<TerrainSettingsNumberField
							editor={props.editor}
							object={erode}
							property="erosion"
							label="Erosion"
							keys={["sculpt.erode.erosion"]}
							min={0}
							max={1}
							step={0.01}
						/>
						<TerrainSettingsNumberField
							editor={props.editor}
							object={erode}
							property="deposition"
							label="Deposition"
							keys={["sculpt.erode.deposition"]}
							min={0}
							max={1}
							step={0.01}
						/>
						<TerrainSettingsNumberField
							editor={props.editor}
							object={erode}
							property="evaporation"
							label="Evaporation"
							keys={["sculpt.erode.evaporation"]}
							min={0}
							max={1}
							step={0.001}
						/>
						<TerrainSettingsNumberField
							editor={props.editor}
							object={erode}
							property="gravity"
							label="Gravity"
							keys={["sculpt.erode.gravity"]}
							min={0}
							max={100}
							step={0.1}
						/>
					</TerrainCollapsibleBlock>
				</>
			)}
		</>
	);
}

function TerrainStampOptions(props: ITerrainToolOptionsContext): JSX.Element {
	const stamp = terrainSettings.sculpt.stamp;

	return (
		<>
			<TerrainSettingsNumberField editor={props.editor} object={stamp} property="heightWorld" label="Height" keys={["sculpt.stamp.heightWorld"]} step={1} />
			<TerrainSettingsListField editor={props.editor} object={stamp} property="blend" label="Blend" keys={["sculpt.stamp.blend"]} items={TERRAIN_STAMP_BLEND_ITEMS} />
			<TerrainSettingsSwitchField editor={props.editor} object={stamp} property="onClickOnly" label="On click only" keys={["sculpt.stamp.onClickOnly"]} />
		</>
	);
}

function TerrainHolesOptions(props: ITerrainToolOptionsContext): JSX.Element {
	return (
		<>
			<TerrainSettingsNumberField
				editor={props.editor}
				object={terrainSettings.sculpt.holes}
				property="threshold"
				label="Threshold"
				keys={["sculpt.holes.threshold"]}
				min={0.05}
				max={1}
				step={0.01}
			/>
			<div className="px-2 text-xs text-muted-foreground break-words">{getTerrainToolHint("holes", terrainSettings)}</div>
		</>
	);
}

function TerrainHeightClampBlock(props: ITerrainToolOptionsContext): JSX.Element {
	const clamp = terrainSettings.sculpt.heightClamp;

	return (
		<EditorInspectorBlockField>
			<TerrainSettingsSwitchField
				editor={props.editor}
				object={clamp}
				property="enabled"
				label="Height clamp"
				tooltip="Keeps the heights between Min and Max (world cm) after every sculpt tool."
				keys={["sculpt.heightClamp.enabled"]}
			/>
			{clamp.enabled && (
				<TerrainFieldsRow label="Min / Max">
					<TerrainSettingsNumberField editor={props.editor} object={clamp} property="minWorld" keys={["sculpt.heightClamp.minWorld"]} step={1} />
					<TerrainSettingsNumberField editor={props.editor} object={clamp} property="maxWorld" keys={["sculpt.heightClamp.maxWorld"]} step={1} />
				</TerrainFieldsRow>
			)}
		</EditorInspectorBlockField>
	);
}

function TerrainReplaceOptions(props: ITerrainToolOptionsContext): JSX.Element {
	const layers = props.info?.layers ?? [];
	const layersKey = layers.map((layer) => `${layer.id}:${layer.name}`).join("|");
	const items = useMemo<IEditorInspectorListFieldItem[]>(
		() => layers.map((layer) => ({ key: layer.id, text: layer.name || `Layer ${layer.index + 1}`, value: layer.id })),
		[layersKey]
	);

	return (
		<>
			<TerrainSettingsListField
				editor={props.editor}
				object={terrainSettings.paint}
				property="replaceFromLayerId"
				label="From layer"
				keys={["paint.replaceFromLayerId"]}
				items={items}
			/>
			<TerrainSettingsNumberField
				editor={props.editor}
				object={terrainSettings.paint}
				property="replaceThreshold"
				label="Threshold"
				keys={["paint.replaceThreshold"]}
				min={0}
				max={1}
				step={0.01}
			/>
		</>
	);
}

function renderTerrainPaintToolOptions(tool: TerrainPaintTool, context: ITerrainToolOptionsContext): ReactNode {
	switch (tool) {
		case "paint":
			return (
				<TerrainSettingsNumberField
					editor={context.editor}
					object={terrainSettings.paint}
					property="opacity"
					label="Opacity"
					keys={["paint.opacity"]}
					percent
					min={0}
					max={100}
					step={1}
				/>
			);

		case "blend":
			return (
				<TerrainSettingsNumberField
					editor={context.editor}
					object={terrainSettings.paint}
					property="blendKernel"
					label="Blend kernel"
					keys={["paint.blendKernel"]}
					integer
					min={1}
					max={8}
					step={1}
				/>
			);

		case "replace":
			return <TerrainReplaceOptions {...context} />;

		case "auto-paint":
			return <div className="px-2 text-xs text-muted-foreground">{TERRAIN_AUTO_PAINT_OPTIONS_TEXT}</div>;
	}
}

function renderTerrainSculptToolOptions(tool: TerrainSculptTool, context: ITerrainToolOptionsContext): ReactNode {
	switch (tool) {
		case "raise":
			return null;
		case "smooth":
			return <TerrainSmoothOptions {...context} />;
		case "flatten":
			return <TerrainFlattenOptions {...context} />;
		case "set-height":
			return <TerrainSetHeightOptions {...context} />;
		case "ramp":
			return <TerrainRampOptions {...context} />;
		case "noise":
			return <TerrainNoiseOptions {...context} />;
		case "terrace":
			return <TerrainTerraceOptions {...context} />;
		case "erode":
			return <TerrainErodeOptions {...context} />;
		case "stamp":
			return <TerrainStampOptions {...context} />;
		case "holes":
			return <TerrainHolesOptions {...context} />;
	}
}

export interface ITerrainToolOptionsSectionProps {
	/** Editor reference. */
	editor: Editor;
	/** Target terrain of the tab. */
	mesh: Mesh;
	/** Viewport controller of the tab (pipette buttons); null while none is mounted. */
	controller: TerrainViewportController | null;
	/** Information of the target (cell size, layers, material); computed with getTerrainMeshInfo when omitted. */
	info?: ITerrainInfo | null;
}

/**
 * "{Tool} options" section (§1.7, §1.10): the options of the active tool, bound to terrainSettings.sculpt / .paint (`noUndoRedo`, keyed by
 * the external revision), plus the common "Height clamp" block for sculpt tools. Nothing in the Settings category.
 */
export function TerrainToolOptionsSection(props: ITerrainToolOptionsSectionProps): JSX.Element | null {
	useTerrainSettingsRevision();

	const tool = getActiveTerrainTool(terrainSettings);
	if (!tool) {
		return null;
	}

	const context: ITerrainToolOptionsContext = {
		editor: props.editor,
		mesh: props.mesh,
		controller: props.controller,
		info: props.info === undefined ? getTerrainInfoSafe(props.mesh) : props.info,
	};

	if (isTerrainPaintToolId(tool)) {
		const hasTerrainMaterial = !!context.info?.material?.isTerrainMaterial;

		return (
			<EditorInspectorSectionField title={getTerrainToolOptionsTitle(tool)}>
				{!hasTerrainMaterial && <div className="px-2 text-xs text-amber-500">{TERRAIN_NO_MATERIAL_TEXT}</div>}
				{renderTerrainPaintToolOptions(tool, context)}
			</EditorInspectorSectionField>
		);
	}

	return (
		<EditorInspectorSectionField title={getTerrainToolOptionsTitle(tool)} label={tool === "raise" ? getTerrainRaiseRateLabel(terrainSettings) : undefined}>
			{renderTerrainSculptToolOptions(tool as TerrainSculptTool, context)}
			<TerrainHeightClampBlock {...context} />
		</EditorInspectorSectionField>
	);
}
