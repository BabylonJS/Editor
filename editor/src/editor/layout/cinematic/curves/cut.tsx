import { ReactNode } from "react";

export interface ICinematicEditorCurvesCutProps {
	/**
	 * Position of the cut on the frames axis.
	 */
	x: number;
	/**
	 * Height of the graph: the line of the cut crosses all of it.
	 */
	height: number;
	/**
	 * Wether the cut key is selected.
	 */
	selected: boolean;
}

/**
 * Color of the cuts, the same as the cut keys in the timelines.
 */
export const cinematicCurvesCutColor = "#f97316";

/**
 * Draws a cut of the edited track: a line across the graph at the frame of the cut, tagged in the frames ruler. A cut
 * changes the shot, so it can be seen at a glance, even where the values don't jump. It stays discreet so it doesn't
 * hide the curves.
 */
export function CinematicEditorCurvesCut(props: ICinematicEditorCurvesCutProps): ReactNode {
	return (
		<g className="pointer-events-none select-none">
			<line
				x1={props.x}
				y1={15}
				x2={props.x}
				y2={props.height}
				stroke={cinematicCurvesCutColor}
				strokeOpacity={props.selected ? 0.6 : 0.3}
				strokeWidth={props.selected ? 1.5 : 1}
				strokeDasharray={props.selected ? undefined : "5 4"}
			/>
			<rect
				x={props.x - 15.5}
				y={1.5}
				width={31}
				height={13}
				rx={3}
				fill={cinematicCurvesCutColor}
				fillOpacity={props.selected ? 0.3 : 0.15}
				stroke={cinematicCurvesCutColor}
				strokeOpacity={props.selected ? 0.6 : 0.35}
			/>
			<text
				x={props.x}
				y={8}
				textAnchor="middle"
				dominantBaseline="central"
				fontSize={10}
				fontWeight={600}
				letterSpacing={0.5}
				fill={cinematicCurvesCutColor}
				fillOpacity={props.selected ? 1 : 0.75}
			>
				CUT
			</text>
		</g>
	);
}
