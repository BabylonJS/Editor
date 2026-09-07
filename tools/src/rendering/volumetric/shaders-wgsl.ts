import { maxVolumetricShadowSlots } from "./types";

/**
 * WGSL version of the three passes of the volumetric lighting rendering pipeline, for WebGPU.
 *
 * This is a hand written port of the GLSL in "shaders.ts" rather than a transpilation: Babylon.js can only
 * turn GLSL into WGSL by downloading twgsl from its CDN, which an offline Electron application can't rely on.
 * Both versions are driven by exactly the same "#define" set, so the pipeline, the light selection and the
 * shader shape key are shared and only the source of the three passes differs.
 */

/**
 * Helpers shared by the three passes. They read the "depthSampler" texture declared by each pass.
 */
const commonHelpers = /* wgsl */ `
fn volMod(x: f32, y: f32) -> f32 {
	return x - y * floor(x / y);
}

fn volUnpack(color: vec4f) -> f32 {
	let bitShift = vec4f(1.0 / (255.0 * 255.0 * 255.0), 1.0 / (255.0 * 255.0), 1.0 / 255.0, 1.0);
	return dot(color, bitShift);
}

fn volSampleDepth(uv: vec2f) -> f32 {
	#ifdef VOL_DEPTH_PACKED
		return volUnpack(textureSampleLevel(depthSampler, depthSamplerSampler, uv, 0.0));
	#else
		return textureSampleLevel(depthSampler, depthSamplerSampler, uv, 0.0).r;
	#endif
}

// Converts the raw value stored in the depth map into a distance along the view axis, in scene units.
fn volLinearDepth(d: f32) -> f32 {
	#ifdef VOL_DEPTH_VIEWZ
		// The depth renderer stores the view space Z directly. The sky is cleared to 0.
		return select(d, uniforms.volCameraMinMaxZ.y, d <= 0.0);
	#else
		// The depth renderer stores "(clipZ + minZ) / (minZ + maxZ)", which is affine in the view space Z
		// for both the perspective and the orthographic projections. "volDepthUnpack" holds the two
		// coefficients of the exact inverse, computed on the CPU from the projection matrix of the scene.
		return uniforms.volDepthUnpack.x * d + uniforms.volDepthUnpack.y;
	#endif
}
`;

/**
 * The raymarching pass. @see buildVolumetricLightingScatteringShader for what it computes.
 * @param shadowSlotCount defines the number of shadowed light slots the shader is generated for.
 */
