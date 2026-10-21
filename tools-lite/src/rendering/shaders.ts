/**
 * Fullscreen vertex stage shared by the post-processes of the tools. The UV origin is the top-left corner of the
 * target, like the textures of WebGPU, so the render targets of the frame graph are sampled without any flip.
 */
export const fullscreenVertexWGSL = `
struct VertexOutput {
	@builtin(position) position: vec4<f32>,
	@location(0) uv: vec2<f32>,
};

@vertex
fn effectFullscreenVertex(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
	var positions = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
	let p = positions[vertexIndex];

	var output: VertexOutput;
	output.position = vec4<f32>(p, 0.0, 1.0);
	output.uv = vec2<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);

	return output;
}
`;

/**
 * Image processing of Babylon.js (exposure, tone mapping, conversion to gamma space and contrast of the
 * "imageProcessingFunctions" shader), which the PBR materials of Babylon Lite apply with the values of the scene, and its
 * inverse. The tone mapping is the value of the "TONEMAPPING" define of Babylon.js: 0 none, 1 standard, 2 ACES and 3
 * Khronos PBR neutral. The inverse can't recover the dark tones the tone mapping crushes.
 */
export const imageProcessingFunctionsWGSL = `
fn editorIpRRTAndODTFit(v: vec3<f32>) -> vec3<f32> {
	let a = v * (v + 0.0245786) - 0.000090537;
	let b = v * (0.983729 * v + 0.4329510) + 0.238081;
	return a / b;
}

fn editorIpInverseRRTAndODTFit(value: vec3<f32>) -> vec3<f32> {
	let y = clamp(value, vec3<f32>(0.0), vec3<f32>(1.0));
	let a = 1.0 - 0.983729 * y;
	let b = 0.0245786 - 0.4329510 * y;
	let c = -(0.000090537 + 0.238081 * y);
	return (-b + sqrt(max(b * b - 4.0 * a * c, vec3<f32>(0.0)))) / (2.0 * a);
}

fn editorIpNeutral(color: vec3<f32>) -> vec3<f32> {
	let startCompression = 0.8 - 0.04;
	let desaturation = 0.15;
	let x = min(color.r, min(color.g, color.b));
	let offset = select(0.04, x - 6.25 * x * x, x < 0.08);
	var result = color - offset;
	let peak = max(result.r, max(result.g, result.b));
	if (peak < startCompression) {
		return result;
	}
	let d = 1.0 - startCompression;
	let newPeak = 1.0 - d * d / (peak + d - startCompression);
	result *= newPeak / peak;
	let g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
	return mix(result, newPeak * vec3<f32>(1.0), g);
}

fn editorIpToneMap(color: vec3<f32>, toneMapping: f32) -> vec3<f32> {
	if (toneMapping > 2.5) {
		return editorIpNeutral(color);
	}
	if (toneMapping > 1.5) {
		let input = mat3x3<f32>(vec3<f32>(0.59719, 0.07600, 0.02840), vec3<f32>(0.35458, 0.90834, 0.13383), vec3<f32>(0.04823, 0.01566, 0.83777));
		let output = mat3x3<f32>(vec3<f32>(1.60475, -0.10208, -0.00327), vec3<f32>(-0.53108, 1.10813, -0.07276), vec3<f32>(-0.07367, -0.00605, 1.07602));
		return saturate(output * editorIpRRTAndODTFit(input * color));
	}
	if (toneMapping > 0.5) {
		return 1.0 - exp2(-1.590579 * color);
	}
	return color;
}

fn editorIpInverseToneMap(color: vec3<f32>, toneMapping: f32) -> vec3<f32> {
	if (toneMapping > 2.5) {
		// Mixes the channels: inverted by fixed point iterations, as it never expands the colors.
		var result = color;
		for (var i: i32 = 0; i < 12; i++) {
			result = max(result + (color - editorIpNeutral(result)), vec3<f32>(0.0));
		}
		return result;
	}
	if (toneMapping > 1.5) {
		let inputInverse = mat3x3<f32>(vec3<f32>(1.76474097, -0.14702785, -0.03633683), vec3<f32>(-0.67577768, 1.16025151, -0.16243644), vec3<f32>(-0.08896329, -0.01322366, 1.19877327));
		let outputInverse = mat3x3<f32>(vec3<f32>(0.64303825, 0.05926869, 0.00596190), vec3<f32>(0.31118675, 0.93143649, 0.06392902), vec3<f32>(0.04577546, 0.00929492, 0.93011838));
		return max(inputInverse * editorIpInverseRRTAndODTFit(outputInverse * color), vec3<f32>(0.0));
	}
	if (toneMapping > 0.5) {
		return -log2(max(1.0 - color, vec3<f32>(1e-6))) / 1.590579;
	}
	return color;
}

fn editorIpContrast(color: vec3<f32>, contrast: f32) -> vec3<f32> {
	let highContrast = color * color * (3.0 - 2.0 * color);
	if (contrast < 1.0) {
		return max(mix(vec3<f32>(0.5), color, contrast), vec3<f32>(0.0));
	}
	return max(mix(color, highContrast, contrast - 1.0), vec3<f32>(0.0));
}

fn editorIpInverseContrast(color: vec3<f32>, contrast: f32) -> vec3<f32> {
	let c = clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));
	if (contrast < 1.0) {
		return select(vec3<f32>(0.5), clamp((c - 0.5 * (1.0 - contrast)) / contrast, vec3<f32>(0.0), vec3<f32>(1.0)), contrast > 0.0);
	}
	if (contrast == 1.0) {
		return c;
	}
	// The contrast curve is monotonic on [0, 1]: inverted by bisection.
	let amount = contrast - 1.0;
	var low = vec3<f32>(0.0);
	var high = vec3<f32>(1.0);
	for (var i: i32 = 0; i < 16; i++) {
		let middle = (low + high) * 0.5;
		let below = middle + (middle * middle * (3.0 - 2.0 * middle) - middle) * amount < c;
		low = select(low, middle, below);
		high = select(middle, high, below);
	}
	return (low + high) * 0.5;
}

// Exposure, tone mapping, gamma space and contrast, as the PBR materials of Babylon Lite apply them.
fn editorIpApplyScene(color: vec3<f32>, exposure: f32, contrast: f32, toneMapping: f32) -> vec3<f32> {
	let toneMapped = editorIpToneMap(color * exposure, toneMapping);
	return editorIpContrast(clamp(pow(max(toneMapped, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.2)), vec3<f32>(0.0), vec3<f32>(1.0)), contrast);
}

fn editorIpInverseScene(color: vec3<f32>, exposure: f32, contrast: f32, toneMapping: f32) -> vec3<f32> {
	let gamma = pow(editorIpInverseContrast(color, contrast), vec3<f32>(2.2));
	return editorIpInverseToneMap(gamma, toneMapping) / max(exposure, 1e-6);
}
`;

