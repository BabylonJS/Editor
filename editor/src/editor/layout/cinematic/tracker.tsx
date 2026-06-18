import { Component, ReactNode } from "react";

export interface ICinematicEditorTrackerProps {
	scale: number;
	currentTime: number;
	translationX?: number;
}

export class CinematicEditorTracker extends Component<ICinematicEditorTrackerProps> {
	private _forcedCurrentTime: number | null = null;

	public render(): ReactNode {
		const currentTime = this._forcedCurrentTime ?? this.props.currentTime;

		return (
			<div
				style={{
					left: `${currentTime * this.props.scale + (this.props.translationX ?? 0)}px`,
				}}
				className="absolute w-[1px] ml-2 mt-10 bg-muted h-full pointer-events-none"
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
