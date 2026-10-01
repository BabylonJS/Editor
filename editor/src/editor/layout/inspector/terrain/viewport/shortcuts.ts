import { TERRAIN_PAINT_TOOLS, TERRAIN_SCULPT_TOOLS } from "../../../../../tools/terrain/core/settings";
import type { TerrainCategory, TerrainOverlay, TerrainPaintTool, TerrainSculptTool } from "../../../../../tools/terrain/core/types";

/**
 * Pure keyboard mapping of the Terrain tab (§1.15): event.code → action, the scoping predicate, the camera-key skip and the key labels
 * of the user's keyboard layout. Nothing here touches the DOM, the scene or the settings: the viewport controller executes the actions.
 */

/** Keyboard event fields read by the mapping (a DOM KeyboardEvent satisfies it). */
export interface ITerrainShortcutKeyEvent {
	readonly code: string;
	readonly keyCode: number;
	readonly shiftKey: boolean;
	readonly altKey: boolean;
	readonly ctrlKey: boolean;
	readonly metaKey: boolean;
	readonly repeat: boolean;
}

export type TerrainShortcutAction =
	/** `[` / `]`: radius × factor (0.8 / 1.25). */
	| { type: "radius"; factor: number }
	/** Shift + `[` / `]`: strength of the active tool ± delta (0..1). */
	| { type: "strength"; delta: number }
	/** Alt + `[` / `]`: hardness ± delta (0..0.95). */
	| { type: "hardness"; delta: number }
	/** `,` / `.`: rotation ± delta degrees (±15, Shift ±1). */
	| { type: "rotation"; delta: number }
	/** Digit keys in Sculpt and Settings: switch to Sculpt with that tool. */
	| { type: "sculpt-tool"; tool: TerrainSculptTool }
	/** Digit keys 1–4 in Paint. */
	| { type: "paint-tool"; tool: TerrainPaintTool }
	/** Shift + Digit1…Digit8: active paint layer index 0..7 (switches to Paint). */
	| { type: "paint-layer"; index: number }
	/** `T`: Sculpt ↔ Paint (Settings → Sculpt). */
	| { type: "toggle-category" }
	/** `X`: sticky invert. */
	| { type: "toggle-invert" }
	/** `I`: eyedropper under the cursor. */
	| { type: "eyedropper" }
	/** `O`: next overlay. */
	| { type: "cycle-overlay" }
	/** `H`: HUD + footprint preview. */
	| { type: "toggle-hud" }
	/** `N`: Navigate mode. */
	| { type: "toggle-navigate" }
	/** `B` (keydown, not repeated): starts the radial adjust; the controller commits it on keyup. */
	| { type: "radial-adjust" }
	/** Escape: cancels the radial adjust, an armed brush capture or the active stroke (first match only). */
	| { type: "escape" };

/** Inputs of the scoping predicate (§1.15), read from the DOM by the controller. */
export interface ITerrainShortcutContextInput {
	/** The tab root is visible (`rootElement.offsetParent !== null`). */
	tabVisible: boolean;
	/** A `[role="dialog"]` or `[role="alertdialog"]` element is open. */
	dialogOpen: boolean;
	/** A text input, a text area or a content-editable element has the focus. */
	textInputFocused: boolean;
	/** The pointer is over the preview canvas (tracked with pointerenter / pointerleave). */
	pointerOverCanvas: boolean;
	/** `rootElement.contains(document.activeElement)`. */
	focusInTab: boolean;
}

/** Camera fields holding the keyCode lists of the editor camera (EditorCamera, FreeCamera). */
export interface ITerrainCameraKeys {
	keysUp?: number[];
	keysDown?: number[];
	keysLeft?: number[];
	keysRight?: number[];
	keysUpward?: number[];
	keysDownward?: number[];
}

/** Minimal element fields read by isTerrainTextInputElement (a DOM Element satisfies it). */
export interface ITerrainFocusableElement {
	readonly tagName?: string;
	readonly isContentEditable?: boolean;
	readonly readOnly?: boolean;
	readonly disabled?: boolean;
}

