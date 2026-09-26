import { maxVolumetricShadowSlots } from "./types";

/**
 * WGSL version of the passes of the volumetric lighting rendering pipeline, for WebGPU.
 *
 * This is a hand written port of the GLSL in "shaders.ts" rather than a transpilation: Babylon.js can only
 * turn GLSL into WGSL by downloading twgsl from its CDN, which an offline Electron application can't rely on.
 * Both versions are driven by exactly the same "#define" set, so the pipeline, the light selection and the
 * shader shape key are shared and only the source of the passes differs.
 *
 * Babylon.js emulates the conventions of WebGL on WebGPU: render targets are stored bottom-up and
 * "fragmentInputs.position" is flipped like "gl_FragCoord" when needed, so the integer texel fetches below
 * address the textures exactly like their GLSL counterparts.
 */

/**
 * Defines how the linear depth is stored. @see the GLSL version.
 */
const packingHelpers = /* wgsl */ `
// Stored scaled down by a power of two, which is exact. @see the GLSL version.
const volLinearDepthScale: f32 = 1.0 / 1024.0;

fn volUnpack(color: vec4f) -> f32 {
	let bitShift = vec4f(1.0 / (255.0 * 255.0 * 255.0), 1.0 / (255.0 * 255.0), 1.0 / 255.0, 1.0);
	return dot(color, bitShift);
}
`;

/**
 * Reads the full resolution depth map of the depth source (prepass, geometry buffer or depth renderer), bound
 * as "depthSampler". Requires the "volCameraMinMaxZ" and "volDepthUnpack" uniforms.
 */
const depthMapHelpers = /* wgsl */ `
// Loads the texel under the given coordinates rather than filtering: the 32 bits float textures of the prepass
// renderer are not filterable on WebGPU. @see the GLSL version.
fn volSampleDepth(uv: vec2f) -> f32 {
	let size = vec2i(textureDimensions(depthSampler));
	let coordinates = min(vec2i(uv * vec2f(size)), size - 1);

	#ifdef VOL_DEPTH_PACKED
		return volUnpack(textureLoad(depthSampler, coordinates, 0));
	#else
		return textureLoad(depthSampler, coordinates, 0).r;
	#endif
}

// Converts the raw value stored in the depth map into a distance along the view axis, in scene units.
fn volLinearDepth(d: f32) -> f32 {
	#ifdef VOL_DEPTH_VIEWZ
		// The view space Z is stored directly, negative in a right handed scene. The sky is cleared to 0.
		let viewZ = abs(d);
		return select(viewZ, uniforms.volCameraMinMaxZ.y, viewZ <= 0.0);
	#else
		// The depth renderer stores "(clipZ + minZ) / (minZ + maxZ)", which is affine in the view space Z
		// for both the perspective and the orthographic projections. "volDepthUnpack" holds the two
		// coefficients of the exact inverse, computed on the CPU from the projection matrix of the scene.
		return uniforms.volDepthUnpack.x * d + uniforms.volDepthUnpack.y;
	#endif
}
`;

/**
 * Reads the linear depth written by the linear depth pass. Requires the "volCameraMinMaxZ" uniform.
 * @param texture defines the name of the texture holding the linear depth.
 */
function buildLinearDepthHelpers(texture: string): string {
	return /* wgsl */ `
// Returns the distance along the view axis, in scene units, of the texel at the given coordinates.
fn volReadLinearDepth(coordinates: vec2i) -> f32 {
	#ifdef VOL_LINEAR_DEPTH_PACKED
		return volUnpack(textureLoad(${texture}, coordinates, 0)) * uniforms.volCameraMinMaxZ.y;
	#else
		return textureLoad(${texture}, coordinates, 0).r * (1.0 / volLinearDepthScale);
	#endif
}

// Returns the texel of the linear depth under the center of the given texel of the scattering buffer.
// @see the GLSL version.
fn volScatterToDepthTexel(scatterTexel: vec2i, depthSize: vec2i) -> vec2i {
	return min(vec2i((vec2f(scatterTexel) + 0.5) * uniforms.volDepthRatio), depthSize - 1);
}
`;
}

/**
 * The linear depth pass. @see buildVolumetricLightingLinearDepthShader.
 */
export function buildVolumetricLightingLinearDepthShaderWGSL(): string {
	return /* wgsl */ `
varying vUV: vec2f;

var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
var depthSampler: texture_2d<f32>;

uniform volCameraMinMaxZ: vec2f;
uniform volDepthUnpack: vec2f;

// (1 when the pipeline has nothing to draw this frame, unused, unused, unused)
uniform volPassParams: vec4f;

${packingHelpers}
${depthMapHelpers}

fn volPack(depth: f32) -> vec4f {
	let bitShift = vec4f(255.0 * 255.0 * 255.0, 255.0 * 255.0, 255.0, 1.0);
	let bitMask = vec4f(0.0, 1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0);

	var result = fract(depth * bitShift);
	result -= result.xxyz * bitMask;

	return result;
}

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
	// Nothing reads the linear depth while the pipeline has nothing to draw.
	if (uniforms.volPassParams.x > 0.5) {
		fragmentOutputs.color = vec4f(0.0);
	} else {
		let viewZ = volLinearDepth(volSampleDepth(input.vUV));

		#ifdef VOL_LINEAR_DEPTH_PACKED
			fragmentOutputs.color = volPack(clamp(viewZ / uniforms.volCameraMinMaxZ.y, 0.0, 0.9999999));
		#else
			// Bounded by the largest 16 bits float.
			fragmentOutputs.color = vec4f(min(viewZ * volLinearDepthScale, 65504.0), 0.0, 0.0, 1.0);
		#endif
	}
}
`;
}

/**
 * Generates the loop integrating the in-scattering of a point or a spot light over the part of the view ray
 * crossing its volume. @see the GLSL version in "shaders.ts".
 * @param seed defines the expression decorrelating the samples of this light from the ones of the other lights.
 * @param occlusion defines the statement applying the occlusion of the light to "contribution".
 */
function buildLocalLightIntegrationWGSL(seed: string, occlusion: string): string {
	return /* wgsl */ `
		let chordLength = t1 - t0;

		// The point of the view ray closest to the light splits the chord in two halves over which both the
		// attenuation and the phase function are monotonic, which is where stratified samples do best.
		var closest = clamp(dot(data.xyz, volRayDir), t0, t1);
		if (closest - t0 < 0.02 * chordLength) {
			closest = t0;
		} else if (t1 - closest < 0.02 * chordLength) {
			closest = t1;
		}

		let count = volLocalSampleCount(chordLength, falloff.x, tEnd - tStart);

		var firstCount = clamp(i32(f32(count) * (closest - t0) / chordLength + 0.5), 1, count - 1);
		if (closest <= t0) {
			firstCount = 0;
		} else if (closest >= t1) {
			firstCount = count;
		}

		let firstWidth = (closest - t0) / f32(max(firstCount, 1));
		let secondWidth = (t1 - closest) / f32(max(count - firstCount, 1));
		let stratum = volStratumOffset(${seed});

		var result = vec3f(0.0);

		for (var k: i32 = 0; k < VOL_LOCAL_MAX_STEPS; k++) {
			if (k >= count) {
				break;
			}

			let inFirstHalf = k < firstCount;
			let width = select(secondWidth, firstWidth, inFirstHalf);
			let t = select(closest + width * (f32(k - firstCount) + stratum), t0 + width * (f32(k) + stratum), inFirstHalf);

			let position = volRayDir * t;
			let sigmaT = volExtinctionAt(uniforms.volCameraPosition.y + position.y, t);

			let lightSample = volEvalLocalLight(data, diffuse, direction, falloff, position);
			var contribution = lightSample.xyz;
			let distanceToLight = lightSample.w;

			if (contribution.r + contribution.g + contribution.b > 0.0) {
				${occlusion}
				result += contribution * (volCombinedTransmittance(t, sigmaT, distanceToLight) * sigmaT * width);
			}
		}

		return vec4f(result, 1.0);
`;
}

