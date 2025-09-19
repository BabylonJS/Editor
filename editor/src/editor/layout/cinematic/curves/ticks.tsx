import { Vector2 } from "babylonjs";
import { ReactNode } from "react";

export interface ICinemaaticEditorCurvesTicksProps {
	scale: number;
	width: number;
	height: number;

	translation: Vector2;
}

export function CinematicEditorCurvesTicks(props: ICinemaaticEditorCurvesTicksProps) {
	const result: ReactNode[] = [];

	const midHeight = (props.height * 0.5) >> 0;
	const margin = (50 / props.scale) >> 0;

	for (let x = -margin; x < props.width + margin; x += margin) {
		result.push(
			<line
				key={`tick-x-line-${x}`}
				className="stroke-border/50 pointer-events-none"
				x1={x}
				y1={midHeight - 5 / props.scale}
				x2={x}
				y2={midHeight + 5 / props.scale}
				strokeWidth={2 / props.scale}
			/>,
			<text
				key={`tick-x-text-${x}`}
				x={x}
				y={midHeight + 15 / props.scale}
				fontSize={14 / props.scale}
				className="fill-border/50 pointer-events-none"
				textAnchor="middle"
				alignmentBaseline="middle"
			>
				{x >> 0}
			</text>
		);
	}

	for (let y = midHeight - margin; y > -props.translation.y / props.scale; y -= margin) {
		result.push(
			<line
				key={`tick-y-line-${y}`}
				className="stroke-border/50 pointer-events-none"
				x1={-5 / props.scale}
				y1={y}
				x2={5 / props.scale}
				y2={y}
				strokeWidth={2 / props.scale}
			/>,
			<line
				key={`tick-y-line-${y}-line`}
				className="stroke-border/20 pointer-events-none"
				x1={(-props.translation.x - 5) / props.scale}
				y1={y}
				x2={`calc(${-props.translation.x / props.scale}px + 100% / ${props.scale})`}
				y2={y}
				strokeWidth={2 / props.scale}
			/>
		);
	}

	for (let y = midHeight + margin; y < (props.height - props.translation.y) / props.scale; y += margin) {
		result.push(
			<line
				key={`tick-y-line-${y}`}
				className="stroke-border/50 pointer-events-none"
				x1={-5 / props.scale}
				y1={y}
				x2={5 / props.scale}
				y2={y}
				strokeWidth={2 / props.scale}
			/>,
			<line
				key={`tick-y-line-${y}-line`}
				className="stroke-border/20 pointer-events-none"
				x1={(-props.translation.x - 5) / props.scale}
				y1={y}
				x2={`calc(${-props.translation.x / props.scale}px + 100% / ${props.scale})`}
				y2={y}
				strokeWidth={2 / props.scale}
			/>
		);
	}

	return result;
}