export function buildVolumetricLightingScatteringShaderWGSL(shadowSlotCount: number): string {
	const slots: string[] = [];

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

	fn volShadow{X}(p: vec3f) -> f32 {
		let info = uniforms.volShadowInfo[{X}];
		let edge = uniforms.volShadowLightFalloff[{X}].z;

		#if VOL_SHADOW_KIND{X} == 2
			// Cube shadow map of a point light. It stores the radial distance to the light.
			var toFragment = p - uniforms.volShadowLightData[{X}].xyz;
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
			let clip = uniforms.volShadowMatrix[{X}] * vec4f(p, 1.0);
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
#endif
`.replace(/\{X\}/g, i.toString())
		);
	}

	const shadowContributions: string[] = [];
	for (let i = 0; i < shadowSlotCount; ++i) {
		shadowContributions.push(
			/* wgsl */ `
			#if VOL_SHADOW_SLOT_COUNT > {X}
			{
				var lightVector = vec3f(0.0);
				var distanceToLight = 0.0;
				let contribution = volEvalLight(uniforms.volShadowLightData[{X}], uniforms.volShadowLightDiffuse[{X}], uniforms.volShadowLightDirection[{X}], uniforms.volShadowLightFalloff[{X}], p, rayDir, sigmaT, &lightVector, &distanceToLight);
				if (dot(contribution, contribution) > 0.0) {
					let shadow = mix(1.0, volShadow{X}(p), uniforms.volShadowLightFalloff[{X}].w);
					scattering += contribution * shadow;
					stepLights += 1.0;
				}
			}
			#endif
`.replace(/\{X\}/g, i.toString())
		);
	}

	return /* wgsl */ `
varying vUV: vec2f;

var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
var depthSamplerSampler: sampler;
var depthSampler: texture_2d<f32>;

uniform volInverseViewProjection: mat4x4f;
uniform volCameraPosition: vec3f;
uniform volCameraForward: vec3f;
uniform volCameraMinMaxZ: vec2f;
uniform volDepthUnpack: vec2f;
uniform volFrameIndex: f32;

uniform volFogInfos: vec4f;
uniform volFogColor: vec3f;
uniform volLinearFogEps: f32;
uniform volMedium: vec4f;

#ifdef VOL_SCREEN_SHADOWS
	uniform volViewProjection: mat4x4f;
	uniform volScreenShadowParams: vec4f;
#endif
uniform volAmbient: vec3f;
uniform volParams: vec4f;

#if VOL_ARRAY_LIGHT_COUNT > 0
	uniform volLightData: array<vec4f, VOL_ARRAY_LIGHT_COUNT>;
	uniform volLightDiffuse: array<vec4f, VOL_ARRAY_LIGHT_COUNT>;
	uniform volLightDirection: array<vec4f, VOL_ARRAY_LIGHT_COUNT>;
	uniform volLightFalloff: array<vec4f, VOL_ARRAY_LIGHT_COUNT>;
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

${commonHelpers}

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

// Transmittance of the medium between the camera and "t". @see the GLSL version.
fn volMediumTransmittance(t: f32) -> f32 {
	var coefficient = 1.0;

	#if VOL_FOG_MODE == 2
		coefficient = (uniforms.volFogInfos.z - t) / max(uniforms.volFogInfos.z - uniforms.volFogInfos.y, uniforms.volLinearFogEps);
	#elif VOL_FOG_MODE == 1
		coefficient = 1.0 / pow(2.71828, t * t * uniforms.volFogInfos.w * uniforms.volFogInfos.w);
	#else
		coefficient = 1.0 / pow(2.71828, t * uniforms.volFogInfos.w);
	#endif

	return clamp(coefficient, 0.0, 1.0);
}

// sigma(t) = -d/dt ln(T(t)), the exact analytic derivative of the transmittance above.
fn volFogExtinction(t: f32) -> f32 {
	#if VOL_FOG_MODE == 2
		return select(1.0 / max(uniforms.volFogInfos.z - t, uniforms.volLinearFogEps), 0.0, t < uniforms.volFogInfos.y);
	#elif VOL_FOG_MODE == 1
		return 2.0 * uniforms.volFogInfos.w * uniforms.volFogInfos.w * t;
	#else
		return uniforms.volFogInfos.w;
	#endif
}

fn volExtinctionAt(p: vec3f, t: f32) -> f32 {
	var sigma = volFogExtinction(t);

	#ifdef VOL_HEIGHT_FOG
		sigma *= exp(-max(0.0, p.y - uniforms.volMedium.y) * uniforms.volMedium.z);
	#endif

	return sigma;
}

#ifdef VOL_SCREEN_SHADOWS
// Walks the segment between a point of the medium and a light. @see the GLSL version.
fn volScreenShadow(p: vec3f, lightVector: vec3f, distanceToLight: f32, jitter: f32) -> f32 {
	let traced = min(distanceToLight, uniforms.volScreenShadowParams.x);
	if (traced <= 0.0) {
		return 1.0;
	}

	let stepSize = traced / f32(VOL_SCREEN_SHADOW_STEPS + 1);

	for (var i: i32 = 1; i <= VOL_SCREEN_SHADOW_STEPS; i++) {
		let samplePosition = p + lightVector * (stepSize * (f32(i) + jitter));

		let clip = uniforms.volViewProjection * vec4f(samplePosition, 1.0);
		if (clip.w <= 0.0) {
			continue;
		}

		let uv = (clip.xy / clip.w) * 0.5 + 0.5;
		if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
			continue;
		}

		let sampleDepth = dot(samplePosition - uniforms.volCameraPosition, uniforms.volCameraForward);
		let sceneDepth = volLinearDepth(volSampleDepth(uv));

		let depthDifference = sampleDepth - sceneDepth;
		let bias = max(uniforms.volScreenShadowParams.y * sceneDepth, uniforms.volCameraMinMaxZ.x);

		if (depthDifference > bias && depthDifference < uniforms.volScreenShadowParams.z * sceneDepth) {
			return 0.0;
		}
	}

	return 1.0;
}
#endif

// Evaluates the in-scattered radiance coming from a single light, without any shadowing.
fn volEvalLight(
	data: vec4f,
	diffuse: vec4f,
	direction: vec4f,
	falloff: vec4f,
	p: vec3f,
	rayDir: vec3f,
	sigmaT: f32,
	lightVector: ptr<function, vec3f>,
	distanceToLight: ptr<function, f32>
) -> vec3f {
	var attenuation = 1.0;

	*lightVector = vec3f(0.0, 1.0, 0.0);
	*distanceToLight = 0.0;

	if (data.w == 1.0) {
		// Directional light: "data.xyz" already holds the direction pointing to the light.
		*lightVector = data.xyz;
		*distanceToLight = 3.4e38;
	} else {
		let toLight = data.xyz - p;
		let distance = max(length(toLight), 1e-4);

		*distanceToLight = distance;
		*lightVector = toLight / distance;

		// Same linear attenuation as "computeLighting" in the "lightsFragmentFunctions" include.
		attenuation = max(0.0, 1.0 - distance / falloff.x);

		if (data.w == 2.0) {
			let cosAngle = max(0.0, dot(direction.xyz, -(*lightVector)));
			attenuation *= select(0.0, max(0.0, pow(cosAngle, falloff.y)), cosAngle >= direction.w);
		}
	}

	if (attenuation <= 0.0) {
		return vec3f(0.0);
	}

	#ifdef VOL_LIGHT_EXTINCTION
		if (data.w != 1.0) {
			attenuation *= exp(-sigmaT * min(*distanceToLight, uniforms.volParams.z));
		}
	#endif

	// The scattering angle is the angle between the direction the light travels (-lightVector) and the
	// direction the ray travels (-rayDir), which is exactly dot(rayDir, lightVector).
	return diffuse.rgb * (attenuation * volPhaseHG(dot(rayDir, *lightVector), diffuse.a));
}

${slots.join("\n")}

#ifdef VOL_CSM
	fn volCsmShadow(p: vec3f) -> f32 {
		for (var cascade: i32 = 0; cascade < VOL_CSM_CASCADES; cascade++) {
			let clip = uniforms.volCsmMatrices[cascade] * vec4f(p, 1.0);
			let clipSpace = clip.xyz / clip.w;
			let uv = 0.5 * clipSpace.xy + vec2f(0.5);

			#ifdef VOL_NDC_HALF_Z
				let insideDepth = clipSpace.z >= 0.0 && clipSpace.z <= 1.0;
			#else
				let insideDepth = abs(clipSpace.z) <= 1.0;
			#endif

			// A point outside every cascade must stay lit, exactly like the material path does past the last
			// cascade. Falling back to the last cascade would sample its clamped border texel and report the
			// whole distant volume as shadowed.
			let inside = all(uv >= vec2f(0.02)) && all(uv <= vec2f(0.98)) && insideDepth;
			if (!inside) {
				continue;
			}

			#if VOL_CSM_KIND == 1
				var uvDepth = 0.5 * clipSpace + vec3f(0.5);
				#ifdef VOL_NDC_HALF_Z
					uvDepth.z = clipSpace.z;
				#endif

				let shadow = textureSampleCompareLevel(volCsmSampler, volCsmSamplerSampler, uvDepth.xy, cascade, uvDepth.z);
				return volFallOff(mix(uniforms.volCsmInfo.x, 1.0, shadow), clipSpace.xy, uniforms.volCsmLightFalloff.z);
			#else
				let depthMetric = clamp(volDepthMetric(clip, uniforms.volCsmInfo.zw), 0.0, 1.0);

				#ifdef VOL_CSM_PACKED
					let shadowMapSample = volUnpack(textureSampleLevel(volCsmSampler, volCsmSamplerSampler, uv, cascade, 0.0));
				#else
					let shadowMapSample = textureSampleLevel(volCsmSampler, volCsmSamplerSampler, uv, cascade, 0.0).x;
				#endif

				return select(1.0, volFallOff(uniforms.volCsmInfo.x, clipSpace.xy, uniforms.volCsmLightFalloff.z), depthMetric > shadowMapSample);
			#endif
		}

		return 1.0;
	}
#endif

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
	// Reconstruct the world space direction of the view ray from the UV of the pixel.
	let farPoint = uniforms.volInverseViewProjection * vec4f(input.vUV * 2.0 - 1.0, 1.0, 1.0);
	let rayDir = normalize(farPoint.xyz / farPoint.w - uniforms.volCameraPosition);

	// The depth map stores the distance along the view axis, the ray is not aligned with it.
	let cosForward = max(dot(rayDir, uniforms.volCameraForward), 1e-4);
	let viewZ = volLinearDepth(volSampleDepth(input.vUV));

	let tEnd = min(viewZ / cosForward, uniforms.volParams.x);
	let tStart = max(uniforms.volCameraMinMaxZ.x / cosForward, 1e-3);

	var accumulated = vec3f(0.0);
	var transmittance = 1.0;
	var evaluatedLights = 0.0;
	var finalTransmittance = 1.0;

	// WGSL has no early return from the fragment entry point, the whole march is guarded instead.
	if (tEnd > tStart) {
		// Offset the first sample of the ray to trade the banding produced by a low step count for noise.
		var jitter = 0.0;
		#if VOL_DITHER == 1
			jitter = volBayer4(input.position.xy);
		#elif VOL_DITHER == 2
			var ditherPosition = input.position.xy;
			#ifdef VOL_TEMPORAL_JITTER
				ditherPosition += uniforms.volFrameIndex * 5.588238;
			#endif
			jitter = volInterleavedGradientNoise(ditherPosition);
		#endif
		jitter *= uniforms.volParams.y;

		#if VOL_DISTRIBUTION == 1
			let ratio = pow(tEnd / tStart, 1.0 / f32(VOL_STEPS));
		#else
			let uniformStep = (tEnd - tStart) / f32(VOL_STEPS);
		#endif

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
			let t = segmentBegin + dt * jitter;
			segmentStart = segmentEnd;

			let p = uniforms.volCameraPosition + rayDir * t;
			let sigmaT = volExtinctionAt(p, t);

			if (sigmaT > 1e-6) {
				// Both branches give the transmittance at the START of the segment: "segmentIntegral" below
				// already accounts for the extinction across the segment itself.
				#ifdef VOL_ANALYTIC_TRANSMITTANCE
					let viewTransmittance = volMediumTransmittance(segmentBegin);
				#else
					let viewTransmittance = transmittance;
				#endif

				if (viewTransmittance < 0.003) {
					break;
				}

				var scattering = uniforms.volAmbient;
				var stepLights = 0.0;

${shadowContributions.join("")}
				#ifdef VOL_CSM
				{
					var lightVector = vec3f(0.0);
					var distanceToLight = 0.0;
					let contribution = volEvalLight(uniforms.volCsmLightData, uniforms.volCsmLightDiffuse, uniforms.volCsmLightDirection, uniforms.volCsmLightFalloff, p, rayDir, sigmaT, &lightVector, &distanceToLight);
					if (dot(contribution, contribution) > 0.0) {
						scattering += contribution * mix(1.0, volCsmShadow(p), uniforms.volCsmLightFalloff.w);
						stepLights += 1.0;
					}
				}
				#endif

				#if VOL_ARRAY_LIGHT_COUNT > 0
				for (var li: i32 = 0; li < VOL_ARRAY_LIGHT_COUNT; li++) {
					var lightVector = vec3f(0.0);
					var distanceToLight = 0.0;
					var contribution = volEvalLight(uniforms.volLightData[li], uniforms.volLightDiffuse[li], uniforms.volLightDirection[li], uniforms.volLightFalloff[li], p, rayDir, sigmaT, &lightVector, &distanceToLight);

					#ifdef VOL_SCREEN_SHADOWS
						// "volLightFalloff[li].z" carries whether this light asked to be occluded by the geometry.
						if (dot(contribution, contribution) > 0.0 && uniforms.volLightFalloff[li].z > 0.5) {
							contribution *= volScreenShadow(p, lightVector, distanceToLight, jitter);
						}
					#endif

					scattering += contribution;
					stepLights += select(0.0, 1.0, dot(contribution, contribution) > 0.0);
				}
				#endif

				evaluatedLights = max(evaluatedLights, stepLights);

				// The scattering coefficient is a fraction of the extinction, which conserves energy.
				scattering *= sigmaT * uniforms.volMedium.x * uniforms.volFogColor;

				// Analytic integral of the in-scattering over the segment, which is what makes the result
				// independent from the number of steps instead of merely converging to it.
				let attenuation = exp(-sigmaT * dt);
				let segmentIntegral = (1.0 - attenuation) / sigmaT;

				accumulated += viewTransmittance * scattering * segmentIntegral;

				#ifndef VOL_ANALYTIC_TRANSMITTANCE
					transmittance *= attenuation;
				#endif
			}
		}

		#ifdef VOL_ANALYTIC_TRANSMITTANCE
			finalTransmittance = volMediumTransmittance(tEnd);
		#else
			finalTransmittance = transmittance;
		#endif
	} else {
		accumulated = vec3f(0.0);
		finalTransmittance = 1.0;
	}

	var result = accumulated;

	#if VOL_DEBUG == 3
		let ratioOfBudget = clamp(evaluatedLights / f32(max(VOL_ARRAY_LIGHT_COUNT + VOL_SHADOW_SLOT_COUNT + VOL_CSM_LIGHT_COUNT, 1)), 0.0, 1.0);
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
 * The separable bilateral blur pass. @see buildVolumetricLightingBlurShader.
 */
