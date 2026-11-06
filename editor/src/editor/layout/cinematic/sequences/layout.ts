import { ICinematicSequence, getCinematicSequenceFramesCount } from "babylonjs-editor-tools";

/**
 * Defines where a sequence is drawn in the list of the sequences of a cinematic.
 */
export interface ICinematicSequenceLayout {
	sequence: ICinematicSequence;

	/**
	 * Defines the frame, in the whole cinematic, where the sequence starts.
	 */
	startFrame: number;
	/**
	 * Defines the number of frames of the sequence.
	 */
	framesCount: number;

	/**
	 * Defines the position, in pixels, of the left of the sequence.
	 */
	x: number;
	/**
	 * Defines the width, in pixels, of the sequence.
	 */
	width: number;
}

/**
 * Minimum width, in pixels, of a sequence: short and empty sequences stay large enough to be read, grabbed and opened.
 */
export const cinematicSequenceMinWidth = 150;

/**
 * Returns where to draw the given sequences, one after the other: each sequence is as wide as its frames at the given
 * scale, or as the minimum width when it is shorter.
 * @param sequences defines the sequences to draw, in order.
 * @param scale defines the number of pixels of a frame.
 */
export function getCinematicSequencesLayout(sequences: ICinematicSequence[], scale: number): ICinematicSequenceLayout[] {
	let x = 0;
	let startFrame = 0;

	return sequences.map((sequence) => {
		const framesCount = getCinematicSequenceFramesCount(sequence);
		const layout = { sequence, startFrame, framesCount, x, width: Math.max(cinematicSequenceMinWidth, framesCount * scale) };

		x += layout.width;
		startFrame += framesCount;

		return layout;
	});
}

/**
 * Returns the width, in pixels, of all the given sequences.
 */
export function getCinematicSequencesWidth(layouts: ICinematicSequenceLayout[]): number {
	const last = layouts[layouts.length - 1];
	return last ? last.x + last.width : 0;
}

/**
 * Returns the position, in pixels, of the given frame of the cinematic: in the sequence that plays it. After the last
 * frame, the position is the end of the last sequence that has frames.
 * @param layouts defines the layout of the sequences.
 * @param frame defines the frame, in the whole cinematic, to get its position.
 */
export function getCinematicSequencesPositionAt(layouts: ICinematicSequenceLayout[], frame: number): number {
	let end = 0;

	for (const layout of layouts) {
		if (!layout.framesCount) {
			continue;
		}

		if (frame < layout.startFrame + layout.framesCount) {
			return layout.x + (Math.max(0, frame - layout.startFrame) / layout.framesCount) * layout.width;
		}

		end = layout.x + layout.width;
	}

	return end;
}

/**
 * Returns the frame, in the whole cinematic, at the given position.
 * @param layouts defines the layout of the sequences.
 * @param x defines the position, in pixels, to get its frame.
 */
export function getCinematicSequencesFrameAt(layouts: ICinematicSequenceLayout[], x: number): number {
	for (const layout of layouts) {
		if (x < layout.x + layout.width) {
			return layout.startFrame + (Math.max(0, x - layout.x) / layout.width) * layout.framesCount;
		}
	}

	const last = layouts[layouts.length - 1];
	return last ? last.startFrame + last.framesCount : 0;
}

/**
 * Returns the index, among the other sequences, where a dragged sequence is dropped: the sequences whose center is on
 * the left of the center of the dragged sequence stay before it.
 * @param others defines the layout of the sequences without the dragged one.
 * @param x defines the position, in pixels, of the left of the dragged sequence.
 * @param width defines the width, in pixels, of the dragged sequence.
 */
export function getCinematicSequenceDropIndex(others: ICinematicSequenceLayout[], x: number, width: number): number {
	const center = x + width * 0.5;
	return others.filter((layout) => layout.x + layout.width * 0.5 < center).length;
}

/**
 * Returns the given frame as a time in seconds, with minutes after a minute (ie. "4.5s", "1:02.0").
 * @param frame defines the frame to format.
 * @param framesPerSecond defines the number of frames per second of the cinematic.
 * @param decimals defines the number of decimals of the seconds.
 */
export function formatCinematicTime(frame: number, framesPerSecond: number, decimals: number = 1): string {
	const seconds = frame / (framesPerSecond || 60);
	const minutes = Math.floor(seconds / 60);

	if (!minutes) {
		return `${seconds.toFixed(decimals)}s`;
	}

	const rest = (seconds - minutes * 60).toFixed(decimals);
	return `${minutes}:${rest.padStart(decimals ? decimals + 3 : 2, "0")}`;
}
