import { evaluateTerrainFalloff } from "../../../../../tools/terrain/core/falloff";
import type { TerrainFalloff } from "../../../../../tools/terrain/core/types";

/** Width of the SVG view box of the falloff preview (§1.8). */
export const TERRAIN_FALLOFF_PREVIEW_WIDTH = 100;
/** Height of the SVG view box of the falloff preview (§1.8). */
export const TERRAIN_FALLOFF_PREVIEW_HEIGHT = 40;
/** Number of segments of the profile polyline (one per view box unit). */
export const TERRAIN_FALLOFF_PREVIEW_SEGMENTS = 100;

/** Vertical margins of the curve in the view box: f = 1 is drawn at y = TOP, f = 0 at y = HEIGHT - BOTTOM. */
const TERRAIN_FALLOFF_PREVIEW_TOP = 3;
const TERRAIN_FALLOFF_PREVIEW_BOTTOM = 2;

/** Maximum hardness of the brush (§1.8): the falloff always keeps at least 5 % of the radius to fade out. */
const TERRAIN_FALLOFF_PREVIEW_MAX_HARDNESS = 0.95;

export interface ITerrainFalloffPreviewGeometry {
	/** Points of the profile polyline ("x,y x,y ..."), the brush centre at x = 50, the edges at x = 0 and x = 100. */
	points: string;
	/** Closed path of the area under the profile. */
	area: string;
	/** X of the two hardness markers (centre ± hardness × 50), null when the hardness is 0 (no plateau). */
	hardnessMarkers: [number, number] | null;
}

function roundTerrainPreviewCoordinate(value: number): number {
	return Math.round(value * 100) / 100;
}

/**
 * Geometry of the falloff preview (pure, §1.8): the symmetric profile f(|d|) of the brush across its diameter (d from -1 at the left
 * edge to +1 at the right edge, f from evaluateTerrainFalloff) in a 100 × 40 view box, and the dashed hardness markers.
 * @param falloff defines the falloff curve.
 * @param hardness defines the hardness (0..0.95; clamped).
 */
export function computeTerrainFalloffPreviewGeometry(falloff: TerrainFalloff, hardness: number): ITerrainFalloffPreviewGeometry {
	const k = Number.isFinite(hardness) ? Math.min(TERRAIN_FALLOFF_PREVIEW_MAX_HARDNESS, Math.max(0, hardness)) : 0;
	const drawableHeight = TERRAIN_FALLOFF_PREVIEW_HEIGHT - TERRAIN_FALLOFF_PREVIEW_TOP - TERRAIN_FALLOFF_PREVIEW_BOTTOM;
	const baseline = TERRAIN_FALLOFF_PREVIEW_HEIGHT - TERRAIN_FALLOFF_PREVIEW_BOTTOM;

	const points: string[] = [];
	for (let i = 0; i <= TERRAIN_FALLOFF_PREVIEW_SEGMENTS; ++i) {
		const x = (i / TERRAIN_FALLOFF_PREVIEW_SEGMENTS) * TERRAIN_FALLOFF_PREVIEW_WIDTH;
		const d = Math.abs((2 * i) / TERRAIN_FALLOFF_PREVIEW_SEGMENTS - 1);

		// d = 1 exactly at both ends: f = 0 there, whatever the curve ("constant" included).
		const f = evaluateTerrainFalloff(falloff, k, d);
		const y = baseline - Math.min(1, Math.max(0, Number.isFinite(f) ? f : 0)) * drawableHeight;

		points.push(`${roundTerrainPreviewCoordinate(x)},${roundTerrainPreviewCoordinate(y)}`);
	}

	const center = TERRAIN_FALLOFF_PREVIEW_WIDTH / 2;
	const offset = k * center;

	return {
		points: points.join(" "),
		area: `M0,${baseline} L${points.join(" L")} L${TERRAIN_FALLOFF_PREVIEW_WIDTH},${baseline} Z`,
		hardnessMarkers: k > 0 ? [roundTerrainPreviewCoordinate(center - offset), roundTerrainPreviewCoordinate(center + offset)] : null,
	};
}

export interface ITerrainFalloffPreviewProps {
	/** Falloff curve of the brush. */
	falloff: TerrainFalloff;
	/** Hardness of the brush (0..0.95): full strength inside hardness × radius. */
	hardness: number;
	/** Classes of the SVG element (size); default "w-[100px] h-10". */
	className?: string;
}

/**
 * Brush falloff profile of the Brush section (§1.8, `falloff-preview.tsx`): a 100 × 40 view box polyline of f(d) across the brush diameter
 * with dashed markers at ± hardness × radius (the plateau of full strength).
 */
export function TerrainFalloffPreview(props: ITerrainFalloffPreviewProps): JSX.Element {
	const geometry = computeTerrainFalloffPreviewGeometry(props.falloff, props.hardness);

	return (
		<svg
			viewBox={`0 0 ${TERRAIN_FALLOFF_PREVIEW_WIDTH} ${TERRAIN_FALLOFF_PREVIEW_HEIGHT}`}
			preserveAspectRatio="none"
			role="img"
			aria-label={`Falloff ${props.falloff}, hardness ${Math.round(Math.min(TERRAIN_FALLOFF_PREVIEW_MAX_HARDNESS, Math.max(0, props.hardness || 0)) * 100)} %`}
			className={`${props.className ?? "w-[100px] h-10"} shrink-0 rounded-md bg-muted-foreground/10 text-foreground`}
		>
			<path d={geometry.area} fill="currentColor" fillOpacity={0.15} stroke="none" />
			<polyline points={geometry.points} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

			{geometry.hardnessMarkers?.map((x, index) => (
				<line
					key={`hardness-${index}`}
					x1={x}
					x2={x}
					y1={0}
					y2={TERRAIN_FALLOFF_PREVIEW_HEIGHT}
					stroke="currentColor"
					strokeOpacity={0.6}
					strokeWidth={1}
					strokeDasharray="3 2"
					vectorEffect="non-scaling-stroke"
				/>
			))}
		</svg>
	);
}
