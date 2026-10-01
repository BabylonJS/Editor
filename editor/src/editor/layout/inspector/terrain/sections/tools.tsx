import { useEffect, useRef, useState } from "react";

import type { IconType } from "react-icons";
import { TbStairs } from "react-icons/tb";
import {
	LuArrowDownToLine,
	LuArrowUpFromLine,
	LuBlend,
	LuCircleDashed,
	LuDroplets,
	LuEqual,
	LuPaintbrush,
	LuReplace,
	LuRuler,
	LuScanLine,
	LuSparkles,
	LuSpline,
	LuStamp,
	LuTriangleAlert,
	LuWandSparkles,
	LuWaves,
} from "react-icons/lu";

import type { Editor } from "../../../../main";

import { isDarwin } from "../../../../../tools/os";
import { TERRAIN_PAINT_TOOLS, TERRAIN_SCULPT_TOOLS } from "../../../../../tools/terrain/core/settings";
import type { ITerrainToolSettings, TerrainCategory, TerrainPaintTool, TerrainSculptTool, TerrainTool } from "../../../../../tools/terrain/core/types";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../../ui/shadcn/ui/tooltip";
import { ToolbarRadioGroup, ToolbarRadioGroupItem } from "../../../../../ui/shadcn/ui/toolbar-radio-group";

import { EditorInspectorSectionField } from "../../fields/section";

import { formatTerrainNumber } from "../format";
import { reportTerrainTabError } from "../drop-actions";
import type { ITerrainViewportStatus } from "../viewport/controller";
import { getTerrainModifierKeyLabel, getTerrainShortcutLabel } from "../viewport/shortcuts";
import { onTerrainSettingsChangedObservable, terrainSettings, updateTerrainSettings, type ITerrainSettingsChange } from "../settings";

/** Display names of the tools (§1.6, §1.10). */
export const TERRAIN_TOOL_NAMES: Readonly<Record<TerrainTool, string>> = {
	raise: "Raise",
	smooth: "Smooth",
	flatten: "Flatten",
	"set-height": "Set height",
	ramp: "Ramp",
	noise: "Noise",
	terrace: "Terrace",
	erode: "Erode",
	stamp: "Stamp",
	holes: "Holes",
	paint: "Paint",
	blend: "Blend",
	replace: "Replace",
	"auto-paint": "Auto-paint",
};

/** Icons of the tool rows (§1.6, §1.10). Raise shows TERRAIN_RAISE_INVERTED_ICON while inverted. */
export const TERRAIN_TOOL_ICONS: Readonly<Record<TerrainTool, IconType>> = {
	raise: LuArrowUpFromLine,
	smooth: LuWaves,
	flatten: LuEqual,
	"set-height": LuRuler,
	ramp: LuSpline,
	noise: LuSparkles,
	terrace: TbStairs,
	erode: LuDroplets,
	stamp: LuStamp,
	holes: LuCircleDashed,
	paint: LuPaintbrush,
	blend: LuBlend,
	replace: LuReplace,
	"auto-paint": LuWandSparkles,
};

/** Icon of the Raise tool while it lowers (Shift held or sticky invert, §1.6). */
export const TERRAIN_RAISE_INVERTED_ICON: IconType = LuArrowDownToLine;

/** Tools without airbrush ("–" in §1.6: single application or binary result): their Airbrush switch is not shown. */
export const TERRAIN_TOOLS_WITHOUT_AIRBRUSH: readonly TerrainTool[] = ["ramp", "stamp", "holes"];

/**
 * Whether the tool has an Airbrush switch (§1.6: ramp, stamp and holes have none).
 * @param tool defines the tool.
 */
export function isTerrainAirbrushTool(tool: TerrainTool): boolean {
	return !TERRAIN_TOOLS_WITHOUT_AIRBRUSH.includes(tool);
}

/**
 * Whether the tool is a paint tool (§1.10).
 * @param tool defines the tool.
 */
export function isTerrainPaintToolId(tool: TerrainTool): tool is TerrainPaintTool {
	return (TERRAIN_PAINT_TOOLS as readonly string[]).includes(tool);
}

/**
 * Tools of a category, in the order of their digit keys: the 10 sculpt tools (§1.6) or the 4 paint tools (§1.10); none in Settings.
 * @param category defines the category.
 */
export function getTerrainCategoryTools(category: TerrainCategory): readonly TerrainTool[] {
	switch (category) {
		case "sculpt":
			return TERRAIN_SCULPT_TOOLS;
		case "paint":
			return TERRAIN_PAINT_TOOLS;
		default:
			return [];
	}
}

/**
 * KeyboardEvent.code of the digit key selecting the tool in its category: Digit1…Digit9 then Digit0 for the 10th sculpt tool (§1.15).
 * @param tool defines the tool.
 */
export function getTerrainToolKeyCode(tool: TerrainTool): string {
	const tools: readonly TerrainTool[] = isTerrainPaintToolId(tool) ? TERRAIN_PAINT_TOOLS : TERRAIN_SCULPT_TOOLS;
	const index = Math.max(0, tools.indexOf(tool));

	return `Digit${(index + 1) % 10}`;
}