/**
 * The raymarching pass. @see buildVolumetricLightingScatteringShader for what it computes.
 * @param shadowSlotCount defines the number of shadowed light slots the shader is generated for.
 */
export function buildVolumetricLightingScatteringShaderWGSL(shadowSlotCount: number): string {
	const slots: string[] = [];
	const globalSlotContributions: string[] = [];
	const localSlotContributions: string[] = [];

	for (let i = 0; i < shadowSlotCount; ++i) {
		slots.push(
			/* wgsl */ `
#if VOL_SHADOW_SLOT_COUNT > {X}
	#if VOL_SHADOW_KIND{X} == 2
		var volShadowSampler{X}Sampler: sampler;
		var volShadowSampler{X}: texture_cube<f32>;
	#elif VOL_SHADOW_KIND{X} == 1
		var volShadowSampler{X}Sampler: sampler_comparison;
		var volShadowSampler{X}: texture_depth_2d;
	#else
		var volShadowSampler{X}Sampler: sampler;
		var volShadowSampler{X}: texture_2d<f32>;
	#endif

	// Returns the shadowing of a point given its position relative to the camera and, for the 2d shadow maps, its
	// position in the clip space of the light. @see the GLSL version.
	fn volShadow{X}(position: vec3f, clip: vec4f) -> f32 {
		let info = uniforms.volShadowInfo[{X}];
		let edge = uniforms.volShadowLightFalloff[{X}].z;

		#if VOL_SHADOW_KIND{X} == 2
			// Cube shadow map of a point light. It stores the radial distance to the light.
			var toFragment = position - uniforms.volShadowLightData[{X}].xyz;
			let depth = clamp((length(toFragment) + info.z) / info.w, 0.0, 1.0);

			toFragment = normalize(toFragment);
			toFragment.y = -toFragment.y;

			#ifdef VOL_SHADOW_PACKED{X}
				let shadowMapSample = volUnpack(textureSampleLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, toFragment, 0.0));
			#else
				let shadowMapSample = textureSampleLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, toFragment, 0.0).x;
			#endif

			#if VOL_SHADOW_MODE{X} == 1
				// Exponential shadow map, same encoding as the 2d case. "info.y" holds the depth scale.
				return 1.0 - clamp(exp(min(87.0, info.y * depth)) * shadowMapSample, 0.0, 1.0 - info.x);
			#elif VOL_SHADOW_MODE{X} == 2
				return clamp(exp(min(87.0, -info.y * (depth - shadowMapSample))), info.x, 1.0);
			#else
				return select(1.0, info.x, depth > shadowMapSample);
			#endif
		#else
			let clipSpace = clip.xyz / clip.w;

			// "getTransformMatrix" gives the world to light clip space matrix without the [-1, 1] -> [0, 1] bias.
			#if VOL_SHADOW_KIND{X} == 1
				var uvDepth = 0.5 * clipSpace + vec3f(0.5);
				#ifdef VOL_NDC_HALF_Z
					uvDepth.z = clipSpace.z;
				#endif

				// Same guard as "computeShadowWithPCF1": past the far plane of the shadow map the hardware
				// comparison would fail against every texel a caster wrote, reporting the sample as occluded
				// while the surfaces at the same distance are lit by the material path.
				let pcfDepthMetric = volDepthMetric(clip, info.zw);
				if (pcfDepthMetric < 0.0 || pcfDepthMetric > 1.0 || uvDepth.x < 0.0 || uvDepth.x > 1.0 || uvDepth.y < 0.0 || uvDepth.y > 1.0) {
					return 1.0;
				}

				// Hardware comparison sampling. "info.y" holds the inverse of the size of the shadow map.
				#if VOL_PCF_TAPS == 4
					let shadow = 0.25 * (
						textureSampleCompareLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, uvDepth.xy + vec2f(-0.5 * info.y, -0.5 * info.y), uvDepth.z) +
						textureSampleCompareLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, uvDepth.xy + vec2f( 0.5 * info.y, -0.5 * info.y), uvDepth.z) +
						textureSampleCompareLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, uvDepth.xy + vec2f(-0.5 * info.y,  0.5 * info.y), uvDepth.z) +
						textureSampleCompareLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, uvDepth.xy + vec2f( 0.5 * info.y,  0.5 * info.y), uvDepth.z)
					);
				#else
					let shadow = textureSampleCompareLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, uvDepth.xy, uvDepth.z);
				#endif

				return volFallOff(mix(info.x, 1.0, shadow), clipSpace.xy, edge);
			#else
				let uv = 0.5 * clipSpace.xy + vec2f(0.5);
				if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
					return 1.0;
				}

				let depthMetric = clamp(volDepthMetric(clip, info.zw), 0.0, 1.0);

				#ifdef VOL_SHADOW_PACKED{X}
					let shadowMapSample = volUnpack(textureSampleLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, uv, 0.0));
				#else
					let shadowMapSample = textureSampleLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, uv, 0.0).x;
				#endif

				#if VOL_SHADOW_MODE{X} == 1
					// Exponential shadow map. "info.y" holds the depth scale of the generator.
					return volFallOff(1.0 - clamp(exp(min(87.0, info.y * depthMetric)) * shadowMapSample, 0.0, 1.0 - info.x), clipSpace.xy, edge);
				#elif VOL_SHADOW_MODE{X} == 2
					// Close exponential shadow map.
					return volFallOff(clamp(exp(min(87.0, -info.y * (depthMetric - shadowMapSample))), info.x, 1.0), clipSpace.xy, edge);
				#else
					return select(1.0, volFallOff(info.x, clipSpace.xy, edge), depthMetric > shadowMapSample);
				#endif
			#endif
		#endif
	}

	#if VOL_SHADOW_LOCAL{X} == 1
		// Point or spot light casting volumetric shadows: integrated over its own volume, like the others.
		fn volIntegrateShadowSlot{X}(tStart: f32, tEnd: f32) -> vec4f {
			let data = uniforms.volShadowLightData[{X}];
			let direction = uniforms.volShadowLightDirection[{X}];
			let falloff = uniforms.volShadowLightFalloff[{X}];

			let chord = volLightChord(data, direction, falloff.x);
			let t0 = max(chord.x, tStart);
			let t1 = min(chord.y, tEnd);

			if (t1 <= t0) {
				return vec4f(0.0);
			}

			let diffuse = uniforms.volShadowLightDiffuse[{X}];

			// The light clip space position of the points of the view ray is affine in their distance to the camera.
			let clipOrigin = uniforms.volShadowMatrix[{X}] * vec4f(uniforms.volCameraPosition, 1.0);
			let clipDirection = uniforms.volShadowMatrix[{X}] * vec4f(volRayDir, 0.0);
			${buildLocalLightIntegrationWGSL("f32({X}) + 0.5", "contribution *= mix(1.0, volShadow{X}(position, clipOrigin + clipDirection * t), falloff.w);")}
		}
	#endif
#endif
`.replace(/\{X\}/g, i.toString())
		);

		globalSlotContributions.push(
			/* wgsl */ `
				#if VOL_SHADOW_SLOT_COUNT > {X}
					#if VOL_SHADOW_LOCAL{X} == 0
					{
						// Recomputed rather than kept affine to keep fewer registers alive across the march. @see the GLSL version.
						let shadow = volShadow{X}(position, uniforms.volShadowMatrix[{X}] * vec4f(uniforms.volCameraPosition + position, 1.0));
						scattering += volEvalDirectionalLight(uniforms.volShadowLightData[{X}], uniforms.volShadowLightDiffuse[{X}]) * mix(1.0, shadow, uniforms.volShadowLightFalloff[{X}].w);
						stepLights += 1.0;
					}
					#endif
				#endif
`.replace(/\{X\}/g, i.toString())
		);

		localSlotContributions.push(
			/* wgsl */ `
		#if VOL_SHADOW_SLOT_COUNT > {X}
			#if VOL_SHADOW_LOCAL{X} == 1
				lightResult = volIntegrateShadowSlot{X}(tStart, tEnd);
				accumulated += lightResult.xyz;
				evaluatedLights += lightResult.w;
			#endif
		#endif
`.replace(/\{X\}/g, i.toString())
		);
	}

	return /* wgsl */ `
varying vUV: vec2f;

// Full resolution linear depth of the scene, written by the linear depth pass.
var textureSampler: texture_2d<f32>;

// Ratio between the resolution of the linear depth and the resolution of the scattering buffer.
uniform volDepthRatio: vec2f;

uniform volInverseViewProjection: mat4x4f;
uniform volCameraPosition: vec3f;
uniform volCameraForward: vec3f;
uniform volCameraMinMaxZ: vec2f;
uniform volFrameIndex: f32;

// Offset of the current frame along the golden ratio sequence the samples walk with the temporal accumulation.
uniform volTemporalOffset: f32;

uniform volFogInfos: vec4f;
uniform volFogColor: vec3f;
uniform volLinearFogEps: f32;
uniform volMedium: vec4f;

#ifdef VOL_SCREEN_SHADOWS
	uniform volViewProjection: mat4x4f;
	uniform volScreenShadowParams: vec4f;
#endif
uniform volAmbient: vec3f;

// (maximum distance, dithering strength, light extinction clamp, number of point and spot lights in the arrays)
uniform volParams: vec4f;

// (1 when the pipeline has nothing to draw this frame, unused, unused, unused)
uniform volPassParams: vec4f;

#if VOL_MAX_ARRAY_LIGHTS > 0
	uniform volLightData: array<vec4f, VOL_MAX_ARRAY_LIGHTS>;
	uniform volLightDiffuse: array<vec4f, VOL_MAX_ARRAY_LIGHTS>;
	uniform volLightDirection: array<vec4f, VOL_MAX_ARRAY_LIGHTS>;
	uniform volLightFalloff: array<vec4f, VOL_MAX_ARRAY_LIGHTS>;
#endif

#if VOL_SHADOW_SLOT_COUNT > 0
	uniform volShadowLightData: array<vec4f, VOL_SHADOW_SLOT_COUNT>;
	uniform volShadowLightDiffuse: array<vec4f, VOL_SHADOW_SLOT_COUNT>;
	uniform volShadowLightDirection: array<vec4f, VOL_SHADOW_SLOT_COUNT>;
	uniform volShadowLightFalloff: array<vec4f, VOL_SHADOW_SLOT_COUNT>;
	uniform volShadowInfo: array<vec4f, VOL_SHADOW_SLOT_COUNT>;
	uniform volShadowMatrix: array<mat4x4f, VOL_SHADOW_SLOT_COUNT>;
#endif

#ifdef VOL_CSM
	uniform volCsmLightData: vec4f;
	uniform volCsmLightDiffuse: vec4f;
	uniform volCsmLightDirection: vec4f;
	uniform volCsmLightFalloff: vec4f;
	uniform volCsmInfo: vec4f;
	uniform volCsmMatrices: array<mat4x4f, VOL_CSM_CASCADES>;

	#if VOL_CSM_KIND == 1
		var volCsmSamplerSampler: sampler_comparison;
		var volCsmSampler: texture_depth_2d_array;
	#else
		var volCsmSamplerSampler: sampler;
		var volCsmSampler: texture_2d_array<f32>;
	#endif
#endif

// Values shared by every function of the pass, computed once per pixel. Every position the raymarching
// manipulates is relative to the camera, which keeps the precision of the lights far from the origin.
var<private> volRayDir: vec3f;
var<private> volCosForward: f32;
var<private> volNoise: f32;
var<private> volJitter: f32;

#ifdef VOL_SCREEN_SHADOWS
	var<private> volDepthSize: vec2i;
	var<private> volClipOrigin: vec4f;
	var<private> volClipDirection: vec4f;
#endif

${packingHelpers}
${buildLinearDepthHelpers("textureSampler")}

fn volMod(x: f32, y: f32) -> f32 {
	return x - y * floor(x / y);
}

fn volFallOff(value: f32, clipSpaceXY: vec2f, frustumEdgeFalloff: f32) -> f32 {
	let mask = smoothstep(1.0 - frustumEdgeFalloff, 1.00000012, clamp(dot(clipSpaceXY, clipSpaceXY), 0.0, 1.0));
	return mix(value, 1.0, mask);
}

// Reproduces the depth metric computed by the "shadowsVertex" include of Babylon.js: the raw clip space
// Z is used, without the perspective divide, so the comparison matches what the shadow map stores.
fn volDepthMetric(clip: vec4f, depthValues: vec2f) -> f32 {
	#ifdef VOL_REVERSE_DEPTH
		return (-clip.z + depthValues.x) / depthValues.y;
	#else
		return (clip.z + depthValues.x) / depthValues.y;
	#endif
}

// Henyey-Greenstein phase function, normalised to 1 for an isotropic medium. @see the GLSL version.
fn volPhaseHG(c: f32, g: f32) -> f32 {
	let g2 = g * g;
	let d = max(1.0 + g2 - 2.0 * g * c, 1e-4);
	return (1.0 - g2) / (d * sqrt(d));
}

fn volBayer4(p: vec2f) -> f32 {
	let p1 = vec2f(volMod(floor(p.x), 2.0), volMod(floor(p.y), 2.0));
	let p2 = vec2f(volMod(floor(p.x * 0.5), 2.0), volMod(floor(p.y * 0.5), 2.0));

	let b1 = 2.0 * p1.x + 3.0 * p1.y - 4.0 * p1.x * p1.y;
	let b2 = 2.0 * p2.x + 3.0 * p2.y - 4.0 * p2.x * p2.y;

	return (b1 * 4.0 + b2) / 16.0;
}

fn volInterleavedGradientNoise(p: vec2f) -> f32 {
	return fract(52.9829189 * fract(dot(p, vec2f(0.06711056, 0.00583715))));
}

// Returns the offset of the samples of a light inside their strata. @see the GLSL version.
fn volStratumOffset(seed: f32) -> f32 {
	#if VOL_DITHER == 0
		return 0.5;
	#else
		return mix(0.5, fract(volNoise + seed * 0.618034), uniforms.volParams.y);
	#endif
}

// sigma(t) = -d/dt ln(T(t)), the exact analytic derivative of the optical depth. @see the GLSL version.
fn volFogExtinction(t: f32) -> f32 {
	#if VOL_FOG_MODE == 2
		return select(1.0 / max(uniforms.volFogInfos.z - t, uniforms.volLinearFogEps), 0.0, t < uniforms.volFogInfos.y);
	#elif VOL_FOG_MODE == 1
		return 2.0 * uniforms.volFogInfos.w * uniforms.volFogInfos.w * t;
	#else
		return uniforms.volFogInfos.w;
	#endif
}

// "height" is the absolute altitude of the sample, "t" its distance to the camera.
fn volExtinctionAt(height: f32, t: f32) -> f32 {
	var sigma = volFogExtinction(t);

	#ifdef VOL_HEIGHT_FOG
		sigma *= exp(-max(0.0, height - uniforms.volMedium.y) * uniforms.volMedium.z);
	#endif

	return sigma;
}

// Transmittance of the medium between the camera and the point of the view ray at the distance "t".
// @see the GLSL version.
#if VOL_TRANSMITTANCE == 1
	fn volHeightSegment(s1: f32, s2: f32) -> f32 {
		let y0 = uniforms.volCameraPosition.y - uniforms.volMedium.y;
		let h1 = y0 + s1 * volRayDir.y;
		let h2 = y0 + s2 * volRayDir.y;

		if (h1 + h2 <= 0.0) {
			return s2 - s1;
		}

		let e1 = exp(-uniforms.volMedium.z * max(h1, 0.0));
		let e2 = exp(-uniforms.volMedium.z * max(h2, 0.0));
		let slope = uniforms.volMedium.z * volRayDir.y;

		return select((e1 - e2) / slope, 0.5 * (e1 + e2) * (s2 - s1), abs(slope * (s2 - s1)) < 1e-4);
	}

	fn volOpticalDepth(t: f32) -> f32 {
		let crossing = select(-1.0, (uniforms.volMedium.y - uniforms.volCameraPosition.y) / volRayDir.y, abs(volRayDir.y) > 1e-6);

		var opticalLength = 0.0;
		if (crossing > 0.0 && crossing < t) {
			opticalLength = volHeightSegment(0.0, crossing) + volHeightSegment(crossing, t);
		} else {
			opticalLength = volHeightSegment(0.0, t);
		}

		return uniforms.volFogInfos.w * opticalLength;
	}

	fn volTransmittance(t: f32) -> f32 {
		return exp(-volOpticalDepth(t));
	}
#elif VOL_TRANSMITTANCE == 2
	var<private> volOpticalDepths: array<f32, VOL_TRANSMITTANCE_SAMPLES + 1>;
	var<private> volOpticalDepthStart: f32;
	var<private> volOpticalDepthScale: f32;

	fn volBuildOpticalDepths(tStart: f32, tEnd: f32) {
		let stepSize = (tEnd - tStart) / f32(VOL_TRANSMITTANCE_SAMPLES);

		volOpticalDepthStart = tStart;
		volOpticalDepthScale = 1.0 / stepSize;

		var previous = volExtinctionAt(uniforms.volCameraPosition.y + volRayDir.y * tStart, tStart);
		var opticalDepth = previous * tStart;

		volOpticalDepths[0] = opticalDepth;

		for (var i: i32 = 1; i <= VOL_TRANSMITTANCE_SAMPLES; i++) {
			let t = tStart + stepSize * f32(i);
			let sigma = volExtinctionAt(uniforms.volCameraPosition.y + volRayDir.y * t, t);

			opticalDepth += 0.5 * (previous + sigma) * stepSize;
			volOpticalDepths[i] = opticalDepth;
			previous = sigma;
		}
	}

	fn volOpticalDepth(t: f32) -> f32 {
		let x = clamp((t - volOpticalDepthStart) * volOpticalDepthScale, 0.0, f32(VOL_TRANSMITTANCE_SAMPLES));
		let i = min(i32(x), VOL_TRANSMITTANCE_SAMPLES - 1);

		return mix(volOpticalDepths[i], volOpticalDepths[i + 1], x - f32(i));
	}

	fn volTransmittance(t: f32) -> f32 {
		return exp(-volOpticalDepth(t));
	}
#elif VOL_FOG_MODE == 2
	fn volTransmittance(t: f32) -> f32 {
		return clamp((uniforms.volFogInfos.z - t) / max(uniforms.volFogInfos.z - uniforms.volFogInfos.y, uniforms.volLinearFogEps), 0.0, 1.0);
	}
#else
	fn volOpticalDepth(t: f32) -> f32 {
		#if VOL_FOG_MODE == 1
			let x = t * uniforms.volFogInfos.w;
			return x * x;
		#else
			return t * uniforms.volFogInfos.w;
		#endif
	}

	fn volTransmittance(t: f32) -> f32 {
		return exp(-volOpticalDepth(t));
	}
#endif

// Transmittance of the medium to the point at the distance "t", combined with the attenuation of the light on
// its way to that point. @see the GLSL version.
fn volCombinedTransmittance(t: f32, sigmaT: f32, distanceToLight: f32) -> f32 {
	#ifdef VOL_LIGHT_EXTINCTION
		let lightOpticalDepth = sigmaT * min(distanceToLight, uniforms.volParams.z);

		#ifdef VOL_OPTICAL_DEPTH
			return exp(-(volOpticalDepth(t) + lightOpticalDepth));
		#else
			return volTransmittance(t) * exp(-lightOpticalDepth);
		#endif
	#else
		return volTransmittance(t);
	#endif
}

#ifdef VOL_SCREEN_SHADOWS
	// Walks a segment going from a point of the medium towards a light through the depth buffer. The segment is
	// given in clip space, where it is affine. @see the GLSL version.
	fn volScreenShadow(clipStart: vec4f, clipDelta: vec4f, depthStart: f32, depthDelta: f32) -> f32 {
		for (var i: i32 = 1; i <= VOL_SCREEN_SHADOW_STEPS; i++) {
			let u = (f32(i) + volJitter) * (1.0 / f32(VOL_SCREEN_SHADOW_STEPS + 1));

			let clip = clipStart + clipDelta * u;
			if (clip.w <= 0.0) {
				continue;
			}

			let uv = (clip.xy / clip.w) * 0.5 + 0.5;
			if (uv.x < 0.0 || uv.x >= 1.0 || uv.y < 0.0 || uv.y >= 1.0) {
				continue;
			}

			let sceneDepth = volReadLinearDepth(vec2i(uv * vec2f(volDepthSize)));

			let depthDifference = depthStart + depthDelta * u - sceneDepth;
			let bias = max(uniforms.volScreenShadowParams.y * sceneDepth, uniforms.volCameraMinMaxZ.x);

			if (depthDifference > bias && depthDifference < uniforms.volScreenShadowParams.z * sceneDepth) {
				return 0.0;
			}
		}

		return 1.0;
	}

	// Occlusion of a point or a spot light, seen from the point of the view ray at the distance "t".
	fn volScreenShadowToLight(t: f32, lightClip: vec4f, lightDepth: f32, distanceToLight: f32) -> f32 {
		let clipStart = volClipOrigin + volClipDirection * t;
		let depthStart = t * volCosForward;
		let fraction = min(1.0, uniforms.volScreenShadowParams.x / max(distanceToLight, 1e-4));

		return volScreenShadow(clipStart, (lightClip - clipStart) * fraction, depthStart, (lightDepth - depthStart) * fraction);
	}
#endif

// Evaluates the in-scattered radiance coming from a directional light, without any shadowing.
fn volEvalDirectionalLight(data: vec4f, diffuse: vec4f) -> vec3f {
	return diffuse.rgb * volPhaseHG(dot(volRayDir, data.xyz), diffuse.a);
}

// Evaluates the in-scattered radiance coming from a point or a spot light at the given position, relative to
// the camera, without any shadowing nor extinction. Returns the radiance in "xyz" and the distance to the light in "w".
fn volEvalLocalLight(data: vec4f, diffuse: vec4f, direction: vec4f, falloff: vec4f, position: vec3f) -> vec4f {
	let toLight = data.xyz - position;
	let distanceToLight = max(length(toLight), 1e-4);
	let lightVector = toLight / distanceToLight;

	// Same linear attenuation as "computeLighting" in the "lightsFragmentFunctions" include.
	var attenuation = max(0.0, 1.0 - distanceToLight / falloff.x);

	if (data.w == 2.0) {
		let cosAngle = max(0.0, dot(direction.xyz, -lightVector));
		attenuation *= select(0.0, max(0.0, pow(cosAngle, falloff.y)), cosAngle >= direction.w);
	}

	if (attenuation <= 0.0) {
		return vec4f(0.0, 0.0, 0.0, distanceToLight);
	}

	return vec4f(diffuse.rgb * (attenuation * volPhaseHG(dot(volRayDir, lightVector), diffuse.a)), distanceToLight);
}

// Returns the part of the view ray crossing the cone of a spot light, cut by the sphere of its range.
// @see the GLSL version.
fn volConeChord(apex: vec3f, axis: vec3f, cosAngle: f32, range: f32, sphere: vec2f) -> vec2f {
	if (cosAngle <= 1e-3) {
		return sphere;
	}

	let origin = apex * (-1.0 / range);
	let dv = dot(volRayDir, axis);
	let ov = dot(origin, axis);
	let cos2 = cosAngle * cosAngle;

	let a = dv * dv - cos2;
	let b = dv * ov - cos2 * dot(volRayDir, origin);
	let c = ov * ov - cos2 * dot(origin, origin);

	if (abs(a) < 1e-4) {
		return sphere;
	}

	let discriminant = b * b - a * c;
	var cone = vec2f(0.0);

	if (a < 0.0) {
		if (discriminant <= 0.0) {
			return vec2f(1.0, -1.0);
		}

		let s = sqrt(discriminant);
		cone = vec2f((-b + s) / a, (-b - s) / a);

		if (dv * 0.5 * (cone.x + cone.y) + ov < 0.0) {
			return vec2f(1.0, -1.0);
		}
	} else {
		let s = sqrt(max(discriminant, 0.0));
		cone = select(vec2f(-1e30, (-b - s) / a), vec2f((-b + s) / a, 1e30), dv > 0.0);
	}

	return vec2f(max(sphere.x, (cone.x - 0.005) * range), min(sphere.y, (cone.y + 0.005) * range));
}

// Returns the part of the view ray, as distances to the camera, crossing the volume a point or a spot light
// reaches. @see the GLSL version.
fn volLightChord(data: vec4f, direction: vec4f, range: f32) -> vec2f {
	let closest = dot(data.xyz, volRayDir);
	let offset = data.xyz - volRayDir * closest;
	let halfChord2 = range * range - dot(offset, offset);

	if (halfChord2 <= 0.0) {
		return vec2f(1.0, -1.0);
	}

	let halfChord = sqrt(halfChord2);
	var chord = vec2f(closest - halfChord, closest + halfChord);

	if (data.w == 2.0) {
		chord = volConeChord(data.xyz, direction.xyz, direction.w, range, chord);
	}

	return chord;
}

// Returns the number of samples taken over the given chord of a light. @see the GLSL version.
fn volLocalSampleCount(chordLength: f32, range: f32, rayLength: f32) -> i32 {
	let count = max(f32(VOL_LIGHT_STEPS) * chordLength / (2.0 * range), f32(VOL_STEPS) * chordLength / rayLength);
	return clamp(i32(ceil(count)), 2, VOL_LOCAL_MAX_STEPS);
}

${slots.join("\n")}

#ifdef VOL_CSM
	// The parts of the view ray inside the box of each cascade, and the clip space position of the view ray in the
	// current cascade. @see the GLSL version.
	var<private> volCsmEntries: vec4f;
	var<private> volCsmExits: vec4f;
	var<private> volCsmCurrent: i32;
	var<private> volCsmClipOrigin: vec4f;
	var<private> volCsmClipDirection: vec4f;

	// Returns the part of the view ray inside the box of a cascade. @see the GLSL version.
	fn volCsmBoxInterval(origin: vec4f, direction: vec4f) -> vec2f {
		#ifdef VOL_NDC_HALF_Z
			let boxMin = vec3f(-0.96, -0.96, 0.0);
		#else
			let boxMin = vec3f(-0.96, -0.96, -1.0);
		#endif
		let boxMax = vec3f(0.96, 0.96, 1.0);

		let safeDirection = select(vec3f(1e-9), direction.xyz, abs(direction.xyz) > vec3f(1e-9));
		let inverseDirection = 1.0 / safeDirection;
		let t0 = (boxMin - origin.xyz) * inverseDirection;
		let t1 = (boxMax - origin.xyz) * inverseDirection;
		let tMin = min(t0, t1);
		let tMax = max(t0, t1);

		return vec2f(max(max(tMin.x, tMin.y), tMin.z), min(min(tMax.x, tMax.y), tMax.z));
	}

	fn volPrepareCsm() {
		volCsmEntries = vec4f(1e30);
		volCsmExits = vec4f(-1e30);

		for (var cascade: i32 = 0; cascade < VOL_CSM_CASCADES; cascade++) {
			let interval = volCsmBoxInterval(uniforms.volCsmMatrices[cascade] * vec4f(uniforms.volCameraPosition, 1.0), uniforms.volCsmMatrices[cascade] * vec4f(volRayDir, 0.0));
			volCsmEntries[cascade] = interval.x;
			volCsmExits[cascade] = interval.y;
		}

		volCsmCurrent = -1;
	}

	// Returns the shadowing of the point of the view ray at the distance "t" from the camera.
	fn volCsmShadow(t: f32) -> f32 {
		// The first cascade containing the sample is the most detailed one.
		var cascade: i32 = -1;
		for (var i: i32 = VOL_CSM_CASCADES - 1; i >= 0; i--) {
			if (t >= volCsmEntries[i] && t <= volCsmExits[i]) {
				cascade = i;
			}
		}

		if (cascade < 0) {
			return 1.0;
		}

		if (cascade != volCsmCurrent) {
			volCsmCurrent = cascade;
			volCsmClipOrigin = uniforms.volCsmMatrices[cascade] * vec4f(uniforms.volCameraPosition, 1.0);
			volCsmClipDirection = uniforms.volCsmMatrices[cascade] * vec4f(volRayDir, 0.0);
		}

		// The projection of a directional light is orthographic, "w" is always 1.
		let clip = volCsmClipOrigin + volCsmClipDirection * t;
		let clipSpace = clip.xyz;

		#if VOL_CSM_KIND == 1
			var uvDepth = 0.5 * clipSpace + vec3f(0.5);
			#ifdef VOL_NDC_HALF_Z
				uvDepth.z = clipSpace.z;
			#endif

			let shadow = textureSampleCompareLevel(volCsmSampler, volCsmSamplerSampler, uvDepth.xy, cascade, uvDepth.z);
			return volFallOff(mix(uniforms.volCsmInfo.x, 1.0, shadow), clipSpace.xy, uniforms.volCsmLightFalloff.z);
		#else
			let uv = 0.5 * clipSpace.xy + vec2f(0.5);
			let depthMetric = clamp(volDepthMetric(clip, uniforms.volCsmInfo.zw), 0.0, 1.0);

			#ifdef VOL_CSM_PACKED
				let shadowMapSample = volUnpack(textureSampleLevel(volCsmSampler, volCsmSamplerSampler, uv, cascade, 0.0));
			#else
				let shadowMapSample = textureSampleLevel(volCsmSampler, volCsmSamplerSampler, uv, cascade, 0.0).x;
			#endif

			return select(1.0, volFallOff(uniforms.volCsmInfo.x, clipSpace.xy, uniforms.volCsmLightFalloff.z), depthMetric > shadowMapSample);
		#endif
	}
#endif

#if VOL_GLOBAL_LIGHT_COUNT > 0
	// Marches the whole view ray for the lights that reach all of it: the directional lights. Returns the
	// in-scattered radiance in "xyz" and the number of lights evaluated in "w".
	fn volMarchGlobalLights(tStart: f32, tEnd: f32) -> vec4f {
		#if VOL_DIRECTIONAL_LIGHT_COUNT > 0
			#ifdef VOL_SCREEN_SHADOWS
				// The occlusion search of a directional light always walks the same direction over the same distance,
				// only its starting point moves along the view ray.
				var directionClip: array<vec4f, VOL_DIRECTIONAL_LIGHT_COUNT>;
				var directionDepth: array<f32, VOL_DIRECTIONAL_LIGHT_COUNT>;

				for (var li: i32 = 0; li < VOL_DIRECTIONAL_LIGHT_COUNT; li++) {
					let traced = uniforms.volLightData[li].xyz * uniforms.volScreenShadowParams.x;
					directionClip[li] = uniforms.volViewProjection * vec4f(traced, 0.0);
					directionDepth[li] = dot(traced, uniforms.volCameraForward);
				}
			#endif
		#endif

		#if VOL_DISTRIBUTION == 1
			let ratio = pow(tEnd / tStart, 1.0 / f32(VOL_STEPS));
		#else
			let uniformStep = (tEnd - tStart) / f32(VOL_STEPS);
		#endif

		var result = vec3f(0.0);
		var evaluatedLights = 0.0;
		var segmentStart = tStart;

		for (var i: i32 = 0; i < VOL_STEPS; i++) {
			#if VOL_DISTRIBUTION == 1
				let segmentEnd = segmentStart * ratio;
			#else
				let segmentEnd = segmentStart + uniformStep;
			#endif

			let segmentBegin = segmentStart;
			let dt = segmentEnd - segmentBegin;

			// The jitter picks the sample inside its own segment, so the marched interval stays exactly
			// [tStart, tEnd] whatever the dithering does.
			let t = segmentBegin + dt * volJitter;
			segmentStart = segmentEnd;

			let position = volRayDir * t;
			let sigmaT = volExtinctionAt(uniforms.volCameraPosition.y + position.y, t);

			if (sigmaT <= 1e-6) {
				continue;
			}

			// The transmittance at the START of the segment: the factor below accounts for the extinction
			// across the segment itself.
			let viewTransmittance = volTransmittance(segmentBegin);
			if (viewTransmittance < 0.003) {
				break;
			}

			var scattering = vec3f(0.0);
			var stepLights = 0.0;

${globalSlotContributions.join("")}
			#ifdef VOL_CSM
			{
				scattering += volEvalDirectionalLight(uniforms.volCsmLightData, uniforms.volCsmLightDiffuse) * mix(1.0, volCsmShadow(t), uniforms.volCsmLightFalloff.w);
				stepLights += 1.0;
			}
			#endif

			#if VOL_DIRECTIONAL_LIGHT_COUNT > 0
				for (var li: i32 = 0; li < VOL_DIRECTIONAL_LIGHT_COUNT; li++) {
					var contribution = volEvalDirectionalLight(uniforms.volLightData[li], uniforms.volLightDiffuse[li]);

					#ifdef VOL_SCREEN_SHADOWS
						// "volLightFalloff[li].z" carries whether this light asked to be occluded by the geometry.
						if (uniforms.volLightFalloff[li].z > 0.5) {
							contribution *= volScreenShadow(volClipOrigin + volClipDirection * t, directionClip[li], t * volCosForward, directionDepth[li]);
						}
					#endif

					scattering += contribution;
					stepLights += 1.0;
				}
			#endif

			evaluatedLights = max(evaluatedLights, stepLights);

			// Analytic integral of the in-scattering over the segment. @see the GLSL version.
			result += scattering * (viewTransmittance * (1.0 - exp(-sigmaT * dt)));
		}

		return vec4f(result, evaluatedLights);
	}
#endif

#if VOL_LOCAL_ARRAY_LIGHTS == 1
	// Integrates a point or a spot light of the arrays over the part of the view ray crossing its volume.
	// Returns the in-scattered radiance in "xyz" and whether the light was evaluated in "w".
	fn volIntegrateArrayLight(index: i32, tStart: f32, tEnd: f32) -> vec4f {
		let data = uniforms.volLightData[index];
		let direction = uniforms.volLightDirection[index];
		let falloff = uniforms.volLightFalloff[index];

		let chord = volLightChord(data, direction, falloff.x);
		let t0 = max(chord.x, tStart);
		let t1 = min(chord.y, tEnd);

		if (t1 <= t0) {
			return vec4f(0.0);
		}

		let diffuse = uniforms.volLightDiffuse[index];

		#ifdef VOL_SCREEN_SHADOWS
			// "falloff.z" carries whether this light asked to be occluded by the geometry.
			let occluded = falloff.z > 0.5;
			let lightClip = volClipOrigin + uniforms.volViewProjection * vec4f(data.xyz, 0.0);
			let lightDepth = dot(data.xyz, uniforms.volCameraForward);
		#endif

		${buildLocalLightIntegrationWGSL(
			"f32(index)",
			`#ifdef VOL_SCREEN_SHADOWS
					if (occluded) {
						contribution *= volScreenShadowToLight(t, lightClip, lightDepth, distanceToLight);
					}
				#endif`
		)}
	}
