import * as React from "react";

import { Cinematic } from "../../../../editor/cinematic/cinematic";

export interface ITimeMeasureProps {
	/**
	 * Defines the reference to the cinematic.
	 */
	cinematic: Cinematic;
}

export interface ITimeMeasureState {
	/**
	 * Defines the value of the current zoom applied on the timeline.
	 */
	zoom: number;
	/**
	 * Defines the current width of the time measure bar.
	 */
	width: number;
	/**
	 * Defines the current with of the timelines panel.
	 */
	panelWidth: number;
	/**
	 * Defines the current value of the left scroll for the timeline.
	 */
	scrollLeft: number;
}

export class TimeMeasure extends React.Component<ITimeMeasureProps, ITimeMeasureState> {
	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: ITimeMeasureProps) {
		super(props);

		this.state = {
			zoom: 1,
			width: 2000,
			scrollLeft: 0,
			panelWidth: 2000,
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		const children: React.ReactNode[] = [];

		const step = (2 * this.state.width) / 50;
		const zoom = Math.floor(this.state.zoom);

		const minPosition = this.state.scrollLeft - 40;
		const maxPosition = this.state.panelWidth + this.state.scrollLeft;

		const framesCount = 1000 / this.props.cinematic.framesPerSecond;

		for (let i = 1; i < step; ++i) {
			const frame = Math.round(i * 60 / zoom);
			const position = frame * this.state.zoom;

			const time = `${(frame * framesCount / 1000).toFixed(2)}s`

			if (position < minPosition || position > maxPosition) {
				continue;
			}

			children.push(
				<span key={frame} style={{ position: "absolute", transform: "translate(-50%, -8px)", left: `${position}px`, userSelect: "none" }}>
					{frame}
					<span key={frame} style={{ color: "#333333", transform: "translate(-25%, -15px)", display: "block", userSelect: "none" }}>{time}</span>
				</span>
			);
		}

		return (
			<div style={{ width: "100%", height: "30px", lineHeight: "30px", position: "relative", backgroundColor: "steelblue", left: `-${this.state.scrollLeft}px` }}>
				{children}
			</div>
		);
	}
}