/** Keyboard layout map of the Keyboard API (navigator.keyboard.getLayoutMap()). */
export interface ITerrainKeyboardLayoutMap {
	get(code: string): string | undefined;
}

/** Keyboard API provider (navigator.keyboard). */
export interface ITerrainKeyboardLayoutProvider {
	getLayoutMap(): Promise<ITerrainKeyboardLayoutMap>;
}

/** Overlay cycle of `O` (§1.15). */
export const TERRAIN_OVERLAY_CYCLE: readonly TerrainOverlay[] = ["none", "layer-weights", "active-layer", "contours", "slope", "grid"];

/** Radius factors of `[` / `]`. */
export const TERRAIN_SHORTCUT_RADIUS_FACTORS = { decrease: 0.8, increase: 1.25 } as const;
/** Strength step of Shift + `[` / `]` (fraction, 5 %). */
export const TERRAIN_SHORTCUT_STRENGTH_STEP = 0.05;
/** Hardness step of Alt + `[` / `]` (fraction, 10 %). */
export const TERRAIN_SHORTCUT_HARDNESS_STEP = 0.1;
/** Rotation steps of `,` / `.` in degrees (Shift: fine step). */
export const TERRAIN_SHORTCUT_ROTATION_STEPS = { coarse: 15, fine: 1 } as const;

/** Maximum number of paint layers reachable with Shift + digits. */
const TERRAIN_SHORTCUT_MAX_LAYERS = 8;

/** Labels of the US layout, used when the Keyboard API is unavailable. */
const TERRAIN_US_KEY_LABELS: Readonly<Record<string, string>> = {
	BracketLeft: "[",
	BracketRight: "]",
	Comma: ",",
	Period: ".",
	Semicolon: ";",
	Quote: "'",
	Backquote: "`",
	Backslash: "\\",
	Slash: "/",
	Minus: "-",
	Equal: "=",
	Escape: "Esc",
	Space: "Space",
	Enter: "Enter",
	Tab: "Tab",
	Backspace: "Backspace",
	Delete: "Delete",
	ShiftLeft: "Shift",
	ShiftRight: "Shift",
	AltLeft: "Alt",
	AltRight: "Alt",
	ControlLeft: "Ctrl",
	ControlRight: "Ctrl",
	MetaLeft: "Cmd",
	MetaRight: "Cmd",
};

let terrainKeyboardLayoutMap: ITerrainKeyboardLayoutMap | null = null;
let terrainKeyboardLayoutRequest = 0;

/**
 * Maps a keydown event to a terrain action (§1.15), null when the key is not a terrain shortcut in this situation:
 * - Ctrl/Meta held: never (menu accelerators);
 * - keys whose keyCode belongs to the camera keys (defaults and user remaps): never, so flying the camera never triggers a shortcut;
 * - Alt held: only the Alt + bracket row (hardness);
 * - event.repeat: only the repeatable adjustments (brackets, comma/period) and Escape; toggles, tools and the radial adjust ignore repeats.
 * Keys are matched on event.code (physical position), so digits work on AZERTY without Shift.
 * @param event defines the keydown event.
 * @param category defines the active category of the Terrain tab.
 * @param cameraKeyCodes defines the keyCodes used by the camera (see getTerrainCameraKeyCodes).
 */