/**
 * Tooltip of a tool button (§1.6, §1.10), key labels from getTerrainShortcutLabel (keyboard layout aware, §1.15).
 * @param tool defines the tool.
 */
export function getTerrainToolTooltip(tool: TerrainTool): string {
	const key = getTerrainShortcutLabel(getTerrainToolKeyCode(tool));
	const pick = getTerrainShortcutLabel("KeyI");

	switch (tool) {
		case "raise":
			return `Raise / Lower (${key}) — Shift: lower`;
		case "smooth":
			return `Smooth (${key}) — Shift: sharpen`;
		case "flatten":
			return `Flatten (${key}) — ${pick} or Cmd/Ctrl+click: pick height`;
		case "set-height":
			return `Set height (${key}) — ${pick}: pick height`;
		case "ramp":
			return `Ramp (${key}) — drag from start to end`;
		case "noise":
			return `Noise (${key}) — Shift: subtract`;
		case "terrace":
			return `Terrace (${key})`;
		case "erode":
			return `Erode (${key}) — thermal or hydraulic`;
		case "stamp":
			return `Stamp (${key}) — click to stamp the brush image`;
		case "holes":
			return `Holes (${key}) — Shift: fill`;
		case "paint":
			return `Paint (${key}) — Shift: erase`;
		case "blend":
			return `Blend (${key})`;
		case "replace":
			return `Replace (${key})`;
		case "auto-paint":
			return `Auto-paint (${key})`;
	}
}

/**
 * Hint line shown under the tool row (§1.6; paint tools: same style). `{mod}` is "Cmd" on macOS, else "Ctrl"; key labels follow the
 * keyboard layout (getTerrainShortcutLabel); heights and steps are read from the tool settings.
 * @param tool defines the tool.
 * @param settings defines the tool settings (heights, steps, erosion type).
 * @param isMac defines whether the editor runs on macOS (default: the current platform).
 */
export function getTerrainToolHint(tool: TerrainTool, settings: ITerrainToolSettings, isMac: boolean = isDarwin()): string {
	const modifier = getTerrainModifierKeyLabel(isMac);
	const pick = getTerrainShortcutLabel("KeyI");
	const smaller = getTerrainShortcutLabel("BracketLeft");
	const larger = getTerrainShortcutLabel("BracketRight");

	switch (tool) {
		case "raise":
			return `Drag to raise · Shift: lower · ${smaller} ${larger}: radius · Shift+${smaller} ${larger}: strength`;
		case "smooth":
			return "Drag to smooth · Shift: sharpen";
		case "flatten":
			return `Drag to flatten · ${pick} or ${modifier}+click: pick the target height`;
		case "set-height":
			return `Drag to reach ${formatTerrainNumber(settings.sculpt?.setHeight?.heightWorld ?? 0, 1)} cm · ${pick} or ${modifier}+click: pick height`;
		case "ramp":
			return "Press at the start, release at the end · the width is the brush diameter";
		case "noise":
			return "Drag to add noise · Shift: subtract";
		case "terrace":
			return `Drag to terrace in steps of ${formatTerrainNumber(settings.sculpt?.terrace?.step ?? 0, 1)} cm`;
		case "erode":
			return `Drag to erode (${settings.sculpt?.erode?.type === "hydraulic" ? "hydraulic" : "thermal"})`;
		case "stamp":
			return `Click to stamp the brush image (${formatTerrainNumber(settings.sculpt?.stamp?.heightWorld ?? 0, 1)} cm)`;
		case "holes":
			return "Drag to cut holes · Shift: fill · physics, navigation and picking fall through holes";
		case "paint":
			return `Drag to paint the active layer · Shift: erase · ${modifier}+click: pick the layer`;
		case "blend":
			return "Drag to blend the painted layers together";
		case "replace":
			return "Drag to move the weight of the “From layer” to the active layer · Shift: swap them";
		case "auto-paint":
			return "Drag to paint with the auto-paint rules of the layers";
	}
}

/**
 * Re-renders the calling component on every change of the terrain settings (fields, shortcuts, MCP, reset...). Returns a counter that
 * changes with each accepted notification. The optional filter selects the changes that re-render (read at each notification).
 * @param filter defines an optional filter of the changes.
 */
export function useTerrainSettingsRevision(filter?: (change: ITerrainSettingsChange) => boolean): number {
	const [revision, setRevision] = useState(0);
	const filterRef = useRef(filter);

	filterRef.current = filter;

	useEffect(() => {
		const observer = onTerrainSettingsChangedObservable.add((change) => {
			try {
				if (!filterRef.current || filterRef.current(change)) {
					setRevision((value) => value + 1);
				}
			} catch (e) {
				console.error(e);
			}
		});

		return () => {
			onTerrainSettingsChangedObservable.remove(observer);
		};
	}, []);

	return revision;
}