/**
 * Defines the size in bytes of the uniforms of the image processing post-process (`imageProcessingFragmentWGSL`).
 */
export const imageProcessingUniformsByteLength = 11 * 16;

/**
 * Image processing post-process: the parts of the image processing of the Babylon.js default rendering pipeline that
 * the Babylon Lite materials don't apply (vignette, color grading, color curves and dithering), followed by the sharpen
 * and grain effects of the default rendering pipeline. Exposure, tone mapping and contrast are applied by the materials.
 * Ported from the Babylon.js shaders "imageProcessingFunctions", "sharpen.fragment" and "grain.fragment".
 */
export const imageProcessingFragmentWGSL = `
struct ImageProcessingParams {
	screenSize: vec4<f32>,
	vignetteSettings1: vec4<f32>,
	vignetteSettings2: vec4<f32>,
	colorCurveNeutral: vec4<f32>,
	colorCurvePositive: vec4<f32>,
	colorCurveNegative: vec4<f32>,
	// x: vignette blend mode (0 disabled, 1 multiply, 2 opaque), y: color curves enabled, z: dither intensity (0 disabled).
	flags: vec4<f32>,
	// x: enabled, y: edge amount, z: color amount.
	sharpen: vec4<f32>,
	// x: enabled, y: intensity, z: animated seed.
	grain: vec4<f32>,
	// x: lookup table scale, y: lookup table offset, z: lookup table size, w: level (0 disabled).
	colorGrading: vec4<f32>,
	// Image processing applied by the materials. x: exposure, y: contrast, z: tone mapping (see "editorIpToneMap").
	sceneImageProcessing: vec4<f32>,
};

@group(0) @binding(0) var<uniform> params: ImageProcessingParams;
@group(0) @binding(1) var sourceTexture: texture_2d<f32>;
@group(0) @binding(2) var sourceSampler: sampler;
@group(0) @binding(3) var colorGradingTexture: texture_3d<f32>;
@group(0) @binding(4) var colorGradingSampler: sampler;

const PI: f32 = 3.1415926535897932384626433832795;
const LuminanceEncodeApprox: vec3<f32> = vec3<f32>(0.2126, 0.7152, 0.0722);

fn getLuminance(color: vec3<f32>) -> f32 {
	return clamp(dot(color, LuminanceEncodeApprox), 0.0, 1.0);
}

${imageProcessingFunctionsWGSL}

fn getRand(seed: vec2<f32>) -> f32 {
	return fract(sin(dot(seed, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

fn applyImageProcessing(color: vec4<f32>, fragCoord: vec2<f32>) -> vec4<f32> {
	var rgb = color.rgb;

	if (params.flags.x > 0.5) {
		var viewportXY = fragCoord * params.screenSize.zw;
		viewportXY = viewportXY * 2.0 - 1.0;

		let vignetteXY1 = vec3<f32>(viewportXY * params.vignetteSettings1.xy + params.vignetteSettings1.zw, 1.0);
		let vignetteTerm = dot(vignetteXY1, vignetteXY1);
		let vignette = pow(vignetteTerm, params.vignetteSettings2.w);
		let vignetteColor = params.vignetteSettings2.rgb;

		// Babylon.js applies the vignette on the linear color, after the exposure and before the tone mapping, which the
		// materials of Babylon Lite apply: their image processing is inverted and applied again.
		let exposure = params.sceneImageProcessing.x;
		let contrast = params.sceneImageProcessing.y;
		let toneMapping = params.sceneImageProcessing.z;

		var linear = editorIpInverseScene(rgb, exposure, contrast, toneMapping);

		if (params.flags.x < 1.5) {
			linear *= mix(vignetteColor, vec3<f32>(1.0, 1.0, 1.0), vignette);
		} else {
			linear = mix(vignetteColor / max(exposure, 1e-6), linear, vignette);
		}

		rgb = editorIpApplyScene(linear, exposure, contrast, toneMapping);
	}

	rgb = clamp(rgb, vec3<f32>(0.0), vec3<f32>(1.0));

	if (params.colorGrading.w > 0.0) {
		let colorTransformInput = rgb * params.colorGrading.x + params.colorGrading.y;
		let colorTransformOutput = textureSampleLevel(colorGradingTexture, colorGradingSampler, colorTransformInput, 0.0).rgb;

		rgb = mix(rgb, colorTransformOutput, params.colorGrading.w);
	}

	if (params.flags.y > 0.5) {
		let luma = getLuminance(rgb);
		let curveMix = clamp(vec2<f32>(luma * 3.0 - 1.5, luma * -3.0 + 1.5), vec2<f32>(0.0), vec2<f32>(1.0));
		let colorCurve = params.colorCurveNeutral + curveMix.x * params.colorCurvePositive - curveMix.y * params.colorCurveNegative;

		rgb *= colorCurve.rgb;
		rgb = mix(vec3<f32>(luma), rgb, colorCurve.a);
	}

	if (params.flags.z > 0.0) {
		let rand = getRand(fragCoord * params.screenSize.zw);
		let dither = mix(-params.flags.z, params.flags.z, rand);
		rgb = clamp(rgb + vec3<f32>(dither), vec3<f32>(0.0), vec3<f32>(1.0));
	}

	return vec4<f32>(rgb, color.a);
}

fn sampleProcessed(uv: vec2<f32>, fragCoord: vec2<f32>) -> vec4<f32> {
	return applyImageProcessing(textureSampleLevel(sourceTexture, sourceSampler, uv, 0.0), fragCoord);
}

@fragment
fn effectFragment(input: VertexOutput) -> @location(0) vec4<f32> {
	let fragCoord = input.position.xy;
	var color = sampleProcessed(input.uv, fragCoord);

	if (params.sharpen.x > 0.5) {
		let onePixel = params.screenSize.zw;
		let edgeDetection = sampleProcessed(input.uv + onePixel * vec2<f32>(0.0, -1.0), fragCoord + vec2<f32>(0.0, -1.0)) +
			sampleProcessed(input.uv + onePixel * vec2<f32>(-1.0, 0.0), fragCoord + vec2<f32>(-1.0, 0.0)) +
			sampleProcessed(input.uv + onePixel * vec2<f32>(1.0, 0.0), fragCoord + vec2<f32>(1.0, 0.0)) +
			sampleProcessed(input.uv + onePixel * vec2<f32>(0.0, 1.0), fragCoord + vec2<f32>(0.0, 1.0)) -
			color * 4.0;

		color = max(vec4<f32>(color.rgb * params.sharpen.z, color.a) - (params.sharpen.y * vec4<f32>(edgeDetection.rgb, 0.0)), vec4<f32>(0.0));
	}

	if (params.grain.x > 0.5) {
		let seed = input.uv * params.grain.z;
		let normVariance = params.grain.y / 255.0;
		let grain = mix(-normVariance, normVariance, getRand(seed));

		// Add less grain when luminance is high or low
		let lum = getLuminance(color.rgb);
		let grainAmount = (cos(-PI + (lum * PI * 2.0)) + 1.0) / 2.0;

		color = vec4<f32>(max(color.rgb + grain * grainAmount, vec3<f32>(0.0)), color.a);
	}

	return color;
}
`;

