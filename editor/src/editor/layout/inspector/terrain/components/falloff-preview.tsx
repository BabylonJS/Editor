import { evaluateTerrainFalloff } from "../../../../../tools/terrain/core/falloff";
import { TerrainFalloff } from "../../../../../tools/terrain/core/types";

export interface ITerrainFalloffPreviewProps {
	falloff: TerrainFalloff;
	/** Hardness of the brush (0..0.95): the brush has its full strength up to this part of its radius. */
	hardness: number;
	className?: string;
}

/**
 * Profile of the brush: its strength across its diameter, from an edge to the other one. The dashed lines show where the full strength
 * of the brush starts and ends.
 */
export function TerrainFalloffPreview(props: ITerrainFalloffPreviewProps) {
	// The view box is 100 × 40: the profile is drawn from y = 38 (no strength) to y = 3 (full strength).
	const points: string[] = [];
	for (let x = 0; x <= 100; ++x) {
		const strength = evaluateTerrainFalloff(props.falloff, props.hardness, Math.abs(x / 50 - 1));
		points.push(`${x},${38 - strength * 35}`);
	}

	return (
		<svg viewBox="0 0 100 40" preserveAspectRatio="none" className={`${props.className} shrink-0 rounded-md bg-muted-foreground/10`}>
			<path d={`M0,38 L${points.join(" L")} L100,38 Z`} fill="currentColor" fillOpacity={0.15} />
			<polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

			{props.hardness > 0 &&
				[50 - props.hardness * 50, 50 + props.hardness * 50].map((x) => (
					<line key={x} x1={x} x2={x} y1={0} y2={40} stroke="currentColor" strokeOpacity={0.6} strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
				))}
		</svg>
	);
}
