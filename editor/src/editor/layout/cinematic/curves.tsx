import { Component, MouseEvent, PointerEvent, ReactNode, WheelEvent } from "react";

import { Vector2 } from "babylonjs";
import { isCinematicKey } from "babylonjs-editor-tools";

import { CinematicEditor } from "./editor";

import { isDomElementDescendantOf } from "../../../tools/dom";

import { getKeyFrame } from "./timelines/tools";

import { CinematicEditorCurvePoint } from "./curves/point";
import { CinematicEditorCurveHandle } from "./curves/handle";
import { convertKeysToBezier, screenToSvg, valueToSVGY } from "./curves/tools";

export interface ICinematicEditorCurvesProps {
	scale: number;
	currentTime: number;

	cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorCurvesState {
	panning: boolean;
	translation: Vector2;
}

export class CinematicEditorCurves extends Component<ICinematicEditorCurvesProps, ICinematicEditorCurvesState> {
	private _rootSvgRef: SVGSVGElement | null = null;
	private _divRef: HTMLDivElement | null = null;

	private _panStart: Vector2 = Vector2.Zero();

	public constructor(props: ICinematicEditorCurvesProps) {
		super(props);

		this.state = {
			panning: false,
			translation: Vector2.Zero(),
		};
	}

	public render(): ReactNode {
		const width = this.props.cinematicEditor.timelines?.getMaxWidthForTimelines();

		return (
			<div
				ref={(r) => (this._divRef = r)}
				className={`
                    relative flex flex-col flex-1 w-full min-h-fit h-full overflow-x-auto overflow-y-hidden
                    ${this.props.cinematicEditor.state.editType !== "curves" ? "hidden pointer-events-none" : ""}
                `}
				onMouseDown={(ev) => this._handleMainDivPointerDown(ev)}
			>
				<div
					className="relative min-w-full h-10 mx-2 py-2 border-b border-b-border/50"
					style={{
						width: `${width}px`,
					}}
				/>

				<div
					className="absolute top-1/2 left-0 min-w-full h-[2px] px-2 bg-border/50"
					style={{
						width: `${width}px`,
					}}
				/>

				<svg
					ref={(r) => (this._rootSvgRef = r)}
					className="flex flex-1 mx-2 py-2 min-w-full"
					style={{
						width: `${width}px`,
					}}
					onWheel={(ev) => this._handleSVGWheel(ev)}
					onPointerDownCapture={(ev) => this._handleSVGPointerDown(ev)}
					onPointerMove={(ev) => this._handleSVGPointerMove(ev)}
					onPointerUp={(ev) => this._handleSVGPointerUp(ev)}
				>
					<g transform={`translate(${this.state.translation.x} ${this.state.translation.y}) scale(${this.props.scale})`}>{this._getData()}</g>
				</svg>

				<div
					className="absolute w-[1px] ml-2 mt-10 bg-muted h-full pointer-events-none"
					style={{
						left: `${this.props.currentTime * this.props.scale}px`,
					}}
				>
					<div
						className="absolute w-7 h-7 rotate-45 -translate-x-1/2 -translate-y-8 bg-muted"
						style={{
							mask: "linear-gradient(135deg, transparent 0%, transparent 50%, black 50%, black 100%)",
						}}
					/>
				</div>
			</div>
		);
	}

	private _handleSVGPointerDown(event: PointerEvent<SVGElement>): void {
		if (event.target !== this._rootSvgRef) {
			return;
		}

		this._rootSvgRef.setPointerCapture(event.pointerId);

		this.setState({
			panning: true,
		});

		const p = screenToSvg(this._rootSvgRef, event.clientX, event.clientY);
		this._panStart.set(p.x - this.state.translation.x, p.y - this.state.translation.y);
	}

	private _handleSVGPointerMove(event: PointerEvent<SVGElement>): void {
		if (!this.state.panning || !this._rootSvgRef) {
			return;
		}

		const p = screenToSvg(this._rootSvgRef, event.clientX, event.clientY);
		this.setState({
			translation: new Vector2(p.x - this._panStart.x, p.y - this._panStart.y),
		});
	}

	private _handleSVGPointerUp(event: PointerEvent<SVGElement>): void {
		if (!this._rootSvgRef) {
			return;
		}

		this._rootSvgRef.releasePointerCapture(event.pointerId);
		this.setState({
			panning: false,
		});
	}

	private _handleSVGWheel(event: WheelEvent<SVGElement>): void {
		const p = screenToSvg(this._rootSvgRef!, event.clientX, event.clientY);

		const zoomFactor = event.deltaY < 0 ? 1.12 : 0.88;
		const scale = this.props.scale * zoomFactor;
		const minScale = 0.1;
		const maxScale = 20;

		if (scale < minScale || scale > maxScale) {
			return;
		}

		const contentX = (p.x - this.state.translation.x) / this.props.scale;
		const contentY = (p.y - this.state.translation.y) / this.props.scale;

		const translation = this.state.translation.clone();

		translation.x = p.x - contentX * scale;
		translation.y = p.y - contentY * scale;

		this.setState({
			translation,
		});

		this.props.cinematicEditor.setState({
			scale,
		});
	}

