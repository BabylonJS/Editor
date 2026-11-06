import { ReactNode } from "react";

import { formatCurvesValue, frameToX, getCurvesTickStep, ICinematicEditorCurvesView, valueToY, xToFrame, yToValue } from "./tools/view";

export interface ICinematicEditorCurvesGridProps {
	view: ICinematicEditorCurvesView;
	width: number;
	height: number;
	/**
	 * Height of the band on top of the graph where frames are written and where the time is scrubbed.
	 */
	rulerHeight: number;
}

const maxLines = 400;

/**
 * Draws the grid of the curves editor: vertical lines on frames, horizontal lines on values, the frames ruler on top and
 * the values on the left. Steps adapt to the zoom of each axis so lines are always about evenly spaced on screen.
 */
export function CinematicEditorCurvesGrid(props: ICinematicEditorCurvesGridProps): ReactNode {
	const { view, width, height, rulerHeight } = props;

	const result: ReactNode[] = [];

	// Frames
	const frameStep = getCurvesTickStep(view.zoomX, 90, true);
	const firstFrame = Math.ceil(xToFrame(view, 0) / frameStep);
	const lastFrame = Math.floor(xToFrame(view, width) / frameStep);

	for (let i = firstFrame; i <= lastFrame && i - firstFrame < maxLines; ++i) {
		const frame = i * frameStep;
		const x = frameToX(view, frame);

		result.push(
			<line
				key={`frame-line-${frame}`}
				x1={x}
				y1={rulerHeight}
				x2={x}
				y2={height}
				style={{ stroke: frame === 0 ? "hsl(var(--muted-foreground) / 0.45)" : "hsl(var(--border) / 0.55)" }}
				strokeWidth={1}
			/>,
			<line key={`frame-tick-${frame}`} x1={x} y1={rulerHeight - 6} x2={x} y2={rulerHeight} style={{ stroke: "hsl(var(--muted-foreground) / 0.6)" }} strokeWidth={1} />,
			<text key={`frame-text-${frame}`} x={x + 3} y={rulerHeight - 9} fontSize={10} style={{ fill: "hsl(var(--muted-foreground))" }}>
				{frame}
			</text>
		);
	}

	// Values
	const valueStep = getCurvesTickStep(view.zoomY, 56);
	const firstValue = Math.ceil(yToValue(view, height) / valueStep);
	const lastValue = Math.floor(yToValue(view, rulerHeight) / valueStep);

	for (let i = firstValue; i <= lastValue && i - firstValue < maxLines; ++i) {
		const value = i * valueStep;
		const y = valueToY(view, value);

		result.push(
			<line
				key={`value-line-${i}`}
				x1={0}
				y1={y}
				x2={width}
				y2={y}
				style={{ stroke: i === 0 ? "hsl(var(--muted-foreground) / 0.45)" : "hsl(var(--border) / 0.55)" }}
				strokeWidth={1}
			/>,
			<text
				key={`value-text-${i}`}
				x={4}
				y={y - 3}
				fontSize={10}
				style={{ fill: "hsl(var(--muted-foreground))", stroke: "hsl(var(--background))", strokeWidth: 3, paintOrder: "stroke" }}
			>
				{formatCurvesValue(value, valueStep)}
			</text>
		);
	}

	return (
		<g className="pointer-events-none select-none">
			<rect x={0} y={0} width={width} height={rulerHeight} style={{ fill: "hsl(var(--background) / 0.85)" }} />
			<line x1={0} y1={rulerHeight} x2={width} y2={rulerHeight} style={{ stroke: "hsl(var(--border))" }} strokeWidth={1} />
			{result}
		</g>
	);
}
