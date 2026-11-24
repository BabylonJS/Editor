import { Component, ReactNode } from "react";

export interface ICinematicEditorTrackerProps {
	scale: number;
	currentTime: number;
	translationX?: number;
	/**
	 * Returns the position, in pixels, of the given time when the frames are not drawn at the same scale everywhere.
	 */
	getPosition?: (time: number) => number;
	/**
	 * Defines the classes giving the color of the line of the tracker.
	 * @default "bg-muted"
	 */
	lineClassName?: string;
}

export class CinematicEditorTracker extends Component<ICinematicEditorTrackerProps> {
	private _forcedCurrentTime: number | null = null;

	public render(): ReactNode {
		const currentTime = this._forcedCurrentTime ?? this.props.currentTime;
		const position = this.props.getPosition?.(currentTime) ?? currentTime * this.props.scale + (this.props.translationX ?? 0);

		return (
			<div
				style={{
					left: `${position}px`,
				}}
				className={`absolute w-[1px] ml-2 mt-10 h-full pointer-events-none ${this.props.lineClassName ?? "bg-muted"}`}
			>
				<div
					className="absolute w-7 h-7 rotate-45 -translate-x-1/2 -translate-y-8 bg-muted"
					style={{
						mask: "linear-gradient(135deg, transparent 0%, transparent 50%, black 50%, black 100%)",
					}}
				/>
			</div>
		);
	}

	public setForcedCurrentTime(time: number | null): void {
		this._forcedCurrentTime = time;
		this.forceUpdate();
	}
}
