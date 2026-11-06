import { ReactNode } from "react";

import { CinematicCurveComponent, CinematicCurveSide } from "./tools/keys";

export interface ICinematicEditorCurveHandleProps {
	/**
	 * Position of the key the handle belongs to.
	 */
	x: number;
	y: number;
	/**
	 * Position of the tip of the handle.
	 */
	tipX: number;
	tipY: number;

	color: string;

	keyIndex: number;
	component: CinematicCurveComponent;
	side: CinematicCurveSide;

	/**
	 * Wether the segment on that side is interpolated with tangents. When it's not, the handle shows the slope of the
	 * straight segment and dragging it creates the tangents.
	 */
	defined: boolean;
	/**
	 * Wether the in and out tangents of the key are linked.
	 */
	linked: boolean;
}

/**
 * Radius, in pixels, of the area around the tip of a handle that grabs it: larger than the drawn tip so handles are easy to grab.
 * Sizes are given in CSS pixels, the editor is displayed at 80%.
 */
const handleHitRadius = 15;
/**
 * Distance, in pixels, from the center of the drawn tip of a handle to its corners.
 */
const handleTipSize = 8;

/**
 * Draws a tangent handle of a selected key. Handles keep the same length on screen and rotate around their key: the
 * direction of the handle is the slope of the curve on that side of the key. Tips are hollow diamonds to tell them from
 * keys (circles), orange when the tangents of the key are broken.
 */
export function CinematicEditorCurveHandle(props: ICinematicEditorCurveHandleProps): ReactNode {
	const color = props.linked ? props.color : "#f59e0b";

	return (
		<g>
			<line
				x1={props.x}
				y1={props.y}
				x2={props.tipX}
				y2={props.tipY}
				stroke={color}
				strokeOpacity={props.defined ? 0.9 : 0.6}
				strokeWidth={2}
				strokeDasharray={props.defined ? undefined : "4 3"}
				className="pointer-events-none"
			/>
			<g
				data-curve-target="handle"
				data-key-index={props.keyIndex}
				data-component={props.component ?? "-"}
				data-side={props.side}
				className="group"
				style={{ cursor: "grab" }}
			>
				<circle cx={props.tipX} cy={props.tipY} r={handleHitRadius} fill="transparent" />
				<polygon
					points={getDiamondPoints(props.tipX, props.tipY, handleTipSize)}
					strokeWidth={2}
					strokeLinejoin="round"
					className="pointer-events-none transition-transform duration-100 group-hover:scale-125"
					style={{ fill: "hsl(var(--background))", stroke: color, transformBox: "fill-box", transformOrigin: "center" }}
				/>
			</g>
		</g>
	);
}

function getDiamondPoints(x: number, y: number, size: number): string {
	return `${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`;
}