#endif

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
	// Reconstruct the world space direction of the view ray from the UV of the pixel.
	let farPoint = uniforms.volInverseViewProjection * vec4f(input.vUV * 2.0 - 1.0, 1.0, 1.0);
	volRayDir = normalize(farPoint.xyz / farPoint.w - uniforms.volCameraPosition);

	// The depth map stores the distance along the view axis, the ray is not aligned with it.
	volCosForward = max(dot(volRayDir, uniforms.volCameraForward), 1e-4);
	let pixel = fragmentInputs.position.xy;
	let depthSize = vec2i(textureDimensions(textureSampler));
	let viewZ = volReadLinearDepth(volScatterToDepthTexel(vec2i(pixel), depthSize));

	let tEnd = min(viewZ / volCosForward, uniforms.volParams.x);
	let tStart = max(uniforms.volCameraMinMaxZ.x / volCosForward, 1e-3);

	var result = vec3f(0.0);
	var finalTransmittance = 1.0;
	var evaluatedLights = 0.0;

	// WGSL has no early return from the fragment entry point, the whole integration is guarded instead. Nothing is
	// drawn either while no light reaches the view and the medium neither glows nor attenuates anything.
	if (tEnd > tStart && uniforms.volPassParams.x < 0.5) {
		// Offsets the samples inside their segments to trade the banding produced by a low sample count for noise.
		volNoise = 0.0;
		#if VOL_DITHER == 1
			volNoise = volBayer4(pixel);
		#elif VOL_DITHER == 2
			var ditherPosition = pixel;
			#ifdef VOL_TEMPORAL_JITTER
				ditherPosition += uniforms.volFrameIndex * 5.588238;
			#endif
			volNoise = volInterleavedGradientNoise(ditherPosition);
		#endif

		#ifdef VOL_TEMPORAL_ACCUMULATION
			// Each pixel walks the golden ratio sequence from the offset of its dithering pattern. @see the GLSL version.
			volNoise = fract(volNoise + uniforms.volTemporalOffset);
		#endif
		volJitter = volNoise * uniforms.volParams.y;

		#ifdef VOL_SCREEN_SHADOWS
			volDepthSize = depthSize;
			volClipOrigin = uniforms.volViewProjection * vec4f(uniforms.volCameraPosition, 1.0);
			volClipDirection = uniforms.volViewProjection * vec4f(volRayDir, 0.0);
		#endif

		#if VOL_TRANSMITTANCE == 2
			volBuildOpticalDepths(tStart, tEnd);
		#endif

		#ifdef VOL_CSM
			volPrepareCsm();
		#endif

		// The in-scattering of the constant ambient light has a closed form whatever the medium. @see the GLSL version.
		var accumulated = uniforms.volAmbient * (volTransmittance(tStart) - volTransmittance(tEnd));
		var lightResult = vec4f(0.0);

		#if VOL_GLOBAL_LIGHT_COUNT > 0
			lightResult = volMarchGlobalLights(tStart, tEnd);
			accumulated += lightResult.xyz;
			evaluatedLights += lightResult.w;
		#endif

${localSlotContributions.join("")}

		#if VOL_LOCAL_ARRAY_LIGHTS == 1
			let localEnd = VOL_DIRECTIONAL_LIGHT_COUNT + i32(uniforms.volParams.w + 0.5);

			for (var i: i32 = VOL_DIRECTIONAL_LIGHT_COUNT; i < VOL_MAX_ARRAY_LIGHTS; i++) {
				if (i >= localEnd) {
					break;
				}

				lightResult = volIntegrateArrayLight(i, tStart, tEnd);
				accumulated += lightResult.xyz;
				evaluatedLights += lightResult.w;
			}
		#endif

		// The scattering coefficient is a fraction of the extinction, which guarantees energy conservation.
		result = accumulated * uniforms.volMedium.x * uniforms.volFogColor;
		finalTransmittance = volTransmittance(tEnd);
	}

	#if VOL_DEBUG == 3
		// From blue for no light to red for 16 lights or more evaluated by the pixel.
		let ratioOfBudget = clamp(evaluatedLights / 16.0, 0.0, 1.0);
		result = vec3f(ratioOfBudget, 1.0 - abs(ratioOfBudget * 2.0 - 1.0), 1.0 - ratioOfBudget);
	#endif

	#ifdef VOL_LDR_ENCODE
		result = result / (1.0 + result);
	#endif

	fragmentOutputs.color = vec4f(result, finalTransmittance);
}
`;
}

/**
 * The temporal accumulation pass. @see buildVolumetricLightingTemporalShader.
 */
export function buildVolumetricLightingTemporalShaderWGSL(): string {
	return /* wgsl */ `