	private _handleMainDivPointerDown(event: MouseEvent<HTMLDivElement>): void {
		if (event.button !== 0 || !isDomElementDescendantOf(event.nativeEvent.target as HTMLElement, this._divRef!)) {
			return;
		}

		document.body.style.cursor = "ew-resize";

		let mouseUpListener: (event: globalThis.MouseEvent) => void;
		let mouseMoveListener: (event: globalThis.MouseEvent) => void;

		let moving = false;
		let clientX: number | null = null;

		const startPosition = event.nativeEvent.offsetX / this.props.scale;

		this.props.cinematicEditor.createTemporaryAnimationGroup();
		this.props.cinematicEditor.setCurrentTime(startPosition);

		document.body.addEventListener(
			"mousemove",
			(mouseMoveListener = (ev) => {
				if (clientX === null) {
					clientX = ev.clientX;
				}

				const delta = clientX - ev.clientX;
				if (moving || Math.abs(delta) > 5 * devicePixelRatio) {
					moving = true;
				} else {
					return;
				}

				const currentTime = Math.round(Math.max(0, startPosition - delta / this.props.scale));

				this.props.cinematicEditor.setCurrentTime(currentTime);
			})
		);

		document.body.addEventListener(
			"mouseup",
			(mouseUpListener = (ev) => {
				ev.stopPropagation();

				document.body.style.cursor = "auto";

				document.body.removeEventListener("mouseup", mouseUpListener);
				document.body.removeEventListener("mousemove", mouseMoveListener);

				this.props.cinematicEditor.disposeTemporaryAnimationGroup();
			})
		);
	}

	private _getData(): ReactNode[] {
		const result: ReactNode[] = [];
		const keyFrameAnimations = this.props.cinematicEditor.tracks?.state.selectedTrack?.keyFrameAnimations;

		if (!this._rootSvgRef || !keyFrameAnimations || (keyFrameAnimations?.length ?? 0) < 2) {
			return result;
		}

		const bb = this._rootSvgRef.getBoundingClientRect();

		for (let i = 0, len = keyFrameAnimations.length; i < len; ++i) {
			const key = keyFrameAnimations[i];
			const nextKey = keyFrameAnimations[i + 1];

			if (!nextKey) {
				break;
			}

			const nextFrame = getKeyFrame(nextKey);

			if (isCinematicKey(key) && isCinematicKey(nextKey)) {
				// Create curve
				const { p0, p1, c1, c2 } = convertKeysToBezier({
					frame1: key.frame * this.props.scale,
					frame2: nextFrame * this.props.scale,
					value1: key.value,
					value2: nextKey.value,
					inTangent: nextKey.inTangent ?? 0,
					outTangent: key.outTangent ?? 0,
				});

				const d = `
                        M ${p0[0]},${valueToSVGY(p0[1], 1, bb.height)} 
                        C ${c1[0]},${valueToSVGY(c1[1], 1, bb.height)} 
                        ${c2[0]},${valueToSVGY(c2[1], 1, bb.height)} 
                        ${p1[0]},${valueToSVGY(p1[1], 1, bb.height)}
                    `;

				result.push(<path key={`curve-${i}`} d={d} fill="none" stroke="gray" strokeWidth={2 / this.props.scale} />);

				// Create lines
				result.push(
					<line
						key={`line-${i}-1`}
						x1={p0[0]}
						y1={valueToSVGY(p0[1], 1, bb.height)}
						x2={c1[0]}
						y2={valueToSVGY(c1[1], 1, bb.height)}
						className="stroke-primary/50"
						strokeWidth={2 / this.props.scale}
						strokeDasharray={4}
					/>
				);
				result.push(
					<line
						key={`line-${i}-2`}
						x1={c2[0]}
						y1={valueToSVGY(c2[1], 1, bb.height)}
						x2={p1[0]}
						y2={valueToSVGY(p1[1], 1, bb.height)}
						className="stroke-primary/50"
						strokeWidth={2 / this.props.scale}
						strokeDasharray={4}
					/>
				);

				// Create points
				result.push(
					<CinematicEditorCurvePoint
						key={`point-${i}-1`}
						cx={p0[0]}
						cy={valueToSVGY(p0[1], 1, bb.height)}
						scale={this.props.scale}
						height={bb.height}
						cinematicEditor={this.props.cinematicEditor}
						cinematicKey={key}
					/>
				);
				result.push(
					<CinematicEditorCurvePoint
						key={`point-${i}-2`}
						cx={p1[0]}
						cy={valueToSVGY(p1[1], 1, bb.height)}
						scale={this.props.scale}
						height={bb.height}
						cinematicEditor={this.props.cinematicEditor}
						cinematicKey={nextKey}
					/>
				);

				// Create handles
				result.push(
					<CinematicEditorCurveHandle
						key={`handle-${i}-1`}
						c1={[c1[0], valueToSVGY(c1[1], 1, bb.height)]}
						c2={[c2[0], valueToSVGY(c2[1], 1, bb.height)]}
						scale={this.props.scale}
						height={bb.height}
						tangentType="out"
						cinematicKey={key}
						nextCinematicKey={nextKey}
						cinematicEditor={this.props.cinematicEditor}
					/>
				);
				result.push(
					<CinematicEditorCurveHandle
						key={`handle-${i}-2`}
						c1={[c1[0], valueToSVGY(c1[1], 1, bb.height)]}
						c2={[c2[0], valueToSVGY(c2[1], 1, bb.height)]}
						scale={this.props.scale}
						height={bb.height}
						tangentType="in"
						cinematicKey={key}
						nextCinematicKey={nextKey}
						cinematicEditor={this.props.cinematicEditor}
					/>
				);
			}
		}

		return result;
	}
}