/**
 * Defines the size in bytes of the uniforms of the final post-process (`finalFragmentWGSL`).
 */
export const finalUniformsByteLength = 16;

/**
 * Final post-process: applies the FXAA of the Babylon.js default rendering pipeline when enabled, or copies the source
 * otherwise. Ported from the Babylon.js shaders "fxaa.vertex" and "fxaa.fragment".
 */
export const finalFragmentWGSL = `
struct FinalParams {
	// xy: texel size, z: FXAA enabled.
	settings: vec4<f32>,
};

@group(0) @binding(0) var<uniform> params: FinalParams;
@group(0) @binding(1) var sourceTexture: texture_2d<f32>;
@group(0) @binding(2) var sourceSampler: sampler;

const fxaaQualitySubpix: f32 = 1.0;
const fxaaQualityEdgeThreshold: f32 = 0.166;
const fxaaQualityEdgeThresholdMin: f32 = 0.0833;
const kLumaCoefficients: vec3<f32> = vec3<f32>(0.2126, 0.7152, 0.0722);

fn fxaaLuma(rgba: vec4<f32>) -> f32 {
	return dot(rgba.rgb, kLumaCoefficients);
}

fn sampleSource(uv: vec2<f32>) -> vec4<f32> {
	return textureSampleLevel(sourceTexture, sourceSampler, uv, 0.0);
}

fn fxaa(uv: vec2<f32>) -> vec4<f32> {
	let texelSize = params.settings.xy;

	var posM = uv;

	let rgbyM = sampleSource(uv);
	let lumaM = fxaaLuma(rgbyM);
	var lumaS = fxaaLuma(sampleSource(uv + vec2<f32>(0.0, 1.0) * texelSize));
	let lumaE = fxaaLuma(sampleSource(uv + vec2<f32>(1.0, 0.0) * texelSize));
	var lumaN = fxaaLuma(sampleSource(uv + vec2<f32>(0.0, -1.0) * texelSize));
	let lumaW = fxaaLuma(sampleSource(uv + vec2<f32>(-1.0, 0.0) * texelSize));
	let maxSM = max(lumaS, lumaM);
	let minSM = min(lumaS, lumaM);
	let maxESM = max(lumaE, maxSM);
	let minESM = min(lumaE, minSM);
	let maxWN = max(lumaN, lumaW);
	let minWN = min(lumaN, lumaW);
	let rangeMax = max(maxWN, maxESM);
	let rangeMin = min(minWN, minESM);
	let rangeMaxScaled = rangeMax * fxaaQualityEdgeThreshold;
	let range = rangeMax - rangeMin;
	let rangeMaxClamped = max(fxaaQualityEdgeThresholdMin, rangeMaxScaled);

	if (range < rangeMaxClamped) {
		return rgbyM;
	}

	let lumaNW = fxaaLuma(sampleSource(uv + vec2<f32>(-1.0, -1.0) * texelSize));
	let lumaSE = fxaaLuma(sampleSource(uv + vec2<f32>(1.0, 1.0) * texelSize));
	let lumaNE = fxaaLuma(sampleSource(uv + vec2<f32>(1.0, -1.0) * texelSize));
	let lumaSW = fxaaLuma(sampleSource(uv + vec2<f32>(-1.0, 1.0) * texelSize));
	let lumaNS = lumaN + lumaS;
	let lumaWE = lumaW + lumaE;
	let subpixRcpRange = 1.0 / range;
	let subpixNSWE = lumaNS + lumaWE;
	let edgeHorz1 = (-2.0 * lumaM) + lumaNS;
	let edgeVert1 = (-2.0 * lumaM) + lumaWE;
	let lumaNESE = lumaNE + lumaSE;
	let lumaNWNE = lumaNW + lumaNE;
	let edgeHorz2 = (-2.0 * lumaE) + lumaNESE;
	let edgeVert2 = (-2.0 * lumaN) + lumaNWNE;
	let lumaNWSW = lumaNW + lumaSW;
	let lumaSWSE = lumaSW + lumaSE;
	let edgeHorz4 = (abs(edgeHorz1) * 2.0) + abs(edgeHorz2);
	let edgeVert4 = (abs(edgeVert1) * 2.0) + abs(edgeVert2);
	let edgeHorz3 = (-2.0 * lumaW) + lumaNWSW;
	let edgeVert3 = (-2.0 * lumaS) + lumaSWSE;
	let edgeHorz = abs(edgeHorz3) + edgeHorz4;
	let edgeVert = abs(edgeVert3) + edgeVert4;
	let subpixNWSWNESE = lumaNWSW + lumaNESE;
	var lengthSign = texelSize.x;
	let horzSpan = edgeHorz >= edgeVert;
	let subpixA = subpixNSWE * 2.0 + subpixNWSWNESE;

	if (!horzSpan) {
		lumaN = lumaW;
		lumaS = lumaE;
	} else {
		lengthSign = texelSize.y;
	}

	let subpixB = (subpixA * (1.0 / 12.0)) - lumaM;
	let gradientN = lumaN - lumaM;
	let gradientS = lumaS - lumaM;
	var lumaNN = lumaN + lumaM;
	let lumaSS = lumaS + lumaM;
	let pairN = abs(gradientN) >= abs(gradientS);
	let gradient = max(abs(gradientN), abs(gradientS));

	if (pairN) {
		lengthSign = -lengthSign;
	}

	let subpixC = clamp(abs(subpixB) * subpixRcpRange, 0.0, 1.0);

	var posB = posM;

	var offNP: vec2<f32>;
	offNP.x = select(texelSize.x, 0.0, !horzSpan);
	offNP.y = select(texelSize.y, 0.0, horzSpan);

	if (!horzSpan) {
		posB.x += lengthSign * 0.5;
	} else {
		posB.y += lengthSign * 0.5;
	}

	var posN = vec2<f32>(posB.x - offNP.x * 1.5, posB.y - offNP.y * 1.5);
	var posP = vec2<f32>(posB.x + offNP.x * 1.5, posB.y + offNP.y * 1.5);

	let subpixD = ((-2.0) * subpixC) + 3.0;
	var lumaEndN = fxaaLuma(sampleSource(posN));
	let subpixE = subpixC * subpixC;
	var lumaEndP = fxaaLuma(sampleSource(posP));

	if (!pairN) {
		lumaNN = lumaSS;
	}

	let gradientScaled = gradient * 1.0 / 4.0;
	let lumaMM = lumaM - lumaNN * 0.5;
	let subpixF = subpixD * subpixE;
	let lumaMLTZero = lumaMM < 0.0;

	lumaEndN -= lumaNN * 0.5;
	lumaEndP -= lumaNN * 0.5;

	var doneN = abs(lumaEndN) >= gradientScaled;
	var doneP = abs(lumaEndP) >= gradientScaled;

	if (!doneN) {
		posN -= offNP * 3.0;
	}

	var doneNP = (!doneN) || (!doneP);

	if (!doneP) {
		posP += offNP * 3.0;
	}

	if (doneNP) {
		if (!doneN) {
			lumaEndN = fxaaLuma(sampleSource(posN)) - lumaNN * 0.5;
		}
		if (!doneP) {
			lumaEndP = fxaaLuma(sampleSource(posP)) - lumaNN * 0.5;
		}

		doneN = abs(lumaEndN) >= gradientScaled;
		doneP = abs(lumaEndP) >= gradientScaled;

		if (!doneN) {
			posN -= offNP * 12.0;
		}

		doneNP = (!doneN) || (!doneP);

		if (!doneP) {
			posP += offNP * 12.0;
		}
	}

	var dstN = posM.x - posN.x;
	var dstP = posP.x - posM.x;

	if (!horzSpan) {
		dstN = posM.y - posN.y;
		dstP = posP.y - posM.y;
	}

	let goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;
	let spanLength = (dstP + dstN);
	let goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;
	let spanLengthRcp = 1.0 / spanLength;
	let directionN = dstN < dstP;
	let dst = min(dstN, dstP);
	let goodSpan = select(goodSpanP, goodSpanN, directionN);
	let subpixG = subpixF * subpixF;
	let pixelOffset = (dst * (-spanLengthRcp)) + 0.5;
	let subpixH = subpixG * fxaaQualitySubpix;
	let pixelOffsetGood = select(0.0, pixelOffset, goodSpan);
	let pixelOffsetSubpix = max(pixelOffsetGood, subpixH);

	if (!horzSpan) {
		posM.x += pixelOffsetSubpix * lengthSign;
	} else {
		posM.y += pixelOffsetSubpix * lengthSign;
	}

	return sampleSource(posM);
}

@fragment
fn effectFragment(input: VertexOutput) -> @location(0) vec4<f32> {
	if (params.settings.z > 0.5) {
		return fxaa(input.uv);
	}

	return sampleSource(input.uv);
}
`;

/**
 * Copy post-process: copies the source texture into the target.
 */
export const copyFragmentWGSL = `
@group(0) @binding(0) var sourceTexture: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;

@fragment
fn effectFragment(input: VertexOutput) -> @location(0) vec4<f32> {
	return textureSampleLevel(sourceTexture, sourceSampler, input.uv, 0.0);
}
`;