varying vUV: vec2f;

var textureSampler: texture_2d<f32>;
var volHistorySamplerSampler: sampler;
var volHistorySampler: texture_2d<f32>;
var volLinearDepthSampler: texture_2d<f32>;

uniform volCameraMinMaxZ: vec2f;
uniform volDepthRatio: vec2f;
uniform volInverseViewProjection: mat4x4f;
uniform volCameraPosition: vec3f;
uniform volCameraForward: vec3f;
uniform volPreviousViewProjection: mat4x4f;

// (weight of the current frame, width of the clipping in standard deviations, maximum distance of the march,
// 1 when the history holds the previous frame, 2 when the previous frame had nothing to draw)
uniform volTemporalParams: vec4f;

// (distance the camera moved since the previous frame, part of the medium along the view ray whose change the
// delay of the history may lag behind)
uniform volTemporalMotion: vec2f;

${packingHelpers}
${buildLinearDepthHelpers("volLinearDepthSampler")}

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
	let texel = vec2i(fragmentInputs.position.xy);
	let size = vec2i(textureDimensions(textureSampler));

	// Bounded so a light next to the camera, which a half float can't hold, never turns the history infinite.
	let current = min(textureLoad(textureSampler, texel, 0), vec4f(65000.0));
	var result = current;

	// WGSL has no early return from the fragment entry point, the accumulation is guarded instead.
	if (uniforms.volTemporalParams.w > 0.5) {
		// The end of the marched part of the view ray is reprojected in the previous frame. @see the GLSL version.
		let depthSize = vec2i(textureDimensions(volLinearDepthSampler));
		let viewZ = volReadLinearDepth(volScatterToDepthTexel(texel, depthSize));

		let farPoint = uniforms.volInverseViewProjection * vec4f(input.vUV * 2.0 - 1.0, 1.0, 1.0);
		let rayDir = normalize(farPoint.xyz / farPoint.w - uniforms.volCameraPosition);
		let t = min(viewZ / max(dot(rayDir, uniforms.volCameraForward), 1e-4), uniforms.volTemporalParams.z);

		let previousClip = uniforms.volPreviousViewProjection * vec4f(rayDir * t, 1.0);
		let previousUV = (previousClip.xy / previousClip.w) * 0.5 + 0.5;

		// Clamped so a position reprojected off the screen still reads a valid texel: whether the history is used
		// at all is decided below. Nothing to draw the previous frame: no light at all, seen through the same medium.
		let sampled = textureSampleLevel(volHistorySampler, volHistorySamplerSampler, clamp(previousUV, vec2f(0.0), vec2f(1.0)), 0.0);
		let history = select(sampled, vec4f(0.0, 0.0, 0.0, current.a), uniforms.volTemporalParams.w > 1.5);

		let inside = previousClip.w > 0.0 && all(previousUV >= vec2f(0.0)) && all(previousUV <= vec2f(1.0));

		// A history holding an infinity or a NaN would never recover from it.
		let finite = all(abs(history) < vec4f(1e20));

		if (inside && finite) {
			// Variance clipping: the history is kept within what the current frame shows around the pixel.
			var m1 = vec4f(0.0);
			var m2 = vec4f(0.0);

			for (var y: i32 = -1; y <= 1; y++) {
				for (var x: i32 = -1; x <= 1; x++) {
					let c = min(textureLoad(textureSampler, clamp(texel + vec2i(x, y), vec2i(0), size - 1), 0), vec4f(65000.0));
					m1 += c;
					m2 += c * c;
				}
			}

			let mean = m1 * (1.0 / 9.0);
			let sigma = sqrt(max(m2 * (1.0 / 9.0) - mean * mean, vec4f(0.0)));
			let clipped = clamp(history, mean - uniforms.volTemporalParams.y * sigma, mean + uniforms.volTemporalParams.y * sigma);

			// Moving the camera changes the medium along the view ray, the history is trusted less. @see the GLSL version.
			let motion = uniforms.volTemporalMotion.x / max(t, 1e-3);
			let factor = max(uniforms.volTemporalParams.x, motion / (motion + uniforms.volTemporalMotion.y));

			// The transmittance only depends on the length of medium in front of the surface. @see the GLSL version.
			let transmittanceChange = abs(history.a - current.a) / max(max(history.a, current.a), 1e-3);
			let historyWeight = (1.0 - factor) * (1.0 - smoothstep(0.02, 0.15, transmittanceChange));

			result = mix(current, clipped, historyWeight);
		}
	}

	fragmentOutputs.color = result;
}
`;
}

/**
 * The separable bilateral blur pass. @see buildVolumetricLightingBlurShader.
 */
export function buildVolumetricLightingBlurShaderWGSL(): string {
	return /* wgsl */ `
