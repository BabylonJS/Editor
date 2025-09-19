export function screenToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
	const rect = svg.getBoundingClientRect();
	const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : null;

	if (!vb) {
		return {
			x: clientX - rect.left,
			y: clientY - rect.top,
		};
	}

	// gérer preserveAspectRatio (xMidYMid meet par défaut)
	const preserve = (svg.getAttribute("preserveAspectRatio") || "xMidYMid meet").trim();
	const [align, meetOrSlice] = preserve.split(/\s+/);

	if (align === "none") {
		return {
			x: (clientX - rect.left) * (vb.width / rect.width) + vb.x,
			y: (clientY - rect.top) * (vb.height / rect.height) + vb.y,
		};
	}

	const scaleX = rect.width / vb.width;
	const scaleY = rect.height / vb.height;
	const useScale = meetOrSlice === "slice" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);

	let offsetX = 0;
	let offsetY = 0;

	const alignX = align.substring(0, 4);
	const alignY = align.substring(4);

	if (alignX === "xMid") {
		offsetX = (rect.width - vb.width * useScale) / 2;
	} else if (alignX === "xMax") {
		offsetX = rect.width - vb.width * useScale;
	}

	if (alignY === "YMid") {
		offsetY = (rect.height - vb.height * useScale) / 2;
	} else if (alignY === "YMax") {
		offsetY = rect.height - vb.height * useScale;
	}

	return {
		x: (clientX - rect.left - offsetX) / useScale + vb.x,
		y: (clientY - rect.top - offsetY) / useScale + vb.y,
	};
}

export function valueToSVGY(value: number, height: number) {
	const center = height * 0.5;
	return center - value;
}

export function SVGYToValue(value: number, scale: number, height: number) {
	const center = height * 0.5;
	return (center + value) / scale;
}

export interface IConvertKeysToBezierOptions {
	frame1: number;
	frame2: number;
	value1: number;
	value2: number;
	outTangent: number;
	inTangent: number;
}

export function convertKeysToBezier(options: IConvertKeysToBezierOptions) {
	const dt = options.frame2 - options.frame1;
	const dtGuard = dt || 1e-6;

	const x0 = options.frame1;
	const y0 = options.value1;
	const x1 = options.frame2;
	const y1 = options.value2;

	const slope = (y1 - y0) / dtGuard;

	let outTangent = options.outTangent;
	let inTangent = options.inTangent;

	if (outTangent === null) {
		outTangent = slope;
	}

	if (inTangent === null) {
		inTangent = slope;
	}

	const h = dt / 3;
	const c1 = [x0 + h, y0 + h * outTangent] as [number, number];
	const c2 = [x1 - h, y1 - h * inTangent] as [number, number];

	// IMPORTANT: ne pas tronquer p0/p1 (plus de >>0)
	return {
		p0: [x0, y0] as [number, number],
		p1: [x1, y1] as [number, number],
		c1,
		c2,
	};
}

export interface IConvertKeysToTangentsOptions {
	p0: [number, number];
	p1: [number, number];
	c1: [number, number];
	c2: [number, number];
}

export function convertBezierToTangents(options: IConvertKeysToTangentsOptions) {
	const [x0, y0] = options.p0;
	const [x1, y1] = options.p1;
	const dt = x1 - x0;
	const dtGuard = dt || 1e-6;

	const slope = (y1 - y0) / dtGuard;

	let outTangent = slope;
	let inTangent = slope;

	if (options.c1) {
		const [, cy1] = options.c1;
		outTangent = (3 * (cy1 - y0)) / dtGuard;
		if (!isFinite(outTangent)) {
			outTangent = slope;
		}
	}

	if (options.c2) {
		const [, cy2] = options.c2;
		inTangent = (3 * (y1 - cy2)) / dtGuard;
		if (!isFinite(inTangent)) {
			inTangent = slope;
		}
	}

	return {
		frame1: x0,
		value1: y0,
		frame2: x1,
		value2: y1,
		outTangent,
		inTangent,
	};
}
