import { ReactNode } from "react";

import { CinematicCurveComponent, CinematicCurveKey, getComponentValue, getCurveKeyFrame, getCurveSegment, getInKey, getOutKey } from "./tools/keys";
import { frameToX, ICinematicEditorCurvesView, valueToY } from "./tools/view";

export interface ICinematicEditorCurvePathProps {
	keys: CinematicCurveKey[];
	component: CinematicCurveComponent;
	view: ICinematicEditorCurvesView;
	width: number;
	color: string;
}

/**
 * Draws the curve of a component exactly as it is played: segments with tangents on both ends are cubic, the others are
 * straight lines and the values of the first and last keys are held before and after them. Cuts jump at their frame:
 * the curve is interrupted there, so the jump doesn't look like a steep animation (the cut itself is drawn across the graph).
 * A wider invisible stroke makes the curve easy to hover and double-click to insert keys.
 */
export function CinematicEditorCurvePath(props: ICinematicEditorCurvePathProps): ReactNode {
	const { keys, component, view } = props;

	const x = (frame: number): number => frameToX(view, frame);
	const y = (value: number): number => valueToY(view, value);

	let d = "";

	keys.forEach((key, index) => {
		const frame = getCurveKeyFrame(key);
		const inValue = getComponentValue(getInKey(key).value, component);
		const outValue = getComponentValue(getOutKey(key).value, component);

		if (index === 0) {
			d += `M ${x(frame)} ${y(inValue)}`;
		}

		if (inValue !== outValue) {
			d += ` M ${x(frame)} ${y(outValue)}`;
		}

		if (index < keys.length - 1) {
			const segment = getCurveSegment(keys, index, component);

			if (segment.hermite) {
				const third = (segment.frame1 - segment.frame0) / 3;

				d += ` C ${x(segment.frame0 + third)} ${y(segment.value0 + segment.slope0 * third)}`;
				d += ` ${x(segment.frame1 - third)} ${y(segment.value1 - segment.slope1 * third)}`;
				d += ` ${x(segment.frame1)} ${y(segment.value1)}`;
			} else {
				d += ` L ${x(segment.frame1)} ${y(segment.value1)}`;
			}
		}
	});

	const firstX = x(getCurveKeyFrame(keys[0]));
	const firstY = y(getComponentValue(getInKey(keys[0]).value, component));
	const lastX = x(getCurveKeyFrame(keys[keys.length - 1]));
	const lastY = y(getComponentValue(getOutKey(keys[keys.length - 1]).value, component));

	const holds = `M ${Math.min(-10, firstX)} ${firstY} L ${firstX} ${firstY} M ${lastX} ${lastY} L ${Math.max(props.width + 10, lastX)} ${lastY}`;
	const componentAttribute = component ?? "-";

	return (
		<g>
			<path d={holds} fill="none" stroke={props.color} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 4" className="pointer-events-none" />
			<path d={d} fill="none" stroke={props.color} strokeWidth={2} strokeLinejoin="round" className="pointer-events-none" />
			<path d={d + " " + holds} fill="none" stroke="transparent" strokeWidth={12} data-curve-target="curve" data-component={componentAttribute} style={{ cursor: "copy" }} />
		</g>
	);
}