varying vUV: vec2f;

var textureSampler: texture_2d<f32>;
var volLinearDepthSampler: texture_2d<f32>;

uniform volCameraMinMaxZ: vec2f;
uniform volDepthRatio: vec2f;
uniform volBlurDirection: vec2f;
uniform volBlurParams: vec2f;

// (1 when the pipeline has nothing to draw this frame, unused, unused, unused)
uniform volPassParams: vec4f;

${packingHelpers}
${buildLinearDepthHelpers("volLinearDepthSampler")}

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
	// Nothing to draw this frame: the composition doesn't read the scattering buffer.
	if (uniforms.volPassParams.x > 0.5) {
		fragmentOutputs.color = vec4f(0.0, 0.0, 0.0, 1.0);
	} else {
		// Every tap is an exact texel compared using the depth the raymarching used for it. @see the GLSL version.
		let size = vec2i(textureDimensions(textureSampler));
		let depthSize = vec2i(textureDimensions(volLinearDepthSampler));
		let center = vec2i(fragmentInputs.position.xy);
		let direction = vec2i(uniforms.volBlurDirection);

		let centerDepth = volReadLinearDepth(volScatterToDepthTexel(center, depthSize));
		let inverseDepthThreshold = 1.0 / max(uniforms.volBlurParams.y * max(centerDepth, uniforms.volCameraMinMaxZ.x), 1e-4);
		let sigma = max(uniforms.volBlurParams.x, 1e-4);
		let inverseTwoSigma2 = 1.0 / (2.0 * sigma * sigma);

		var result = textureLoad(textureSampler, center, 0);
		var totalWeight = 1.0;

		for (var i: i32 = 1; i <= VOL_BLUR_RADIUS; i++) {
			let spatialWeight = exp(-f32(i * i) * inverseTwoSigma2);

			let positive = center + direction * i;
			let negative = center - direction * i;

			if (positive.x < size.x && positive.y < size.y) {
				let weight = spatialWeight * exp(-abs(volReadLinearDepth(volScatterToDepthTexel(positive, depthSize)) - centerDepth) * inverseDepthThreshold);
				result += textureLoad(textureSampler, positive, 0) * weight;
				totalWeight += weight;
			}

			if (negative.x >= 0 && negative.y >= 0) {
				let weight = spatialWeight * exp(-abs(volReadLinearDepth(volScatterToDepthTexel(negative, depthSize)) - centerDepth) * inverseDepthThreshold);
				result += textureLoad(textureSampler, negative, 0) * weight;
				totalWeight += weight;
			}
		}

		fragmentOutputs.color = result / totalWeight;
	}
}
`;
}

/**
 * The composition pass. @see buildVolumetricLightingComposeShader.
 */
export function buildVolumetricLightingComposeShaderWGSL(): string {
	return /* wgsl */ `
