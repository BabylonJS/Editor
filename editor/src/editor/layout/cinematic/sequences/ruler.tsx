import { ReactNode } from "react";

import { ICinematicSequenceLayout, formatCinematicTime, getCinematicSequencesPositionAt } from "./layout";

export interface ICinematicEditorSequencesRulerProps {
	layouts: ICinematicSequenceLayout[];

	scale: number;
	framesCount: number;
	framesPerSecond: number;
}

/**
 * Steps, in seconds, between two graduations of the ruler.
 */
const rulerSteps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];

/**
 * Minimum space, in pixels, between two graduations of the ruler.
 */
const rulerMinSpacing = 64;

/**
 * Draws the seconds of the cinematic above its sequences, where the sequences play them.
 */
export function CinematicEditorSequencesRuler(props: ICinematicEditorSequencesRulerProps): ReactNode {
	const framesPerSecond = props.framesPerSecond || 60;
	const step = rulerSteps.find((step) => step * framesPerSecond * props.scale >= rulerMinSpacing) ?? rulerSteps[rulerSteps.length - 1];

	const graduations: ReactNode[] = [];
	const count = Math.floor(props.framesCount / (step * framesPerSecond) + 1e-6);

	for (let i = 0; i <= count; ++i) {
		const frame = i * step * framesPerSecond;
		const x = getCinematicSequencesPositionAt(props.layouts, frame);

		graduations.push(
			<div key={i} className="absolute bottom-0 h-full" style={{ left: `${x}px` }}>
				<div className="absolute bottom-0 w-px h-2 bg-muted-foreground/60" />
				<div className="absolute bottom-2.5 left-1 text-[11px] leading-none text-muted-foreground whitespace-nowrap">
					{formatCinematicTime(frame, framesPerSecond, step < 1 ? 1 : 0)}
				</div>
			</div>
		);
	}

	return <div className="absolute top-0 left-2 right-0 h-10 border-b border-border/50 pointer-events-none select-none">{graduations}</div>;
}
