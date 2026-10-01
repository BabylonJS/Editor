import type { TerrainTool } from "../../../../../tools/terrain/core/types";

/**
 * Heads-up display of the Terrain tab over the preview (§1.14): a bottom-centre line with the tool state and the surface under the
 * cursor, a transient centred chip for values changed by shortcuts / wheel / radial adjust, and a cursor-anchored chip for refusals.
 * Imperative DOM (no React): the elements are appended to the canvas parent and removed by dispose().
 */

/** Display names of the tools (tooltips of §1.6 and §1.10). */
export const TERRAIN_TOOL_LABELS: Readonly<Record<TerrainTool, string>> = {
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

/** Class of the bottom-centre line (§1.14): bottom-centre because the camera preview panel occupies the bottom-left corner. */
export const TERRAIN_HUD_LINE_CLASS_NAME = "pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-2 px-2 py-1 rounded bg-black/50 text-xs text-white whitespace-nowrap";
/** Class of the transient centred value chip. */
export const TERRAIN_HUD_VALUE_CHIP_CLASS_NAME =
	"pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded bg-black/60 text-lg text-white whitespace-nowrap transition-opacity duration-300";
/** Class of the cursor-anchored refusal chip. */
export const TERRAIN_HUD_POINTER_CHIP_CLASS_NAME =
	"pointer-events-none absolute px-2 py-1 rounded bg-black/70 text-xs text-white whitespace-nowrap transition-opacity duration-300";

/** Visible time of the value chip before it fades (ms). */
export const TERRAIN_HUD_VALUE_CHIP_DURATION_MS = 800;
/** Visible time of the refusal chip before it fades (ms). */
export const TERRAIN_HUD_POINTER_CHIP_DURATION_MS = 1500;
/** Horizontal offset of the refusal chip from the pointer (px). */
export const TERRAIN_HUD_POINTER_CHIP_OFFSET_PX = 16;

export interface ITerrainHudLineInput {
	tool: TerrainTool;
	/** World cm. */
	radius: number;
	/** 0..1. */
	strength: number;
	brushName: string;
	/** Effective inversion (sticky toggle XOR Shift). */
	inverted: boolean;
	navigate: boolean;
	/** Surface under the pointer when it is over the target terrain. */
	surface: { heightWorld: number; slopeDegrees: number } | null;
}

/**
 * Formats a length in centimetres for the HUD: one decimal below 10 cm, integers above.
 * @param centimeters defines the length.
 */
export function formatTerrainHudLength(centimeters: number): string {
	if (!Number.isFinite(centimeters)) {
		return "– cm";
	}

	return Math.abs(centimeters) < 10 ? `${roundTerrainHudValue(centimeters, 1)} cm` : `${Math.round(centimeters)} cm`;
}

/**
 * Formats a 0..1 fraction as an integer percentage ("35 %").
 * @param fraction defines the fraction.
 */
export function formatTerrainHudPercent(fraction: number): string {
	return `${Math.round(fraction * 100)} %`;
}

/**
 * HUD line (§1.14): "{Tool} · r {radius} · {strength} % · {brush name}{ · inverted}{ · Navigate}" and, over the target,
 * " · Y {height} cm · {slope}°".
 * @param input defines the values to show.
 */
export function formatTerrainHudLine(input: ITerrainHudLineInput): string {
	let line = `${TERRAIN_TOOL_LABELS[input.tool] ?? input.tool} · r ${formatTerrainHudLength(input.radius)} · ${formatTerrainHudPercent(input.strength)} · ${input.brushName}`;

	if (input.inverted) {
		line += " · inverted";
	}

	if (input.navigate) {
		line += " · Navigate";
	}

	if (input.surface) {
		line += ` · Y ${roundTerrainHudValue(input.surface.heightWorld, 1)} cm · ${roundTerrainHudValue(input.surface.slopeDegrees, 1)}°`;
	}

	return line;
}

export class TerrainHud {
	private readonly _container: HTMLElement | null;

	private _line: HTMLDivElement | null = null;
	private _valueChip: HTMLDivElement | null = null;
	private _pointerChip: HTMLDivElement | null = null;

	private _lineText: string | null = null;
	private _valueChipText: string | null = null;
	private _pointerChipText: string | null = null;

	private _valueChipTimeout: ReturnType<typeof setTimeout> | null = null;
	private _pointerChipTimeout: ReturnType<typeof setTimeout> | null = null;

	private _disposed: boolean = false;

	/**
	 * Constructor.
	 * @param container defines the element receiving the HUD (the preview canvas parent); null disables the DOM output (texts are still tracked).
	 */
	public constructor(container: HTMLElement | null) {
		this._container = container;

		const ownerDocument = container?.ownerDocument ?? null;
		if (!container || !ownerDocument) {
			return;
		}

		this._line = this._createElement(ownerDocument, TERRAIN_HUD_LINE_CLASS_NAME);
		this._valueChip = this._createElement(ownerDocument, TERRAIN_HUD_VALUE_CHIP_CLASS_NAME);
		this._pointerChip = this._createElement(ownerDocument, TERRAIN_HUD_POINTER_CHIP_CLASS_NAME);
	}

	/** Text of the bottom-centre line, null when hidden. */
	public get lineText(): string | null {
		return this._lineText;
	}

	/** Text of the centred value chip while it is shown, null otherwise. */
	public get valueChipText(): string | null {
		return this._valueChipText;
	}

	/** Text of the cursor-anchored chip while it is shown, null otherwise. */
	public get pointerChipText(): string | null {
		return this._pointerChipText;
	}

	/**
	 * Sets the bottom-centre line (null hides it). Writes the DOM only when the text changes.
	 * @param text defines the text of the line.
	 */
	public setLine(text: string | null): void {
		if (this._disposed || text === this._lineText) {
			return;
		}

		this._lineText = text;

		if (this._line) {
			this._line.textContent = text ?? "";
			this._line.style.display = text ? "" : "none";
		}
	}

	/**
	 * Shows a transient centred chip (values changed by shortcuts, the wheel or the radial adjust).
	 * @param text defines the text of the chip.
	 * @param durationMs defines how long the chip stays visible before fading.
	 */
	public showValueChip(text: string, durationMs: number = TERRAIN_HUD_VALUE_CHIP_DURATION_MS): void {
		if (this._disposed) {
			return;
		}

		this._valueChipText = text;

		if (this._valueChip) {
			this._valueChip.textContent = text;
			this._valueChip.style.display = "";
			this._valueChip.style.opacity = "1";
		}

		if (this._valueChipTimeout !== null) {
			clearTimeout(this._valueChipTimeout);
		}

		this._valueChipTimeout = setTimeout(() => {
			this._valueChipTimeout = null;
			this._valueChipText = null;

			if (this._valueChip) {
				this._valueChip.style.opacity = "0";
			}
		}, durationMs);
	}

	/**
	 * Shows a chip 16 px right of the pointer (refusal messages at LMB down).
	 * @param text defines the text of the chip.
	 * @param clientX defines the X client coordinate of the pointer (CSS px).
	 * @param clientY defines the Y client coordinate of the pointer (CSS px).
	 * @param durationMs defines how long the chip stays visible before fading.
	 */
	public showPointerChip(text: string, clientX: number, clientY: number, durationMs: number = TERRAIN_HUD_POINTER_CHIP_DURATION_MS): void {
		if (this._disposed) {
			return;
		}

		this._pointerChipText = text;

		if (this._pointerChip) {
			const origin = this._getPositionOrigin(this._pointerChip);

			this._pointerChip.textContent = text;
			this._pointerChip.style.left = `${Math.round(clientX - origin.left + TERRAIN_HUD_POINTER_CHIP_OFFSET_PX)}px`;
			this._pointerChip.style.top = `${Math.round(clientY - origin.top)}px`;
			this._pointerChip.style.display = "";
			this._pointerChip.style.opacity = "1";
		}

		if (this._pointerChipTimeout !== null) {
			clearTimeout(this._pointerChipTimeout);
		}

		this._pointerChipTimeout = setTimeout(() => {
			this._pointerChipTimeout = null;
			this._pointerChipText = null;

			if (this._pointerChip) {
				this._pointerChip.style.opacity = "0";
			}
		}, durationMs);
	}

	/** Hides both chips at once. */
	public hideChips(): void {
		this._clearTimeouts();

		this._valueChipText = null;
		this._pointerChipText = null;

		if (this._valueChip) {
			this._valueChip.style.opacity = "0";
		}

		if (this._pointerChip) {
			this._pointerChip.style.opacity = "0";
		}
	}

	/** Removes the HUD elements from the DOM. */
	public dispose(): void {
		if (this._disposed) {
			return;
		}

		this._disposed = true;
		this._clearTimeouts();

		for (const element of [this._line, this._valueChip, this._pointerChip]) {
			try {
				element?.parentNode?.removeChild(element);
			} catch (e) {
				// The container may already be detached.
			}
		}

		this._line = null;
		this._valueChip = null;
		this._pointerChip = null;

		this._lineText = null;
		this._valueChipText = null;
		this._pointerChipText = null;
	}

	private _createElement(ownerDocument: Document, className: string): HTMLDivElement {
		const element = ownerDocument.createElement("div");
		element.className = className;
		element.style.display = "none";
		element.style.zIndex = "10";

		this._container!.appendChild(element);
		return element;
	}

	/** Client rect origin of the element's positioned ancestor (absolute positioning is relative to it). */
	private _getPositionOrigin(element: HTMLElement): { left: number; top: number } {
		try {
			const reference = (element.offsetParent as HTMLElement | null) ?? this._container;
			const rect = reference?.getBoundingClientRect?.();
			return rect ? { left: rect.left, top: rect.top } : { left: 0, top: 0 };
		} catch (e) {
			return { left: 0, top: 0 };
		}
	}

	private _clearTimeouts(): void {
		if (this._valueChipTimeout !== null) {
			clearTimeout(this._valueChipTimeout);
			this._valueChipTimeout = null;
		}

		if (this._pointerChipTimeout !== null) {
			clearTimeout(this._pointerChipTimeout);
			this._pointerChipTimeout = null;
		}
	}
}

function roundTerrainHudValue(value: number, decimals: number): string {
	const factor = Math.pow(10, decimals);
	const rounded = Math.round(value * factor) / factor;

	// Avoids "-0".
	return (Object.is(rounded, -0) ? 0 : rounded).toFixed(decimals);
}