/**
 * Tracks whether a Shift key is held (the live inversion modifier of §1.6), reset when the window loses the focus.
 */
function useTerrainShiftKey(): boolean {
	const [shift, setShift] = useState(false);

	useEffect(() => {
		const handleKey = (ev: KeyboardEvent): void => {
			try {
				if (ev.key === "Shift") {
					setShift(ev.type === "keydown");
				}
			} catch (e) {
				console.error(e);
			}
		};

		const handleBlur = (): void => {
			try {
				setShift(false);
			} catch (e) {
				console.error(e);
			}
		};

		document.addEventListener("keydown", handleKey);
		document.addEventListener("keyup", handleKey);
		window.addEventListener("blur", handleBlur);

		return () => {
			document.removeEventListener("keydown", handleKey);
			document.removeEventListener("keyup", handleKey);
			window.removeEventListener("blur", handleBlur);
		};
	}, []);

	return shift;
}

/**
 * Selects a tool of its category (§1.6, §1.10): an external settings change (updateTerrainSettings), so the tool-dependent fields
 * (strength, airbrush, options) remount with the values of the new tool.
 * @param tool defines the tool to select.
 */
export function selectTerrainTool(tool: TerrainTool): void {
	if (isTerrainPaintToolId(tool)) {
		updateTerrainSettings(
			(settings) => {
				settings.paintTool = tool;
			},
			["paintTool"]
		);
	} else {
		updateTerrainSettings(
			(settings) => {
				settings.sculptTool = tool as TerrainSculptTool;
			},
			["sculptTool"]
		);
	}
}

export interface ITerrainToolsSectionProps {
	/** Editor reference (error reports). */
	editor?: Editor | null;
	/** Category whose tools are listed; default terrainSettings.category. The Settings category has no tool row (renders nothing). */
	category?: TerrainCategory;
	/** Status of the viewport controller: its message (refusal or state message, §1.15) replaces the hint of the tool. */
	status?: Readonly<ITerrainViewportStatus> | null;
}

/**
 * "Tools" section of the Sculpt and Paint categories (§1.4, §1.6, §1.10): a wrapping ToolbarRadioGroup with one tooltip per tool and the
 * hint line of the selected tool (replaced by the refusal/state message of the viewport controller when there is one).
 */
export function TerrainToolsSection(props: ITerrainToolsSectionProps): JSX.Element | null {
	useTerrainSettingsRevision((change) => change.external || change.keys.some((key) => key.startsWith("sculpt") || key === "sculptTool" || key === "paintTool"));

	const shift = useTerrainShiftKey();

	const category = props.category ?? terrainSettings.category;
	const tools = getTerrainCategoryTools(category);
	if (!tools.length) {
		return null;
	}

	const selected: TerrainTool = category === "paint" ? terrainSettings.paintTool : terrainSettings.sculptTool;
	const inverted = !!terrainSettings.invertToggle !== shift;
	const message = props.status?.message ?? null;

	function handleValueChange(value: string): void {
		try {
			const tool = tools.find((t) => t === value);
			if (tool && tool !== selected) {
				selectTerrainTool(tool);
			}
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	return (
		<EditorInspectorSectionField title="Tools" label={TERRAIN_TOOL_NAMES[selected] ?? ""}>
			<TooltipProvider delayDuration={300}>
				<ToolbarRadioGroup value={selected} onValueChange={(value) => handleValueChange(value)} className="flex-wrap px-1" aria-label={`${category} tools`}>
					{tools.map((tool) => {
						const Icon = tool === "raise" && inverted ? TERRAIN_RAISE_INVERTED_ICON : TERRAIN_TOOL_ICONS[tool];

						return (
							<Tooltip key={tool}>
								<TooltipTrigger asChild>
									<ToolbarRadioGroupItem value={tool} aria-label={TERRAIN_TOOL_NAMES[tool]} className={tool === selected ? "bg-primary/20" : ""}>
										<Icon className="w-4 h-4" />
									</ToolbarRadioGroupItem>
								</TooltipTrigger>
								<TooltipContent>{getTerrainToolTooltip(tool)}</TooltipContent>
							</Tooltip>
						);
					})}
				</ToolbarRadioGroup>
			</TooltipProvider>

			{message && props.status?.captureArmed && (
				<div className="flex items-start gap-1 px-2 text-xs text-primary">
					<LuScanLine className="w-3 h-3 mt-0.5 shrink-0" />
					<span className="min-w-0 break-words">{message}</span>
				</div>
			)}

			{message && !props.status?.captureArmed && (
				<div className="flex items-start gap-1 px-2 text-xs text-amber-500">
					<LuTriangleAlert className="w-3 h-3 mt-0.5 shrink-0" />
					<span className="min-w-0 break-words">{message}</span>
				</div>
			)}

			{!message && <div className="px-2 text-xs text-muted-foreground break-words">{getTerrainToolHint(selected, terrainSettings)}</div>}
		</EditorInspectorSectionField>
	);
}
