/**
 * Defines how the curves are displayed: frames go to the right and values go up, each axis having its own zoom.
 */
export interface ICinematicEditorCurvesView {
	/**
	 * Pixels per frame.
	 */
	zoomX: number;
	/**
	 * Pixels per unit of value.
	 */
	zoomY: number;
	/**
	 * Horizontal position, in pixels, of the frame 0.
	 */
	panX: number;
	/**
	 * Vertical position, in pixels, of the value 0.
	 */
	panY: number;
}

export interface ICinematicEditorCurvesBounds {
	minFrame: number;
	maxFrame: number;
	minValue: number;
	maxValue: number;
}

export interface ICinematicEditorCurvesPadding {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

export const curvesMinZoomX = 0.02;
export const curvesMaxZoomX = 400;
export const curvesMinZoomY = 1e-6;
export const curvesMaxZoomY = 1e9;

export function frameToX(view: ICinematicEditorCurvesView, frame: number): number {
	return frame * view.zoomX + view.panX;
}

export function xToFrame(view: ICinematicEditorCurvesView, x: number): number {
	return (x - view.panX) / view.zoomX;
}

export function valueToY(view: ICinematicEditorCurvesView, value: number): number {
	return view.panY - value * view.zoomY;
}

export function yToValue(view: ICinematicEditorCurvesView, y: number): number {
	return (view.panY - y) / view.zoomY;
}

/**
 * Zooms the given view by the given factors on each axis, keeping the point under the given position at the same place.
 */
export function zoomCurvesView(view: ICinematicEditorCurvesView, x: number, y: number, factorX: number, factorY: number): ICinematicEditorCurvesView {
	const zoomX = clamp(view.zoomX * factorX, curvesMinZoomX, curvesMaxZoomX);
	const zoomY = clamp(view.zoomY * factorY, curvesMinZoomY, curvesMaxZoomY);

	const frame = xToFrame(view, x);
	const value = yToValue(view, y);

	return {
		zoomX,
		zoomY,
		panX: x - frame * zoomX,
		panY: y + value * zoomY,
	};
}

/**
 * Returns the view that shows the given bounds in an area of the given size, keeping the given padding around.
 * Bounds without extent (a single key, a flat curve) are given a sensible extent.
 */
export function fitCurvesView(bounds: ICinematicEditorCurvesBounds, width: number, height: number, padding: ICinematicEditorCurvesPadding): ICinematicEditorCurvesView {
	let { minFrame, maxFrame, minValue, maxValue } = bounds;

	if (maxFrame - minFrame < 1) {
		const center = (minFrame + maxFrame) * 0.5;
		minFrame = center - 30;
		maxFrame = center + 30;
	}

	const valueExtent = maxValue - minValue;
	const valueMagnitude = Math.max(Math.abs(minValue), Math.abs(maxValue));
	if (valueExtent <= Math.max(valueMagnitude, 1) * 1e-6) {
		const center = (minValue + maxValue) * 0.5;
		const half = Math.max(Math.abs(center) * 0.5, 0.5);
		minValue = center - half;
		maxValue = center + half;
	}

	const availableWidth = Math.max(1, width - padding.left - padding.right);
	const availableHeight = Math.max(1, height - padding.top - padding.bottom);

	const zoomX = clamp(availableWidth / (maxFrame - minFrame), curvesMinZoomX, curvesMaxZoomX);
	const zoomY = clamp(availableHeight / (maxValue - minValue), curvesMinZoomY, curvesMaxZoomY);

	return {
		zoomX,
		zoomY,
		panX: padding.left - minFrame * zoomX + (availableWidth - (maxFrame - minFrame) * zoomX) * 0.5,
		panY: padding.top + maxValue * zoomY + (availableHeight - (maxValue - minValue) * zoomY) * 0.5,
	};
}

/**
 * Interpolates between the given views. Zooms are interpolated in log space so the motion looks uniform.
 */
export function lerpCurvesView(from: ICinematicEditorCurvesView, to: ICinematicEditorCurvesView, amount: number, width: number, height: number): ICinematicEditorCurvesView {
	const zoomX = Math.exp(Math.log(from.zoomX) + (Math.log(to.zoomX) - Math.log(from.zoomX)) * amount);
	const zoomY = Math.exp(Math.log(from.zoomY) + (Math.log(to.zoomY) - Math.log(from.zoomY)) * amount);

	// Interpolate the frame and value at the center of the area so the motion doesn't drift.
	const fromFrame = xToFrame(from, width * 0.5);
	const toFrame = xToFrame(to, width * 0.5);
	const fromValue = yToValue(from, height * 0.5);
	const toValue = yToValue(to, height * 0.5);

	const frame = fromFrame + (toFrame - fromFrame) * amount;
	const value = fromValue + (toValue - fromValue) * amount;

	return {
		zoomX,
		zoomY,
		panX: width * 0.5 - frame * zoomX,
		panY: height * 0.5 + value * zoomY,
	};
}

/**
 * Returns a "nice" step (1, 2 or 5 times a power of 10) so that ticks are spaced by about the given amount of pixels.
 */
export function getCurvesTickStep(pixelsPerUnit: number, targetPixels: number, integer: boolean = false): number {
	const raw = targetPixels / Math.max(pixelsPerUnit, 1e-12);
	const power = Math.pow(10, Math.floor(Math.log10(raw)));
	const normalized = raw / power;

	const step = (normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10) * power;

	return integer ? Math.max(1, Math.round(step)) : step;
}

/**
 * Formats the given value with just enough decimals for the given step.
 */
export function formatCurvesValue(value: number, step: number): string {
	const decimals = Math.min(8, Math.max(0, -Math.floor(Math.log10(step) + 1e-9)));
	const text = value.toFixed(decimals);

	// Avoid "-0".
	return Number(text) === 0 ? (0).toFixed(decimals) : text;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
