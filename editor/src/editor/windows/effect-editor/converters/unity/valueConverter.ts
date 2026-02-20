import type { Value } from "babylonjs-editor-tools";
import { getUnityProp } from "./utils";

/**
 * Convert Unity AnimationCurve to our PiecewiseBezier Value (supports m_Curve).
 */
export function convertAnimationCurve(curve: any, scalar: number = 1): Value {
	const m_Curve = getUnityProp(curve, "curve") ?? curve?.m_Curve;
	if (!m_Curve || m_Curve.length === 0) {
		return { type: "ConstantValue", value: 0 };
	}

	// If only one key, return constant
	if (m_Curve.length === 1) {
		return { type: "ConstantValue", value: parseFloat(m_Curve[0].value) * scalar };
	}

	// Convert to PiecewiseBezier
	const functions: Array<{
		function: {
			p0: number;
			p1: number;
			p2: number;
			p3: number;
		};
		start: number;
	}> = [];

	// Add initial key if curve doesn't start at 0
	if (m_Curve.length >= 1 && parseFloat(m_Curve[0].time) > 0) {
		const val = parseFloat(m_Curve[0].value) * scalar;
		functions.push({
			function: {
				p0: val,
				p1: val,
				p2: val,
				p3: val,
			},
			start: 0,
		});
	}

	// Convert each segment
	for (let i = 0; i < m_Curve.length - 1; i++) {
		const curr = m_Curve[i];
		const next = m_Curve[i + 1];
		const segmentDuration = parseFloat(next.time) - parseFloat(curr.time);

		const p0 = parseFloat(curr.value) * scalar;
		const p1 = (parseFloat(curr.value) + (parseFloat(curr.outSlope) * segmentDuration) / 3) * scalar;
		const p2 = (parseFloat(next.value) - (parseFloat(next.inSlope) * segmentDuration) / 3) * scalar;
		const p3 = parseFloat(next.value) * scalar;

		functions.push({
			function: {
				p0,
				p1,
				p2,
				p3,
			},
			start: parseFloat(curr.time),
		});
	}

	// Add final key if curve doesn't end at 1
	if (m_Curve.length >= 2 && parseFloat(m_Curve[m_Curve.length - 1].time) < 1) {
		const val = parseFloat(m_Curve[m_Curve.length - 1].value) * scalar;
		functions.push({
			function: {
				p0: val,
				p1: val,
				p2: val,
				p3: val,
			},
			start: parseFloat(m_Curve[m_Curve.length - 1].time),
		});
	}

	return {
		type: "PiecewiseBezier",
		functions,
	};
}

/**
 * Convert Unity MinMaxCurve to our Value (supports m_MinMaxState, m_Scalar, m_MaxCurve, etc.)
 */
export function convertMinMaxCurve(minMaxCurve: any): Value {
	if (!minMaxCurve) return { type: "ConstantValue", value: 1 };
	const minMaxState = String(getUnityProp(minMaxCurve, "minMaxState") ?? minMaxCurve.minMaxState ?? "0");
	const scalar = parseFloat(getUnityProp(minMaxCurve, "scalar") ?? minMaxCurve.scalar ?? "1");
	const minScalar = parseFloat(getUnityProp(minMaxCurve, "minScalar") ?? minMaxCurve.minScalar ?? "0");
	const maxCurve = getUnityProp(minMaxCurve, "maxCurve") ?? minMaxCurve.maxCurve;

	switch (minMaxState) {
		case "0":
			return { type: "ConstantValue", value: scalar };
		case "1":
			return convertAnimationCurve(maxCurve ?? {}, scalar);
		case "2":
			return { type: "IntervalValue", min: minScalar * scalar, max: scalar };
		case "3":
			return convertAnimationCurve(maxCurve ?? {}, scalar);
		default:
			return { type: "ConstantValue", value: scalar };
	}
}