export function buildVolumetricLightingBlurShaderWGSL(): string {
	return /* wgsl */ `
varying vUV: vec2f;

var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
var depthSamplerSampler: sampler;
var depthSampler: texture_2d<f32>;

uniform volCameraMinMaxZ: vec2f;
uniform volDepthUnpack: vec2f;
uniform volBlurDirection: vec2f;
uniform volBlurParams: vec2f;

${commonHelpers}

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
	let centerDepth = volLinearDepth(volSampleDepth(input.vUV));
	let depthThreshold = max(uniforms.volBlurParams.y * max(centerDepth, uniforms.volCameraMinMaxZ.x), 1e-4);
	let sigma = max(uniforms.volBlurParams.x, 1e-4);

	var result = textureSampleLevel(textureSampler, textureSamplerSampler, input.vUV, 0.0);
	var totalWeight = 1.0;

	for (var i: i32 = 1; i <= VOL_BLUR_RADIUS; i++) {
		let offset = f32(i);
		let spatialWeight = exp(-offset * offset / (2.0 * sigma * sigma));

		let uvPositive = input.vUV + uniforms.volBlurDirection * offset;
		let uvNegative = input.vUV - uniforms.volBlurDirection * offset;

		if (uvPositive.x <= 1.0 && uvPositive.y <= 1.0 && uvPositive.x >= 0.0 && uvPositive.y >= 0.0) {
			let weight = spatialWeight * exp(-abs(volLinearDepth(volSampleDepth(uvPositive)) - centerDepth) / depthThreshold);
			result += textureSampleLevel(textureSampler, textureSamplerSampler, uvPositive, 0.0) * weight;
			totalWeight += weight;
		}

		if (uvNegative.x <= 1.0 && uvNegative.y <= 1.0 && uvNegative.x >= 0.0 && uvNegative.y >= 0.0) {
			let weight = spatialWeight * exp(-abs(volLinearDepth(volSampleDepth(uvNegative)) - centerDepth) / depthThreshold);
			result += textureSampleLevel(textureSampler, textureSamplerSampler, uvNegative, 0.0) * weight;
			totalWeight += weight;
		}
	}

	fragmentOutputs.color = result / totalWeight;
}
`;
}

