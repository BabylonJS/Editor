import { Component, PointerEvent, ReactNode, WheelEvent } from "react";

import { Vector2, IAnimationKey } from "babylonjs";
import { ICinematicTrack, isCinematicKeyCut } from "babylonjs-editor-tools";

import { Switch } from "../../../../ui/shadcn/ui/switch";

import { CinematicEditor } from "../editor";

import { screenToSvg } from "./tools/tools";
import { getEditableProperties, getEditablePropertyValue } from "./tools/property";

import { CinematicEditorCurvesTicks } from "./ticks";
import { CinematicEditorPropertyCurve } from "./curve";

export interface ICinematicEditorCurvesRootProps {
	scale: number;
	translation: Vector2;

	cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorCurvesRootState {
	panning: boolean;
}

const trackColors = ["bg-red-500", "bg-green-500", "bg-blue-500", "bg-primary"];
const curveColors = ["stroke-red-500/50", "stroke-green-500/50", "stroke-blue-500/50", "stroke-primary/50"];

interface _IEditableProperty {
	property: string;
	editable: boolean;
}

export class CinematicEditorCurvesRoot extends Component<ICinematicEditorCurvesRootProps, ICinematicEditorCurvesRootState> {
	private _rootSvgRef: SVGSVGElement | null = null;

	private _yScale: number = 1;
	private _panStart: Vector2 = Vector2.Zero();

	private _oldTrack: ICinematicTrack | null = null;

	private _editableTracks: _IEditableProperty[] = [
		{ property: "x", editable: true },
		{ property: "y", editable: true },
		{ property: "z", editable: true },
		{ property: "w", editable: true },

		{ property: "r", editable: true },
		{ property: "g", editable: true },
		{ property: "b", editable: true },
		{ property: "a", editable: true },
	];

	public constructor(props: ICinematicEditorCurvesRootProps) {
		super(props);

		this.state = {
			panning: false,
		};
	}

	public render(): React.ReactNode {
		const width = this.props.cinematicEditor.timelines?.getMaxWidthForTimelines() / this.props.scale;
		const height = this._rootSvgRef?.getBoundingClientRect().height ?? 0;

		const track = this.props.cinematicEditor.state.selectedTrack;
		const firstKey = track?.keyFrameAnimations?.[0];

		let firstValue: any;
		if (firstKey) {
			firstValue = isCinematicKeyCut(firstKey) ? firstKey.key1.value : firstKey.value;
		}

		this._computeYScale(height);

		return (
			<div className="relative w-full h-full">
				<svg
					ref={(r) => (this._rootSvgRef = r)}
					className="flex flex-1 mx-2 py-2 min-w-full h-full"
					style={{
						width: `${width}px`,
					}}
					onWheel={(ev) => this._handleWheel(ev)}
					onPointerDown={(ev) => this._handlePointerDown(ev)}
					onPointerMove={(ev) => this._handlePointerMove(ev)}
					onPointerUp={(ev) => this._handlePointerUp(ev)}
				>
					<g transform={`translate(${this.props.translation.x} ${this.props.translation.y}) scale(${this.props.scale})`}>
						<line
							x1={-this.props.translation.x / this.props.scale}
							y1={height * 0.5}
							x2={`calc(${-this.props.translation.x / this.props.scale}px + 100% / ${this.props.scale})`}
							y2={height * 0.5}
							className="stroke-border/50"
							strokeWidth={1 / this.props.scale}
						/>
						<line
							x1={0}
							y1={-this.props.translation.y / this.props.scale}
							x2={0}
							y2={`calc(${-this.props.translation.y}px + 100% / ${this.props.scale})`}
							className="stroke-border/50"
							strokeWidth={1 / this.props.scale}
						/>

						<CinematicEditorCurvesTicks width={width} height={height} scale={this.props.scale} translation={this.props.translation} />
						{this._getCurves(height)}
					</g>
				</svg>

				<div className="absolute bottom-0 right-0 flex gap-2 p-2" onMouseDownCapture={(e) => e.stopPropagation()}>
					{this._editableTracks
						.filter((editableProperty) => firstValue?.[editableProperty.property] !== undefined)
						.map((editableProperty, index) => {
							return (
								<div
									onClick={() => {
										editableProperty.editable = !editableProperty.editable;
										this.forceUpdate();
									}}
									className={`
										flex items-center gap-2 px-2 py-1 rounded-lg ${trackColors[index]} text-white/75 cursor-pointer
										${editableProperty.editable ? "bg-opacity-35" : "bg-opacity-5"} opacity-35 hover:opacity-100
										transition-all duration-300 ease-in-out
									`}
								>
									<Switch checked={editableProperty.editable} /> {editableProperty.property.toUpperCase()}
								</div>
							);
						})}
				</div>
			</div>
		);
	}

