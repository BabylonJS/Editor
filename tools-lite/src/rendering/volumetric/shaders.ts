import { maxVolumetricShadowSlots } from "./types";

/**
 * WGSL sources of the passes of the volumetric lighting rendering pipeline, ported from the WGSL version of the
 * Babylon.js version of the tools ("rendering/volumetric/shaders-wgsl.ts"). The sources keep the declarations of the
 * Babylon.js shaders ("uniform", "var" textures and samplers) and its preprocessor directives: they are processed
 * using `preprocessWGSL` and turned into Babylon Lite effects using `buildWGSLEffectShader`.
 *
 * Differences with the Babylon.js version, which emulates the conventions of WebGL on WebGPU:
 * - the UV origin of the fullscreen pass is the top-left corner and the V axis points down, like the textures of
 *   WebGPU: only the reconstruction of the view rays flips it,
 * - the depth of the scene is the view space Z written by the geometry renderer of Babylon Lite (0 where nothing
 *   was drawn), read directly by every pass instead of being extracted by a pass of its own,
 * - the projection of the cameras of Babylon Lite reverses the depth, the near plane is at 1,
 * - the shadow maps of Babylon Lite store the depth in [0, 1] and are read with the V axis pointing down, and Babylon
 *   Lite has no shadow maps for the point lights,
 * - every render target holds floats on WebGPU: nothing is packed in 8 bits textures,
 * - the materials of Babylon Lite apply the image processing (exposure, tone mapping and contrast), so the composition
 *   turns the color of the scene back into linear values, adds the light shafts and applies the image processing again.
 */

/**
 * Reads the linear depth of the scene. Requires the "volLinearDepthTexture" texture and the "volCameraMinMaxZ" and
 * "volDepthRatio" uniforms.
 */
const linearDepthHelpers = /* wgsl */ `
// Returns the distance along the view axis, in scene units, of the texel at the given coordinates. The geometry renderer
// of Babylon Lite writes the view space Z of the surfaces and 0 where nothing was drawn, which is the sky: like the far
// plane of the camera.
fn volReadLinearDepth(coordinates: vec2i) -> f32 {
	let viewZ = abs(textureLoad(volLinearDepthTexture, coordinates, 0).r);
	return select(min(viewZ, uniforms.volCameraMinMaxZ.y), uniforms.volCameraMinMaxZ.y, viewZ <= 0.0);
}

// Returns the texel of the linear depth under the center of the given texel of the scattering buffer.
// The ratio is computed on the CPU so every pass associates each texel of the scattering buffer with the same texel of
// the linear depth.
fn volScatterToDepthTexel(scatterTexel: vec2i, depthSize: vec2i) -> vec2i {
	return min(vec2i((vec2f(scatterTexel) + 0.5) * uniforms.volDepthRatio), depthSize - 1);
}
`;

/**
 * Converts between the UV of the fullscreen passes and the clip space of the camera. Requires the
 * "volInverseViewProjection" uniform.
 */
const viewRayHelpers = /* wgsl */ `
// Returns the direction of the view ray going through the given UV, relative to the camera. The near plane of the
// reversed depth of Babylon Lite is at 1 and "volInverseViewProjection" ignores the position of the camera, which keeps
// the precision whatever the distance of the camera to the origin.
fn volGetRayDirection(uv: vec2f) -> vec3f {
	let nearPoint = uniforms.volInverseViewProjection * vec4f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, 1.0, 1.0);
	return normalize(nearPoint.xyz / nearPoint.w);
}

// Returns the UV of the given clip space position.
fn volClipToUV(clip: vec4f) -> vec2f {
	let ndc = clip.xy / clip.w;
	return vec2f(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
}
`;