export function getTerrainShortcutAction(event: ITerrainShortcutKeyEvent, category: TerrainCategory, cameraKeyCodes: readonly number[]): TerrainShortcutAction | null {
	if (event.ctrlKey || event.metaKey) {
		return null;
	}

	if (cameraKeyCodes.includes(event.keyCode)) {
		return null;
	}

	const code = event.code;

	if (event.altKey) {
		switch (code) {
			case "BracketLeft":
				return { type: "hardness", delta: -TERRAIN_SHORTCUT_HARDNESS_STEP };
			case "BracketRight":
				return { type: "hardness", delta: TERRAIN_SHORTCUT_HARDNESS_STEP };
			default:
				return null;
		}
	}

	switch (code) {
		case "BracketLeft":
			return event.shiftKey ? { type: "strength", delta: -TERRAIN_SHORTCUT_STRENGTH_STEP } : { type: "radius", factor: TERRAIN_SHORTCUT_RADIUS_FACTORS.decrease };
		case "BracketRight":
			return event.shiftKey ? { type: "strength", delta: TERRAIN_SHORTCUT_STRENGTH_STEP } : { type: "radius", factor: TERRAIN_SHORTCUT_RADIUS_FACTORS.increase };
		case "Comma":
			return { type: "rotation", delta: event.shiftKey ? -TERRAIN_SHORTCUT_ROTATION_STEPS.fine : -TERRAIN_SHORTCUT_ROTATION_STEPS.coarse };
		case "Period":
			return { type: "rotation", delta: event.shiftKey ? TERRAIN_SHORTCUT_ROTATION_STEPS.fine : TERRAIN_SHORTCUT_ROTATION_STEPS.coarse };
		case "Escape":
			return { type: "escape" };
	}

	if (event.repeat) {
		return null;
	}

	const digit = getTerrainShortcutDigitIndex(code);
	if (digit !== null) {
		if (event.shiftKey) {
			return digit < TERRAIN_SHORTCUT_MAX_LAYERS ? { type: "paint-layer", index: digit } : null;
		}

		if (category === "paint") {
			return digit < TERRAIN_PAINT_TOOLS.length ? { type: "paint-tool", tool: TERRAIN_PAINT_TOOLS[digit] } : null;
		}

		// Sculpt, and Settings (switches to Sculpt with that tool).
		return digit < TERRAIN_SCULPT_TOOLS.length ? { type: "sculpt-tool", tool: TERRAIN_SCULPT_TOOLS[digit] } : null;
	}

	switch (code) {
		case "KeyT":
			return { type: "toggle-category" };
		case "KeyX":
			return { type: "toggle-invert" };
		case "KeyI":
			return { type: "eyedropper" };
		case "KeyO":
			return { type: "cycle-overlay" };
		case "KeyH":
			return { type: "toggle-hud" };
		case "KeyN":
			return { type: "toggle-navigate" };
		case "KeyB":
			return { type: "radial-adjust" };
		default:
			return null;
	}
}

/**
 * Index (0..9) of a digit key in the tool order: Digit1 → 0, …, Digit9 → 8, Digit0 → 9; null for other codes.
 * @param code defines the KeyboardEvent.code of the key.
 */
export function getTerrainShortcutDigitIndex(code: string): number | null {
	const match = /^Digit([0-9])$/.exec(code);
	if (!match) {
		return null;
	}

	const digit = parseInt(match[1], 10);
	return digit === 0 ? 9 : digit - 1;
}

/**
 * Scoping predicate of the terrain shortcuts (§1.15): the tab root is visible, no dialog is open, no text input has the focus, and
 * either the pointer is over the preview canvas or the focus is inside the tab.
 * @param input defines the state read from the DOM.
 */
export function isTerrainShortcutContext(input: ITerrainShortcutContextInput): boolean {
	return input.tabVisible && !input.dialogOpen && !input.textInputFocused && (input.pointerOverCanvas || input.focusInTab);
}

/**
 * Returns whether the element is a text input, a text area or a content-editable element that accepts typing
 * (same rule as tools/dom isDomTextInputFocused, for a given element).
 * @param element defines the focused element (document.activeElement).
 */
export function isTerrainTextInputElement(element: ITerrainFocusableElement | null | undefined): boolean {
	if (!element) {
		return false;
	}

	const tagName = (element.tagName ?? "").toUpperCase();
	return (tagName === "INPUT" || tagName === "TEXTAREA" || element.isContentEditable === true) && !element.readOnly && !element.disabled;
}

/**
 * Collects the keyCodes of the camera keys (keysUp, keysDown, keysLeft, keysRight, keysUpward, keysDownward): they follow the user's
 * preferences and keyboard layout, so a key used to fly the camera is never a terrain shortcut.
 * @param camera defines the active camera of the preview (null when none).
 */
