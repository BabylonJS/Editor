import type { Value } from "babylonjs-editor-tools";

/**
 * Convert Unity AnimationCurve to our PiecewiseBezier Value
 */
export function convertAnimationCurve(curve: any, scalar: number = 1): Value {
	const m_Curve = curve.m_Curve;
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
 * Convert Unity MinMaxCurve to our Value
 */
export function convertMinMaxCurve(minMaxCurve: any): Value {
	const minMaxState = minMaxCurve.minMaxState;
	const scalar = parseFloat(minMaxCurve.scalar || "1");

	switch (minMaxState) {
		case "0": // Constant
			return { type: "ConstantValue", value: scalar };
		case "1": // Curve
			return convertAnimationCurve(minMaxCurve.maxCurve, scalar);
		case "2": // Random between two constants
			return {
				type: "IntervalValue",
				min: parseFloat(minMaxCurve.minScalar || "0") * scalar,
				max: scalar,
			};
		case "3": // Random between two curves
			// For now, just use max curve (proper implementation would need RandomColor equivalent for Value)
			return convertAnimationCurve(minMaxCurve.maxCurve, scalar);
		default:
			return { type: "ConstantValue", value: scalar };
	}
}