/**
 * Generates the loop integrating the in-scattering of a point or a spot light over the part of the view ray
 * crossing its volume. @see the Babylon.js version of the tools.
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
 * The raymarching pass. Integrates the single scattering of the light of the selected lights through the participating
 * medium described by the pipeline, between the camera and the surfaces of the scene. @see the Babylon.js version of the tools.
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
	#if VOL_SHADOW_KIND{X} == 1
		var volShadowSampler{X}Sampler: sampler_comparison;
		var volShadowSampler{X}: texture_depth_2d;
	#else
		var volShadowSampler{X}Sampler: sampler;
		var volShadowSampler{X}: texture_2d<f32>;
	#endif

	// Returns the shadowing of a point given its position relative to the camera and its position in the clip space of
	// the light. The shadow maps of Babylon Lite store the depth in [0, 1] and are read with the V axis pointing down.
	fn volShadow{X}(position: vec3f, clip: vec4f) -> f32 {
		let info = uniforms.volShadowInfo[{X}];
		let edge = uniforms.volShadowLightFalloff[{X}].z;

		let clipSpace = clip.xyz / clip.w;
		let uv = vec2f(0.5 * clipSpace.x + 0.5, 0.5 - 0.5 * clipSpace.y);

		#if VOL_SHADOW_KIND{X} == 1
			// Same guard as the PCF of Babylon Lite: past the far plane of the shadow map the hardware comparison would
			// fail against every texel a caster wrote, reporting the sample as occluded while the surfaces at the same
			// distance are lit by the material path.
			let pcfDepthMetric = volDepthMetric(clip, info.zw);
			if (pcfDepthMetric < 0.0 || pcfDepthMetric > 1.0 || uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
				return 1.0;
			}

			let depth = clamp(clipSpace.z, 0.0, 1.0);

			// Hardware comparison sampling. "info.y" holds the inverse of the size of the shadow map.
			#if VOL_PCF_TAPS == 4
				let shadow = 0.25 * (
					textureSampleCompareLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, uv + vec2f(-0.5 * info.y, -0.5 * info.y), depth) +
					textureSampleCompareLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, uv + vec2f( 0.5 * info.y, -0.5 * info.y), depth) +
					textureSampleCompareLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, uv + vec2f(-0.5 * info.y,  0.5 * info.y), depth) +
					textureSampleCompareLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, uv + vec2f( 0.5 * info.y,  0.5 * info.y), depth)
				);
			#else
				let shadow = textureSampleCompareLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, uv, depth);
			#endif

			return volFallOff(mix(info.x, 1.0, shadow), clipSpace.xy, edge);
		#else
			if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
				return 1.0;
			}

			let depthMetric = clamp(volDepthMetric(clip, info.zw), 0.0, 1.0);
			let shadowMapSample = textureSampleLevel(volShadowSampler{X}, volShadowSampler{X}Sampler, uv, 0.0).x;

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
						// Recomputed rather than kept affine to keep fewer registers alive across the march.
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
// Full resolution linear depth of the scene, written by the geometry renderer of Babylon Lite.
var volLinearDepthTexture: texture_2d<f32>;

// Ratio between the resolution of the linear depth and the resolution of the scattering buffer.
uniform volDepthRatio: vec2f;

// Inverse of the view projection matrix of the camera, without the position of the camera.
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

	var volCsmSamplerSampler: sampler_comparison;
	var volCsmSampler: texture_depth_2d_array;
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

${linearDepthHelpers}
${viewRayHelpers}

fn volMod(x: f32, y: f32) -> f32 {
	return x - y * floor(x / y);
}

fn volFallOff(value: f32, clipSpaceXY: vec2f, frustumEdgeFalloff: f32) -> f32 {
	let mask = smoothstep(1.0 - frustumEdgeFalloff, 1.00000012, clamp(dot(clipSpaceXY, clipSpaceXY), 0.0, 1.0));
	return mix(value, 1.0, mask);
}

// Reproduces the depth metric computed by the shadows of Babylon Lite: the raw clip space Z is used, without the
// perspective divide, so the comparison matches what the shadow map stores.
fn volDepthMetric(clip: vec4f, depthValues: vec2f) -> f32 {
	return (clip.z + depthValues.x) / depthValues.y;
}

// Henyey-Greenstein phase function, normalised to 1 for an isotropic medium.
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

// Returns the offset of the samples of a light inside their strata.
fn volStratumOffset(seed: f32) -> f32 {
	#if VOL_DITHER == 0
		return 0.5;
	#else
		return mix(0.5, fract(volNoise + seed * 0.618034), uniforms.volParams.y);
	#endif
}

// sigma(t) = -d/dt ln(T(t)), the exact analytic derivative of the optical depth.
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
// its way to that point.
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
	// given in clip space, where it is affine.
	fn volScreenShadow(clipStart: vec4f, clipDelta: vec4f, depthStart: f32, depthDelta: f32) -> f32 {
		for (var i: i32 = 1; i <= VOL_SCREEN_SHADOW_STEPS; i++) {
			let u = (f32(i) + volJitter) * (1.0 / f32(VOL_SCREEN_SHADOW_STEPS + 1));

			let clip = clipStart + clipDelta * u;
			if (clip.w <= 0.0) {
				continue;
			}

			let uv = volClipToUV(clip);
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

	// Same linear attenuation as "computeLighting" in the "lightsFragmentFunctions" include of Babylon.js.
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

// Returns the part of the view ray, as distances to the camera, crossing the volume a point or a spot light reaches.
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

// Returns the number of samples taken over the given chord of a light.
fn volLocalSampleCount(chordLength: f32, range: f32, rayLength: f32) -> i32 {
	let count = max(f32(VOL_LIGHT_STEPS) * chordLength / (2.0 * range), f32(VOL_STEPS) * chordLength / rayLength);
	return clamp(i32(ceil(count)), 2, VOL_LOCAL_MAX_STEPS);
}

${slots.join("\n")}

#ifdef VOL_CSM
	// The parts of the view ray inside the box of each cascade, and the clip space position of the view ray in the
	// current cascade.
	var<private> volCsmEntries: vec4f;
	var<private> volCsmExits: vec4f;
	var<private> volCsmCurrent: i32;
	var<private> volCsmClipOrigin: vec4f;
	var<private> volCsmClipDirection: vec4f;

	// Returns the part of the view ray inside the box of a cascade.
	fn volCsmBoxInterval(origin: vec4f, direction: vec4f) -> vec2f {
		let boxMin = vec3f(-0.96, -0.96, 0.0);
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
		let uv = vec2f(0.5 * clipSpace.x + 0.5, 0.5 - 0.5 * clipSpace.y);

		let shadow = textureSampleCompareLevel(volCsmSampler, volCsmSamplerSampler, uv, cascade, clamp(clipSpace.z, 0.0, 0.99999994));
		return volFallOff(mix(uniforms.volCsmInfo.x, 1.0, shadow), clipSpace.xy, uniforms.volCsmLightFalloff.z);
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

			// Analytic integral of the in-scattering over the segment.
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
fn effectFragment(input: VertexOutput) -> @location(0) vec4f {
	volRayDir = volGetRayDirection(input.uv);

	// The depth map stores the distance along the view axis, the ray is not aligned with it.
	volCosForward = max(dot(volRayDir, uniforms.volCameraForward), 1e-4);
	let pixel = input.position.xy;
	let depthSize = vec2i(textureDimensions(volLinearDepthTexture));
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
			// Each pixel walks the golden ratio sequence from the offset of its dithering pattern.
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

		// The in-scattering of the constant ambient light has a closed form whatever the medium.
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

	return vec4f(result, finalTransmittance);
}
`;
}

/**
 * The temporal accumulation pass: blends the result of the raymarching with the result of the previous frames,
 * reprojected on the current view. @see the Babylon.js version of the tools.
 */
