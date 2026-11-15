/**
 * Fullscreen vertex stage of the passes of the volumetric lighting. The UV origin is the top-left corner of the target,
 * like the textures of WebGPU, so the render targets of the frame graph are sampled without any flip.
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

fn editorIpToneMap(rgb: vec3<f32>, toneMapping: f32) -> vec3<f32> {
	if (toneMapping > 2.5) {
		return editorIpNeutral(rgb);
	}
	if (toneMapping > 1.5) {
		let input = mat3x3<f32>(vec3<f32>(0.59719, 0.07600, 0.02840), vec3<f32>(0.35458, 0.90834, 0.13383), vec3<f32>(0.04823, 0.01566, 0.83777));
		let output = mat3x3<f32>(vec3<f32>(1.60475, -0.10208, -0.00327), vec3<f32>(-0.53108, 1.10813, -0.07276), vec3<f32>(-0.07367, -0.00605, 1.07602));
		return saturate(output * editorIpRRTAndODTFit(input * rgb));
	}
	if (toneMapping > 0.5) {
		return 1.0 - exp2(-1.590579 * rgb);
	}
	return rgb;
}

fn editorIpInverseToneMap(rgb: vec3<f32>, toneMapping: f32) -> vec3<f32> {
	if (toneMapping > 2.5) {
		// Mixes the channels: inverted by fixed point iterations, as it never expands the colors.
		var result = rgb;
		for (var i: i32 = 0; i < 12; i++) {
			result = max(result + (rgb - editorIpNeutral(result)), vec3<f32>(0.0));
		}
		return result;
	}
	if (toneMapping > 1.5) {
		let inputInverse = mat3x3<f32>(vec3<f32>(1.76474097, -0.14702785, -0.03633683), vec3<f32>(-0.67577768, 1.16025151, -0.16243644), vec3<f32>(-0.08896329, -0.01322366, 1.19877327));
		let outputInverse = mat3x3<f32>(vec3<f32>(0.64303825, 0.05926869, 0.00596190), vec3<f32>(0.31118675, 0.93143649, 0.06392902), vec3<f32>(0.04577546, 0.00929492, 0.93011838));
		return max(inputInverse * editorIpInverseRRTAndODTFit(outputInverse * rgb), vec3<f32>(0.0));
	}
	if (toneMapping > 0.5) {
		return -log2(max(1.0 - rgb, vec3<f32>(1e-6))) / 1.590579;
	}
	return rgb;
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