/**
 * The composition pass. @see buildVolumetricLightingComposeShader.
 */
export function buildVolumetricLightingComposeShaderWGSL(): string {
	return /* wgsl */ `
varying vUV: vec2f;

var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
var volSceneSamplerSampler: sampler;
var volSceneSampler: texture_2d<f32>;
var depthSamplerSampler: sampler;
var depthSampler: texture_2d<f32>;

uniform volCameraMinMaxZ: vec2f;
uniform volDepthUnpack: vec2f;
uniform volScatterTexelSize: vec2f;
uniform volComposeParams: vec4f;

${commonHelpers}

fn volBayer8(p: vec2f) -> f32 {
	let p1 = vec2f(volMod(floor(p.x), 2.0), volMod(floor(p.y), 2.0));
	let p2 = vec2f(volMod(floor(p.x * 0.5), 2.0), volMod(floor(p.y * 0.5), 2.0));
	let p3 = vec2f(volMod(floor(p.x * 0.25), 2.0), volMod(floor(p.y * 0.25), 2.0));

	let b1 = 2.0 * p1.x + 3.0 * p1.y - 4.0 * p1.x * p1.y;
	let b2 = 2.0 * p2.x + 3.0 * p2.y - 4.0 * p2.x * p2.y;
	let b3 = 2.0 * p3.x + 3.0 * p3.y - 4.0 * p3.x * p3.y;

	return (b1 * 16.0 + b2 * 4.0 + b3) / 64.0;
}

// Nearest depth upsampling: the four low resolution taps around the pixel are weighted by both their
// bilinear weight and how close their depth is to the depth of the full resolution pixel.
fn volUpsample(uv0: vec2f, centerDepth: f32) -> vec4f {
	let scatterSize = 1.0 / uniforms.volScatterTexelSize;
	let texelCoordinate = uv0 * scatterSize - 0.5;
	let baseCoordinate = floor(texelCoordinate);
	let fraction = texelCoordinate - baseCoordinate;

	let depthThreshold = max(uniforms.volComposeParams.z * max(centerDepth, uniforms.volCameraMinMaxZ.x), 1e-4);

	var result = vec4f(0.0);
	var totalWeight = 0.0;

	var nearestSample = vec4f(0.0);
	var nearestDistance = 1e20;

	for (var y: i32 = 0; y < 2; y++) {
		for (var x: i32 = 0; x < 2; x++) {
			let offset = vec2f(f32(x), f32(y));
			let uv = (baseCoordinate + offset + 0.5) * uniforms.volScatterTexelSize;

			let bilinearWeight = select(fraction.x, 1.0 - fraction.x, x == 0) * select(fraction.y, 1.0 - fraction.y, y == 0);
			let depthDistance = abs(volLinearDepth(volSampleDepth(uv)) - centerDepth);

			let tap = textureSampleLevel(textureSampler, textureSamplerSampler, uv, 0.0);

			if (depthDistance < nearestDistance) {
				nearestDistance = depthDistance;
				nearestSample = tap;
			}

			let weight = bilinearWeight / (1e-4 + depthDistance / depthThreshold);
			result += tap * weight;
			totalWeight += weight;
		}
	}

	// Every tap sits on the other side of a silhouette, fall back to the closest one instead of averaging.
	return select(nearestSample, result / totalWeight, totalWeight > 1e-4);
}

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
	let centerDepth = volLinearDepth(volSampleDepth(input.vUV));

	var volumetric = volUpsample(input.vUV, centerDepth);

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
		result += (volBayer8(input.position.xy) - 0.5) * uniforms.volComposeParams.w;

		fragmentOutputs.color = vec4f(result, 1.0);
	#endif
}
`;
}

/**
 * Returns the three WGSL sources of the pipeline, keyed by the name they are registered under.
 */
export function getVolumetricLightingShadersWGSL(): Record<string, string> {
	return {
		scattering: buildVolumetricLightingScatteringShaderWGSL(maxVolumetricShadowSlots),
		blur: buildVolumetricLightingBlurShaderWGSL(),
		compose: buildVolumetricLightingComposeShaderWGSL(),
	};
}