export function buildVolumetricLightingTemporalShaderWGSL(): string {
	return /* wgsl */ `
var textureSampler: texture_2d<f32>;
var volHistorySamplerSampler: sampler;
var volHistorySampler: texture_2d<f32>;
var volLinearDepthTexture: texture_2d<f32>;

uniform volCameraMinMaxZ: vec2f;
uniform volDepthRatio: vec2f;
uniform volInverseViewProjection: mat4x4f;
uniform volCameraForward: vec3f;

// View projection matrix of the previous frame, applied to positions relative to the current camera.
uniform volPreviousViewProjection: mat4x4f;

// (weight of the current frame, width of the clipping in standard deviations, maximum distance of the march,
// 1 when the history holds the previous frame, 2 when the previous frame had nothing to draw)
uniform volTemporalParams: vec4f;

// (distance the camera moved since the previous frame, part of the medium along the view ray whose change the
// delay of the history may lag behind)
uniform volTemporalMotion: vec2f;

${linearDepthHelpers}
${viewRayHelpers}

@fragment
fn effectFragment(input: VertexOutput) -> @location(0) vec4f {
	let texel = vec2i(input.position.xy);
	let size = vec2i(textureDimensions(textureSampler));

	// Bounded so a light next to the camera, which a half float can't hold, never turns the history infinite.
	let current = min(textureLoad(textureSampler, texel, 0), vec4f(65000.0));
	var result = current;

	// WGSL has no early return from the fragment entry point, the accumulation is guarded instead.
	if (uniforms.volTemporalParams.w > 0.5) {
		// The end of the marched part of the view ray is reprojected in the previous frame.
		let depthSize = vec2i(textureDimensions(volLinearDepthTexture));
		let viewZ = volReadLinearDepth(volScatterToDepthTexel(texel, depthSize));

		let rayDir = volGetRayDirection(input.uv);
		let t = min(viewZ / max(dot(rayDir, uniforms.volCameraForward), 1e-4), uniforms.volTemporalParams.z);

		let previousClip = uniforms.volPreviousViewProjection * vec4f(rayDir * t, 1.0);
		let previousUV = volClipToUV(previousClip);

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

			// Moving the camera changes the medium along the view ray, the history is trusted less.
			let motion = uniforms.volTemporalMotion.x / max(t, 1e-3);
			let factor = max(uniforms.volTemporalParams.x, motion / (motion + uniforms.volTemporalMotion.y));

			// The transmittance only depends on the length of medium in front of the surface.
			let transmittanceChange = abs(history.a - current.a) / max(max(history.a, current.a), 1e-3);
			let historyWeight = (1.0 - factor) * (1.0 - smoothstep(0.02, 0.15, transmittanceChange));

			result = mix(current, clipped, historyWeight);
		}
	}

	return result;
}
`;
}