varying vUV: vec2f;

var textureSampler: texture_2d<f32>;
var volSceneSamplerSampler: sampler;
var volSceneSampler: texture_2d<f32>;
var volLinearDepthSampler: texture_2d<f32>;

uniform volCameraMinMaxZ: vec2f;
uniform volDepthRatio: vec2f;
uniform volComposeParams: vec4f;

// (1 when the pipeline has nothing to draw this frame, unused, unused, unused)
uniform volPassParams: vec4f;

${packingHelpers}
${buildLinearDepthHelpers("volLinearDepthSampler")}

fn volMod(x: f32, y: f32) -> f32 {
	return x - y * floor(x / y);
}

fn volBayer8(p: vec2f) -> f32 {
	let p1 = vec2f(volMod(floor(p.x), 2.0), volMod(floor(p.y), 2.0));
	let p2 = vec2f(volMod(floor(p.x * 0.5), 2.0), volMod(floor(p.y * 0.5), 2.0));
	let p3 = vec2f(volMod(floor(p.x * 0.25), 2.0), volMod(floor(p.y * 0.25), 2.0));

	let b1 = 2.0 * p1.x + 3.0 * p1.y - 4.0 * p1.x * p1.y;
	let b2 = 2.0 * p2.x + 3.0 * p2.y - 4.0 * p2.x * p2.y;
	let b3 = 2.0 * p3.x + 3.0 * p3.y - 4.0 * p3.x * p3.y;

	return (b1 * 16.0 + b2 * 4.0 + b3) / 64.0;
}

