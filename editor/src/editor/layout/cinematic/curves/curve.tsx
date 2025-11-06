import { IAnimationKey } from "babylonjs";
import { ICinematicKey, ICinematicKeyCut, ICinematicTrack } from "babylonjs-editor-tools";

import { getKeyFrame } from "../timelines/tools";

import { CinematicEditor } from "../editor";

import { convertKeysToBezier, valueToSVGY } from "./tools/tools";
import { getEditablePropertyValue, ICinematicEditorEditableProperty } from "./tools/property";

import { removeAnimationKey } from "../timelines/remove";

import { CinematicEditorCurveHandle } from "./handle";
import { CinematicEditorPropertyPoint } from "./point";

export interface ICinematicEditorPropertyCubeProps {
	color: string;
	height: number;

	scale: number;
	yScale: number;

	drawPoint: boolean;
	drawHandles: boolean;

	track: ICinematicTrack;

	cinematicKey: ICinematicKey | ICinematicKeyCut;
	nextCinematicKey: ICinematicKey | ICinematicKeyCut;

	editableAnimationKey: IAnimationKey;
	nextEditableAnimationKey: IAnimationKey;

	editableProperty: ICinematicEditorEditableProperty;
	nextEditableProperty: ICinematicEditorEditableProperty;

	editableTangentProperty?: ICinematicEditorEditableProperty;
	nextEditableTangentProperty?: ICinematicEditorEditableProperty;

	cinematicEditor: CinematicEditor;
}

export function CinematicEditorPropertyCurve(props: ICinematicEditorPropertyCubeProps) {
	const value = getEditablePropertyValue(props.editableProperty);
	const nextValue = getEditablePropertyValue(props.nextEditableProperty);

	const { p0, p1, c1, c2 } = convertKeysToBezier({
		frame1: getKeyFrame(props.cinematicKey),
		frame2: getKeyFrame(props.nextCinematicKey),
		value1: value * props.yScale,
		value2: nextValue * props.yScale,
		outTangent: props.editableTangentProperty ? getEditablePropertyValue(props.editableTangentProperty) * props.yScale : 0,
		inTangent: props.nextEditableTangentProperty ? getEditablePropertyValue(props.nextEditableTangentProperty) * props.yScale : 0,
	});

	const computedP0 = [p0[0], valueToSVGY(p0[1], props.height)] as [number, number];
	const computedP1 = [p1[0], valueToSVGY(p1[1], props.height)] as [number, number];
	const computedC1 = [c1[0], valueToSVGY(c1[1], props.height)] as [number, number];
	const computedC2 = [c2[0], valueToSVGY(c2[1], props.height)] as [number, number];

	const d = `
        M ${computedP0[0]},${computedP0[1]} 
        C ${computedC1[0]},${computedC1[1]} 
        ${computedC2[0]},${computedC2[1]} 
        ${computedP1[0]},${computedP1[1]}
    `;

	return (
		<>
			<path d={d} className={`fill-none ${props.color} pointer-events-none`} strokeWidth={2 / props.scale} />

			{props.drawPoint && (
				<CinematicEditorPropertyPoint
					cx={computedP0[0]}
					cy={computedP0[1]}
					scale={props.scale}
					yScale={props.yScale}
					cinematicKey={props.cinematicKey}
					editableProperty={props.editableProperty}
					animationKey={props.editableAnimationKey}
					cinematicEditor={props.cinematicEditor}
					onRemoved={() => removeAnimationKey(props.cinematicEditor, props.track, props.cinematicKey)}
				/>
			)}

			<CinematicEditorPropertyPoint
				cx={computedP1[0]}
				cy={computedP1[1]}
				scale={props.scale}
				yScale={props.yScale}
				cinematicKey={props.nextCinematicKey}
				editableProperty={props.nextEditableProperty}
				animationKey={props.nextEditableAnimationKey}
				cinematicEditor={props.cinematicEditor}
				onRemoved={() => removeAnimationKey(props.cinematicEditor, props.track, props.nextCinematicKey)}
			/>

			{props.editableTangentProperty && props.drawHandles && (
				<>
					<line
						x1={computedP0[0]}
						y1={computedP0[1]}
						x2={computedC1[0]}
						y2={computedC1[1]}
						className={`${props.color} pointer-events-none`}
						strokeWidth={2 / props.scale}
						strokeDasharray={4 / props.scale}
					/>

					<CinematicEditorCurveHandle
						scale={props.scale}
						yScale={props.yScale}
						height={props.height}
						strokeColor={props.color}
						c1={computedC1}
						c2={computedC2}
						tangentType="out"
						cinematicKey={props.cinematicKey}
						nextCinematicKey={props.nextCinematicKey}
						editableProperty={props.editableProperty}
						nextEditableProperty={props.nextEditableProperty}
						editableTangentProperty={props.editableTangentProperty}
						nextEditableTangentProperty={props.nextEditableTangentProperty}
						cinematicEditor={props.cinematicEditor}
					/>
				</>
			)}

			{props.nextEditableTangentProperty && props.drawHandles && (
				<>
					<line
						x1={computedP1[0]}
						y1={computedP1[1]}
						x2={computedC2[0]}
						y2={computedC2[1]}
						className={`${props.color} pointer-events-none`}
						strokeWidth={2 / props.scale}
						strokeDasharray={4 / props.scale}
					/>

					<CinematicEditorCurveHandle
						scale={props.scale}
						yScale={props.yScale}
						height={props.height}
						strokeColor={props.color}
						c1={computedC1}
						c2={computedC2}
						tangentType="in"
						cinematicKey={props.cinematicKey}
						nextCinematicKey={props.nextCinematicKey}
						editableProperty={props.editableProperty}
						nextEditableProperty={props.nextEditableProperty}
						editableTangentProperty={props.editableTangentProperty}
						nextEditableTangentProperty={props.nextEditableTangentProperty}
						cinematicEditor={props.cinematicEditor}
					/>
				</>
			)}
		</>
	);
}