export function getTerrainCameraKeyCodes(camera: ITerrainCameraKeys | null | undefined): number[] {
	if (!camera) {
		return [];
	}

	const codes: number[] = [];
	for (const list of [camera.keysUp, camera.keysDown, camera.keysLeft, camera.keysRight, camera.keysUpward, camera.keysDownward]) {
		if (!Array.isArray(list)) {
			continue;
		}

		for (const code of list) {
			if (typeof code === "number" && !codes.includes(code)) {
				codes.push(code);
			}
		}
	}

	return codes;
}

/**
 * Next overlay of the `O` cycle: none → layer weights → active layer → contours → slope → grid → none. "active-layer" is skipped
 * outside the Paint category (the header offers it in Paint only).
 * @param current defines the current overlay.
 * @param category defines the active category.
 */
export function getNextTerrainOverlay(current: TerrainOverlay, category: TerrainCategory): TerrainOverlay {
	const index = TERRAIN_OVERLAY_CYCLE.indexOf(current);

	for (let offset = 1; offset <= TERRAIN_OVERLAY_CYCLE.length; ++offset) {
		const overlay = TERRAIN_OVERLAY_CYCLE[(Math.max(index, 0) + offset) % TERRAIN_OVERLAY_CYCLE.length];
		if (overlay !== "active-layer" || category === "paint") {
			return overlay;
		}
	}

	return "none";
}

/**
 * Loads the keyboard layout map used by getTerrainShortcutLabel (called once at mount by the viewport controller). Without the
 * Keyboard API (or when it fails) the labels fall back to the US layout. Never rejects.
 * @param provider defines the Keyboard API (default: navigator.keyboard).
 */
export async function loadTerrainKeyboardLayout(provider?: ITerrainKeyboardLayoutProvider | null): Promise<void> {
	const keyboard = provider === undefined ? getNavigatorKeyboard() : provider;
	const request = ++terrainKeyboardLayoutRequest;

	if (!keyboard) {
		return;
	}

	try {
		const map = await keyboard.getLayoutMap();
		if (request === terrainKeyboardLayoutRequest) {
			terrainKeyboardLayoutMap = map ?? null;
		}
	} catch (e) {
		// Keep the previous map (or the US labels).
	}
}

/**
 * Sets the keyboard layout map used by getTerrainShortcutLabel (null: US labels).
 * @param map defines the layout map.
 */
export function setTerrainKeyboardLayoutMap(map: ITerrainKeyboardLayoutMap | null): void {
	++terrainKeyboardLayoutRequest;
	terrainKeyboardLayoutMap = map;
}

/**
 * Label of a key for hints, tooltips and the HUD (§1.15): the character the key types on the user's layout (AZERTY users read
 * `^ $ ; :` instead of `[ ] , .`), upper-cased letters, the digit itself for Digit keys, else the US label.
 * @param code defines the KeyboardEvent.code of the key.
 */
export function getTerrainShortcutLabel(code: string): string {
	const digit = /^Digit([0-9])$/.exec(code);
	if (digit) {
		return digit[1];
	}

	let label: string | undefined;
	try {
		label = terrainKeyboardLayoutMap?.get(code);
	} catch (e) {
		label = undefined;
	}

	if (typeof label === "string" && label.length > 0 && label.length <= 2 && label.trim().length > 0) {
		return label.toUpperCase();
	}

	const letter = /^Key([A-Z])$/.exec(code);
	if (letter) {
		return letter[1];
	}

	return TERRAIN_US_KEY_LABELS[code] ?? code;
}

/**
 * Label of the eyedropper / menu modifier: "Cmd" on macOS, "Ctrl" elsewhere.
 * @param isMac defines whether the editor runs on macOS.
 */
export function getTerrainModifierKeyLabel(isMac: boolean): string {
	return isMac ? "Cmd" : "Ctrl";
}

function getNavigatorKeyboard(): ITerrainKeyboardLayoutProvider | null {
	try {
		return typeof navigator !== "undefined" ? (navigator.keyboard ?? null) : null;
	} catch (e) {
		return null;
	}
}