// Nearest depth upsampling. @see the GLSL version.
fn volUpsample(uv0: vec2f, centerDepth: f32, depthSize: vec2i) -> vec4f {
	let size = vec2i(textureDimensions(textureSampler));
	let texelCoordinate = uv0 * vec2f(size) - 0.5;
	let baseCoordinate = floor(texelCoordinate);
	let fraction = texelCoordinate - baseCoordinate;

	let base = vec2i(baseCoordinate);
	let maximum = size - vec2i(1);

	let inverseDepthThreshold = 1.0 / max(uniforms.volComposeParams.z * max(centerDepth, uniforms.volCameraMinMaxZ.x), 1e-4);

	var result = vec4f(0.0);
	var totalWeight = 0.0;

	var nearestSample = vec4f(0.0);
	var nearestDistance = 1e20;

	for (var y: i32 = 0; y < 2; y++) {
		for (var x: i32 = 0; x < 2; x++) {
			let coordinates = clamp(base + vec2i(x, y), vec2i(0), maximum);

			let bilinearWeight = select(fraction.x, 1.0 - fraction.x, x == 0) * select(fraction.y, 1.0 - fraction.y, y == 0);
			let depthDistance = abs(volReadLinearDepth(volScatterToDepthTexel(coordinates, depthSize)) - centerDepth);

			let tap = textureLoad(textureSampler, coordinates, 0);

			if (depthDistance < nearestDistance) {
				nearestDistance = depthDistance;
				nearestSample = tap;
			}

			let weight = bilinearWeight / (1e-4 + depthDistance * inverseDepthThreshold);
			result += tap * weight;
			totalWeight += weight;
		}
	}

	// Every tap sits on the other side of a silhouette, fall back to the closest one instead of averaging.
	return select(nearestSample, result / totalWeight, totalWeight > 1e-4);
}

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
	// Nothing to draw this frame: the color of the scene passes through. @see the GLSL version.
	if (uniforms.volPassParams.x > 0.5) {
		let sceneColor = textureSampleLevel(volSceneSampler, volSceneSamplerSampler, input.vUV, 0.0).rgb;
		fragmentOutputs.color = vec4f(sceneColor + (volBayer8(fragmentInputs.position.xy) - 0.5) * uniforms.volComposeParams.w, 1.0);
	} else {
		// The linear depth has the full resolution of the canvas. @see the GLSL version.
		let depthSize = vec2i(textureDimensions(volLinearDepthSampler));
		let centerDepth = volReadLinearDepth(min(vec2i(input.vUV * vec2f(depthSize)), depthSize - 1));

		var volumetric = volUpsample(input.vUV, centerDepth, depthSize);

		#ifdef VOL_LDR_ENCODE
			volumetric = vec4f(volumetric.rgb / max(vec3f(1e-4), 1.0 - volumetric.rgb), volumetric.a);
		#endif

		// WGSL has no early return from the fragment entry point, so the debug outputs are branches instead.
		#if VOL_DEBUG == 1 || VOL_DEBUG == 3
			fragmentOutputs.color = vec4f(volumetric.rgb * uniforms.volComposeParams.x, 1.0);
		#elif VOL_DEBUG == 2
			fragmentOutputs.color = vec4f(vec3f(volumetric.a), 1.0);
		#else
			var sceneColor = textureSampleLevel(volSceneSampler, volSceneSamplerSampler, input.vUV, 0.0).rgb;

			sceneColor *= mix(1.0, volumetric.a, uniforms.volComposeParams.y);

			var result = sceneColor + volumetric.rgb * uniforms.volComposeParams.x;

			// Breaks up the banding an 8 bits output would otherwise show on the smooth gradients of the shafts.
			result += (volBayer8(fragmentInputs.position.xy) - 0.5) * uniforms.volComposeParams.w;

			fragmentOutputs.color = vec4f(result, 1.0);
		#endif
	}
}
`;
}

/**
 * Returns the WGSL sources of the passes of the pipeline, keyed by the name they are registered under.
 */
export function getVolumetricLightingShadersWGSL(): Record<string, string> {
	return {
		linearDepth: buildVolumetricLightingLinearDepthShaderWGSL(),
		scattering: buildVolumetricLightingScatteringShaderWGSL(maxVolumetricShadowSlots),
		temporal: buildVolumetricLightingTemporalShaderWGSL(),
		blur: buildVolumetricLightingBlurShaderWGSL(),
		compose: buildVolumetricLightingComposeShaderWGSL(),
	};
}