/**
 * The separable bilateral blur pass, denoising the result of the raymarching. @see the Babylon.js version of the tools.
 */
export function buildVolumetricLightingBlurShaderWGSL(): string {
	return /* wgsl */ `
var textureSampler: texture_2d<f32>;
var volLinearDepthTexture: texture_2d<f32>;

uniform volCameraMinMaxZ: vec2f;
uniform volDepthRatio: vec2f;
uniform volBlurDirection: vec2f;
uniform volBlurParams: vec2f;

${linearDepthHelpers}

@fragment
fn effectFragment(input: VertexOutput) -> @location(0) vec4f {
	// Every tap is an exact texel compared using the depth the raymarching used for it.
	let size = vec2i(textureDimensions(textureSampler));
	let depthSize = vec2i(textureDimensions(volLinearDepthTexture));
	let center = vec2i(input.position.xy);
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

	return result / totalWeight;
}
`;
}

/**
 * The image processing applied by the materials of Babylon Lite (exposure, tone mapping, conversion to gamma space and
 * contrast) and its inverse, used by the composition pass. "VOL_TONEMAPPING" is 0 without tone mapping, 1 for ACES,
 * 2 for the Khronos PBR neutral tone mapping and 3 for the standard (exponential) tone mapping.
 */
const imageProcessingHelpers = /* wgsl */ `
#if VOL_TONEMAPPING == 1
	const volACESInputMat = mat3x3f(vec3f(0.59719, 0.07600, 0.02840), vec3f(0.35458, 0.90834, 0.13383), vec3f(0.04823, 0.01566, 0.83777));
	const volACESOutputMat = mat3x3f(vec3f(1.60475, -0.10208, -0.00327), vec3f(-0.53108, 1.10813, -0.07276), vec3f(-0.07367, -0.00605, 1.07602));

	// Inverses of the matrices above.
	const volACESInputMatInverse = mat3x3f(vec3f(1.76474097, -0.14702785, -0.03633683), vec3f(-0.67577768, 1.16025151, -0.16243644), vec3f(-0.08896329, -0.01322366, 1.19877327));
	const volACESOutputMatInverse = mat3x3f(vec3f(0.64303825, 0.05926869, 0.00596190), vec3f(0.31118675, 0.93143649, 0.06392902), vec3f(0.04577546, 0.00929492, 0.93011838));

	fn volRRTAndODTFit(v: vec3f) -> vec3f {
		let a = v * (v + 0.0245786) - 0.000090537;
		let b = v * (0.983729 * v + 0.4329510) + 0.238081;
		return a / b;
	}

	// Positive root of "(v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.4329510) + 0.238081) = y".
	fn volInverseRRTAndODTFit(value: vec3f) -> vec3f {
		let y = clamp(value, vec3f(0.0), vec3f(1.0));
		let a = 1.0 - 0.983729 * y;
		let b = 0.0245786 - 0.4329510 * y;
		let c = -(0.000090537 + 0.238081 * y);
		return (-b + sqrt(max(b * b - 4.0 * a * c, vec3f(0.0)))) / (2.0 * a);
	}
#elif VOL_TONEMAPPING == 2
	const volPBRNeutralStartCompression: f32 = 0.8 - 0.04;
	const volPBRNeutralDesaturation: f32 = 0.15;

	fn volPBRNeutralToneMapping(color: vec3f) -> vec3f {
		let x = min(color.r, min(color.g, color.b));
		let offset = select(0.04, x - 6.25 * x * x, x < 0.08);
		var result = color - offset;
		let peak = max(result.r, max(result.g, result.b));
		if (peak < volPBRNeutralStartCompression) {
			return result;
		}
		let d = 1.0 - volPBRNeutralStartCompression;
		let newPeak = 1.0 - d * d / (peak + d - volPBRNeutralStartCompression);
		result *= newPeak / peak;
		let g = 1.0 - 1.0 / (volPBRNeutralDesaturation * (peak - newPeak) + 1.0);
		return mix(result, newPeak * vec3f(1.0), g);
	}
#endif

// Same as the end of the PBR materials of Babylon Lite: exposure, tone mapping, gamma space and contrast.
fn volApplyImageProcessing(linear: vec3f) -> vec3f {
	var color = linear * uniforms.volImageProcessing.x;

	#if VOL_TONEMAPPING == 1
		color = saturate(volACESOutputMat * volRRTAndODTFit(volACESInputMat * color));
	#elif VOL_TONEMAPPING == 2
		color = volPBRNeutralToneMapping(color);
	#elif VOL_TONEMAPPING == 3
		color = 1.0 - exp2(-1.590579 * color);
	#endif

	color = clamp(pow(max(color, vec3f(0.0)), vec3f(1.0 / 2.2)), vec3f(0.0), vec3f(1.0));

	let contrast = uniforms.volImageProcessing.y;
	let highContrast = color * color * (3.0 - 2.0 * color);
	if (contrast < 1.0) {
		color = mix(vec3f(0.5), color, contrast);
	} else {
		color = mix(color, highContrast, contrast - 1.0);
	}

	return max(color, vec3f(0.0));
}

// Returns the color written by the composition: processed only when the image processing is applied after the light shafts.
fn volImageProcessingOutput(color: vec3f) -> vec3f {
	#ifdef VOL_LINEAR_COMPOSE
		return volApplyImageProcessing(color);
	#else
		return color;
	#endif
}

// Inverse of "volApplyImageProcessing", exact except for the colors the clamping saturated.
fn volInverseImageProcessing(color: vec3f) -> vec3f {
	var c = clamp(color, vec3f(0.0), vec3f(1.0));

	let contrast = uniforms.volImageProcessing.y;
	if (contrast < 1.0) {
		c = select(vec3f(0.5), clamp((c - 0.5 * (1.0 - contrast)) / contrast, vec3f(0.0), vec3f(1.0)), contrast > 0.0);
	} else if (contrast > 1.0) {
		// The contrast curve is monotonic on [0, 1]: inverted by bisection.
		let amount = contrast - 1.0;
		var low = vec3f(0.0);
		var high = vec3f(1.0);

		for (var i: i32 = 0; i < 16; i++) {
			let middle = (low + high) * 0.5;
			let value = middle + (middle * middle * (3.0 - 2.0 * middle) - middle) * amount;
			let below = value < c;

			low = select(low, middle, below);
			high = select(middle, high, below);
		}

		c = (low + high) * 0.5;
	}

	c = pow(c, vec3f(2.2));

	#if VOL_TONEMAPPING == 1
		c = max(volACESInputMatInverse * volInverseRRTAndODTFit(volACESOutputMatInverse * c), vec3f(0.0));
	#elif VOL_TONEMAPPING == 2
		// The neutral tone mapping mixes the channels: inverted by fixed point iterations, as it never expands the colors.
		let toneMapped = c;
		for (var i: i32 = 0; i < 12; i++) {
			c = max(c + (toneMapped - volPBRNeutralToneMapping(c)), vec3f(0.0));
		}
	#elif VOL_TONEMAPPING == 3
		c = -log2(max(1.0 - c, vec3f(1e-6))) / 1.590579;
	#endif

	return c / max(uniforms.volImageProcessing.x, 1e-6);
}
`;

