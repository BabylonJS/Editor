import { ReactNode } from "react";

import { CinematicCurveComponent, CinematicCurveSide } from "./tools/keys";

export interface ICinematicEditorCurvePointProps {
	x: number;
	y: number;
	color: string;
	selected: boolean;

	keyIndex: number;
	component: CinematicCurveComponent;
	/**
	 * For cuts, the side of the cut the point is the value of. Null for regular keys.
	 */
	side: CinematicCurveSide | null;
}

/**
 * Radius, in pixels, of the area around a key that grabs it: larger than the drawn point so keys are easy to grab.
 * Sizes are given in CSS pixels, the editor is displayed at 80%.
 */
const pointHitRadius = 18;

/**
 * Draws a key on a curve. The point keeps the same size whatever the zoom and has a larger invisible area so it is easy to grab.
 * Keys are circles, the values before and after cuts too (the cut itself is drawn across the graph): diamonds are kept for
 * the tangents.
 */
export function CinematicEditorCurvePoint(props: ICinematicEditorCurvePointProps): ReactNode {
	const radius = props.selected ? 10 : 9;
	const fill = props.selected ? "#ffffff" : props.color;
	const stroke = props.selected ? "#f97316" : "hsl(var(--background))";
	const strokeWidth = props.selected ? 3 : 2;

	return (
		<g
			data-curve-target="point"
			data-key-index={props.keyIndex}
			data-component={props.component ?? "-"}
			data-side={props.side ?? ""}
			className="group"
			style={{ cursor: "grab" }}
		>
			<circle cx={props.x} cy={props.y} r={pointHitRadius} fill="transparent" />
			<circle
				cx={props.x}
				cy={props.y}
				r={radius}
				fill={fill}
				style={{ stroke }}
				strokeWidth={strokeWidth}
				className="pointer-events-none transition-[r] duration-100 group-hover:[r:11px]"
			/>
		</g>
	);
}
