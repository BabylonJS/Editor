import type { ITerrainRect, TerrainRectsByKind, TerrainResourceKind } from "./types";

/**
 * Inclusive integer rectangles (§3.3 `ITerrainRect`).
 * Every helper returns a NEW object and never mutates its arguments. Empty results are always the canonical empty rect
 * `{ x0: 0, y0: 0, x1: -1, y1: -1 }`, so callers can compare or serialize them without surprises.
 */

const RESOURCE_KINDS: readonly TerrainResourceKind[] = ["heights", "holes", "weights0", "weights1"];

/** { x0: 0, y0: 0, x1: -1, y1: -1 } */
export function createEmptyTerrainRect(): ITerrainRect {
	return { x0: 0, y0: 0, x1: -1, y1: -1 };
}

/** True for null/undefined, for x1 < x0 or y1 < y0, and for rects holding NaN coordinates. */
export function isTerrainRectEmpty(rect: ITerrainRect | null | undefined): boolean {
	if (!rect) {
		return true;
	}

	return !(rect.x1 >= rect.x0 && rect.y1 >= rect.y0);
}

/** Smallest rect containing both; an empty `a` (or null) gives a copy of `b`. */
export function unionTerrainRect(a: ITerrainRect | null | undefined, b: ITerrainRect): ITerrainRect {
	const aEmpty = isTerrainRectEmpty(a);
	const bEmpty = isTerrainRectEmpty(b);

	if (aEmpty && bEmpty) {
		return createEmptyTerrainRect();
	}

	if (aEmpty) {
		return { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
	}

	const first = a as ITerrainRect;
	if (bEmpty) {
		return { x0: first.x0, y0: first.y0, x1: first.x1, y1: first.y1 };
	}

	return {
		x0: Math.min(first.x0, b.x0),
		y0: Math.min(first.y0, b.y0),
		x1: Math.max(first.x1, b.x1),
		y1: Math.max(first.y1, b.y1),
	};
}

export function intersectTerrainRect(a: ITerrainRect, b: ITerrainRect): ITerrainRect {
	if (isTerrainRectEmpty(a) || isTerrainRectEmpty(b)) {
		return createEmptyTerrainRect();
	}

	const result: ITerrainRect = {
		x0: Math.max(a.x0, b.x0),
		y0: Math.max(a.y0, b.y0),
		x1: Math.min(a.x1, b.x1),
		y1: Math.min(a.y1, b.y1),
	};

	return isTerrainRectEmpty(result) ? createEmptyTerrainRect() : result;
}

/** Expands by `by` elements then clamps to [0, width - 1] x [0, height - 1]. */
export function expandTerrainRect(rect: ITerrainRect, by: number, width: number, height: number): ITerrainRect {
	if (isTerrainRectEmpty(rect)) {
		return createEmptyTerrainRect();
	}

	return clampTerrainRect(
		{
			x0: rect.x0 - by,
			y0: rect.y0 - by,
			x1: rect.x1 + by,
			y1: rect.y1 + by,
		},
		width,
		height
	);
}

/** Intersection with [0, width - 1] x [0, height - 1]. */
export function clampTerrainRect(rect: ITerrainRect, width: number, height: number): ITerrainRect {
	if (isTerrainRectEmpty(rect) || !(width >= 1) || !(height >= 1)) {
		return createEmptyTerrainRect();
	}

	const result: ITerrainRect = {
		x0: Math.max(rect.x0, 0),
		y0: Math.max(rect.y0, 0),
		x1: Math.min(rect.x1, width - 1),
		y1: Math.min(rect.y1, height - 1),
	};

	return isTerrainRectEmpty(result) ? createEmptyTerrainRect() : result;
}

/** Per-kind union; kinds whose union is empty are omitted from the result. */
export function unionTerrainRects(a: TerrainRectsByKind, b: TerrainRectsByKind): TerrainRectsByKind {
	const result: TerrainRectsByKind = {};

	for (const kind of RESOURCE_KINDS) {
		const first = a[kind];
		const second = b[kind];

		let union: ITerrainRect | null = null;
		if (second) {
			union = unionTerrainRect(first, second);
		} else if (first) {
			union = unionTerrainRect(null, first);
		}

		if (union && !isTerrainRectEmpty(union)) {
			result[kind] = union;
		}
	}

	return result;
}