/**
 * The composition pass: upsamples the light shafts and adds them to the color of the scene. @see the Babylon.js version
 * of the tools.
 */
export function buildVolumetricLightingComposeShaderWGSL(): string {
	return /* wgsl */ `
var textureSampler: texture_2d<f32>;
var volSceneSamplerSampler: sampler;
var volSceneSampler: texture_2d<f32>;
var volLinearDepthTexture: texture_2d<f32>;

uniform volCameraMinMaxZ: vec2f;
uniform volDepthRatio: vec2f;

// (intensity, extinction amount, upsampling depth threshold, unused)
uniform volComposeParams: vec4f;

// (1 when the pipeline has nothing to draw this frame, unused, unused, unused)
uniform volPassParams: vec4f;

// (exposure, contrast, unused, unused) of the image processing applied by the materials.
uniform volImageProcessing: vec4f;

${linearDepthHelpers}
${imageProcessingHelpers}

// Nearest depth upsampling.
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
fn effectFragment(input: VertexOutput) -> @location(0) vec4f {
	let sceneColor = textureSampleLevel(volSceneSampler, volSceneSamplerSampler, input.uv, 0.0);

	// Nothing to draw this frame: the color of the scene passes through.
	var output = sceneColor;

	if (uniforms.volPassParams.x < 0.5) {
		// The linear depth has the full resolution of the canvas.
		let depthSize = vec2i(textureDimensions(volLinearDepthTexture));
		let centerDepth = volReadLinearDepth(min(vec2i(input.uv * vec2f(depthSize)), depthSize - 1));

		let volumetric = volUpsample(input.uv, centerDepth, depthSize);

		#if VOL_DEBUG == 1 || VOL_DEBUG == 3
			output = vec4f(volImageProcessingOutput(volumetric.rgb * uniforms.volComposeParams.x), 1.0);
		#elif VOL_DEBUG == 2
			output = vec4f(volImageProcessingOutput(vec3f(volumetric.a)), 1.0);
		#else
			#ifdef VOL_LINEAR_COMPOSE
				// The image processing of Babylon.js is applied by its post-process, after the light shafts are composed: the
				// image processing the materials of Babylon Lite applied is inverted, the light shafts are added to the linear
				// color of the scene and the image processing is applied again.
				var color = volInverseImageProcessing(sceneColor.rgb);
			#else
				// The image processing of Babylon.js is applied by the materials: the light shafts are added to the color of
				// the scene as it is stored.
				var color = sceneColor.rgb;
			#endif

			color *= mix(1.0, volumetric.a, uniforms.volComposeParams.y);
			color += volumetric.rgb * uniforms.volComposeParams.x;

			output = vec4f(volImageProcessingOutput(color), sceneColor.a);
		#endif
	}

	return output;
}
`;
}

/**
 * Returns the WGSL sources of the passes of the pipeline, keyed by the name of the pass.
 */
export function getVolumetricLightingShadersWGSL(): Record<string, string> {
	return {
		scattering: buildVolumetricLightingScatteringShaderWGSL(maxVolumetricShadowSlots),
		temporal: buildVolumetricLightingTemporalShaderWGSL(),
		blur: buildVolumetricLightingBlurShaderWGSL(),
		compose: buildVolumetricLightingComposeShaderWGSL(),
	};
}