	private _computeYScale(height: number): void {
		const track = this.props.cinematicEditor.state.selectedTrack;
		if (track === this._oldTrack) {
			return;
		}

		const keyFrameAnimations = track?.keyFrameAnimations;

		if (!keyFrameAnimations || (keyFrameAnimations?.length ?? 0) < 2) {
			return;
		}

		const midHeight = height * 0.5;

		let maxYValue: number = Number.MIN_SAFE_INTEGER;
		let minYValue: number = Number.MAX_SAFE_INTEGER;

		keyFrameAnimations.forEach((key) => {
			const editableAnimationKey = isCinematicKeyCut(key) ? key.key2 : key;
			const editableProperties = getEditableProperties(editableAnimationKey, "value");

			editableProperties.forEach((editableProperty) => {
				const editableTrack = this._editableTracks.find((p) => p.property === editableProperty.property);
				if (editableTrack && !editableTrack?.editable) {
					return;
				}

				const value = getEditablePropertyValue(editableProperty);
				if (value !== undefined && value !== null) {
					maxYValue = Math.max(maxYValue, value);
					minYValue = Math.min(minYValue, value);
				}
			});
		});

		let maxYScale = 1;
		let minYScale = 1;

		if (maxYValue > midHeight) {
			maxYScale = (maxYValue / height) * 0.5;
		}

		if (minYValue < -midHeight) {
			minYScale = (minYValue / height) * 0.5;
		}

		this._yScale = Math.min(maxYScale, Math.abs(minYScale));
		this._oldTrack = track;
	}

	private _getCurves(height: number): ReactNode[] {
		const result: ReactNode[] = [];

		const track = this.props.cinematicEditor.state.selectedTrack;
		const keyFrameAnimations = track?.keyFrameAnimations;

		if (!keyFrameAnimations || (keyFrameAnimations?.length ?? 0) < 2) {
			return result;
		}

		const computedPoints: IAnimationKey[] = [];

		for (let i = 0; i < keyFrameAnimations.length - 1; ++i) {
			const key = keyFrameAnimations[i]!;
			const nextKey = keyFrameAnimations[i + 1]!;

			const previousKey = i > 0 ? keyFrameAnimations[i - 1] : null;

			const editableAnimationKey = isCinematicKeyCut(key) ? key.key2 : key;
			const nextEditableAnimationKey = isCinematicKeyCut(nextKey) ? nextKey.key1 : nextKey;

			const editableProperties = getEditableProperties(editableAnimationKey, "value");
			const nextEditableProperties = getEditableProperties(nextEditableAnimationKey, "value");

			const editableTangentProperties = getEditableProperties(editableAnimationKey, "outTangent");
			const nextEditableTangentProperties = getEditableProperties(nextEditableAnimationKey, "inTangent");

			editableProperties.forEach((editableProperty, index) => {
				const editableTrack = this._editableTracks.find((p) => p.property === editableProperty.property);
				if (editableTrack && !editableTrack?.editable) {
					return;
				}

				result.push(
					<CinematicEditorPropertyCurve
						key={`curve-${i}-${index}`}
						color={editableProperties.length > 1 ? curveColors[index] : "stroke-border"}
						scale={this.props.scale}
						height={height}
						yScale={this._yScale}
						drawPoint={!computedPoints.includes(editableAnimationKey)}
						drawHandles={
							this.props.cinematicEditor.inspector.state.editedObject === previousKey ||
							this.props.cinematicEditor.inspector.state.editedObject === key ||
							this.props.cinematicEditor.inspector.state.editedObject === nextKey
						}
						cinematicKey={key}
						nextCinematicKey={nextKey}
						editableAnimationKey={editableAnimationKey}
						nextEditableAnimationKey={nextEditableAnimationKey}
						editableProperty={editableProperty}
						nextEditableProperty={nextEditableProperties[index]!}
						editableTangentProperty={editableTangentProperties[index]!}
						nextEditableTangentProperty={nextEditableTangentProperties[index]!}
						cinematicEditor={this.props.cinematicEditor}
					/>
				);
			});

			computedPoints.push(editableAnimationKey, nextEditableAnimationKey);
		}

		return result;
	}

	private _handlePointerDown(event: PointerEvent<SVGElement>): void {
		if (event.target !== this._rootSvgRef || event.button !== 2) {
			return;
		}

		this._rootSvgRef!.setPointerCapture(event.pointerId);

		this.setState({
			panning: true,
		});

		const p = screenToSvg(this._rootSvgRef, event.clientX, event.clientY);
		this._panStart.set(p.x - this.props.translation.x, p.y - this.props.translation.y);
	}

	private _handlePointerMove(event: PointerEvent<SVGElement>): void {
		if (!this.state.panning || !this._rootSvgRef) {
			return;
		}

		const p = screenToSvg(this._rootSvgRef, event.clientX, event.clientY);
		const translation = new Vector2(Math.min(0, p.x - this._panStart.x), p.y - this._panStart.y);

		this.props.cinematicEditor.curves.setState({
			translation,
		});
	}

	private _handlePointerUp(event: PointerEvent<SVGElement>): void {
		if (!this._rootSvgRef) {
			return;
		}

		this._rootSvgRef.releasePointerCapture(event.pointerId);
		this.setState({
			panning: false,
		});
	}

	private _handleWheel(event: WheelEvent<SVGElement>): void {
		const p = screenToSvg(this._rootSvgRef!, event.clientX, event.clientY);

		const zoomFactor = event.deltaY < 0 ? 1.12 : 0.88;
		const scale = this.props.scale * zoomFactor;
		const minScale = 0.1;
		const maxScale = 20;

		if (scale < minScale || scale > maxScale) {
			return;
		}

		const contentX = (p.x - this.props.translation.x) / this.props.scale;
		const contentY = (p.y - this.props.translation.y) / this.props.scale;

		const translation = this.props.translation.clone();

		translation.x = Math.min(0, p.x - contentX * scale);
		translation.y = p.y - contentY * scale;

		this.props.cinematicEditor.setState({
			scale,
		});

		this.props.cinematicEditor.curves.setState({
			translation,
		});
	}
}
