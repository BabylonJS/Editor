import { ShaderStore } from "@babylonjs/core/Engines/shaderStore";
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage";

import { getVolumetricLightingShadersWGSL } from "./shaders-wgsl";

import { maxVolumetricShadowSlots } from "./types";

/**
 * Defines the name of the linear depth shader in the shader store of Babylon.js.
 */
export const volumetricLightingLinearDepthShaderName = "volumetricLightingLinearDepth";

/**
 * Defines the name of the raymarching shader in the shader store of Babylon.js.
 */
export const volumetricLightingScatteringShaderName = "volumetricLightingScattering";

/**
 * Defines the name of the bilateral blur shader in the shader store of Babylon.js.
 */
export const volumetricLightingBlurShaderName = "volumetricLightingBlur";

/**
 * Defines the name of the composition shader in the shader store of Babylon.js.
 */
export const volumetricLightingComposeShaderName = "volumetricLightingCompose";

/**
 * Unpacks a depth packed in the four channels of an 8 bits RGBA texture, the same way Babylon.js does.
 */
const packingHelpers = /* glsl */ `
	float volUnpack(vec4 color) {
		const vec4 bitShift = vec4(1.0 / (255.0 * 255.0 * 255.0), 1.0 / (255.0 * 255.0), 1.0 / 255.0, 1.0);
		return dot(color, bitShift);
	}
`;

/**
 * Reads the full resolution depth map of the depth renderer. Requires the "volCameraMinMaxZ" and
 * "volDepthUnpack" uniforms.
 */
const depthMapHelpers = /* glsl */ `
	float volSampleDepth(sampler2D s, vec2 uv) {
		#ifdef VOL_DEPTH_PACKED
			return volUnpack(texture2D(s, uv));
		#else
			return texture2D(s, uv).r;
		#endif
	}

	// Converts the raw value stored in the depth map into a distance along the view axis, in scene units.
	float volLinearDepth(float d) {
		#ifdef VOL_DEPTH_VIEWZ
			// The depth renderer stores the view space Z directly. The sky is cleared to 0.
			return (d <= 0.0) ? volCameraMinMaxZ.y : d;
		#else
			// The depth renderer stores "(clipZ + minZ) / (minZ + maxZ)", which is affine in the view space Z
			// for both the perspective and the orthographic projections. "volDepthUnpack" holds the two
			// coefficients of the exact inverse, computed on the CPU from the projection matrix of the scene.
			// The sky is cleared to 1, which maps back to the far plane.
			return volDepthUnpack.x * d + volDepthUnpack.y;
		#endif
	}
`;

/**
 * Reads the linear depth written by the linear depth pass, at the full resolution of the canvas.
 * Requires the "volCameraMinMaxZ" and "volDepthRatio" uniforms.
 */
const linearDepthHelpers = /* glsl */ `
	// Returns the distance along the view axis, in scene units, of the texel at the given coordinates.
	float volReadLinearDepth(sampler2D s, ivec2 coordinates) {
		#ifdef VOL_LINEAR_DEPTH_PACKED
			return volUnpack(texelFetch(s, coordinates, 0)) * volCameraMinMaxZ.y;
		#else
			return texelFetch(s, coordinates, 0).r;
		#endif
	}

	// Returns the texel of the linear depth under the center of the given texel of the scattering buffer, which
	// is the depth the raymarching used for it. At half resolution the center of a texel lies exactly on the corner
	// of four texels of the depth: "volDepthRatio", the ratio between the two resolutions, is computed on the CPU
	// so every pass rounds exactly the same way and picks the same one.
	ivec2 volScatterToDepthTexel(ivec2 scatterTexel, ivec2 depthSize) {
		return min(ivec2((vec2(scatterTexel) + 0.5) * volDepthRatio), depthSize - 1);
	}
`;

/**
 * The linear depth pass. It is the first pass of the pipeline, so its input is the untouched color of the
 * scene that the composition reads back, and it writes the distance along the view axis of each pixel.
 *
 * Every later pass reads this texture instead of the depth map of the depth renderer: a single 32 bits
 * channel is half the memory traffic of the 16 bits RGBA depth map, which matters for the thousands of reads
 * of the depth-buffer occlusion, and it needs neither unpacking nor linearization. It is kept at the full
 * resolution so the occlusion sees the geometry exactly as the surfaces of the scene draw it.
 */
export function buildVolumetricLightingLinearDepthShader(): string {
	return /* glsl */ `precision highp float;

varying vec2 vUV;

uniform sampler2D textureSampler;
uniform sampler2D depthSampler;

uniform vec2 volCameraMinMaxZ;
uniform vec2 volDepthUnpack;

${packingHelpers}
${depthMapHelpers}

vec4 volPack(float depth) {
	const vec4 bitShift = vec4(255.0 * 255.0 * 255.0, 255.0 * 255.0, 255.0, 1.0);
	const vec4 bitMask = vec4(0.0, 1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0);

	vec4 result = fract(depth * bitShift);
	result -= result.xxyz * bitMask;

	return result;
}

void main(void) {
	float viewZ = volLinearDepth(volSampleDepth(depthSampler, vUV));

	#ifdef VOL_LINEAR_DEPTH_PACKED
		gl_FragColor = volPack(clamp(viewZ / volCameraMinMaxZ.y, 0.0, 0.9999999));
	#else
		gl_FragColor = vec4(viewZ, 0.0, 0.0, 1.0);
	#endif
}
`;
}

/**
 * Generates the loop integrating the in-scattering of a point or a spot light over the part of the view ray
 * crossing its volume. Expects "data", "diffuse", "direction", "falloff", "t0", "t1", "tStart" and "tEnd" to be
 * declared, and returns the result from the enclosing function.
 * @param seed defines the expression decorrelating the samples of this light from the ones of the other lights.
 * @param occlusion defines the statement applying the occlusion of the light to "contribution".
 */
function buildLocalLightIntegration(seed: string, occlusion: string): string {
	return /* glsl */ `
		float chordLength = t1 - t0;

		// The point of the view ray closest to the light splits the chord in two halves over which both the
		// attenuation and the phase function are monotonic, which is where stratified samples do best.
		float closest = clamp(dot(data.xyz, volRayDir), t0, t1);
		if (closest - t0 < 0.02 * chordLength) {
			closest = t0;
		} else if (t1 - closest < 0.02 * chordLength) {
			closest = t1;
		}

		int count = volLocalSampleCount(chordLength, falloff.x, tEnd - tStart);
		int firstCount = closest <= t0 ? 0 : (closest >= t1 ? count : clamp(int(float(count) * (closest - t0) / chordLength + 0.5), 1, count - 1));

		float firstWidth = (closest - t0) / float(max(firstCount, 1));
		float secondWidth = (t1 - closest) / float(max(count - firstCount, 1));
		float stratum = volStratumOffset(${seed});

		vec3 result = vec3(0.0);

		for (int k = 0; k < VOL_LOCAL_MAX_STEPS; ++k) {
			if (k >= count) {
				break;
			}

			bool inFirstHalf = k < firstCount;
			float width = inFirstHalf ? firstWidth : secondWidth;
			float t = inFirstHalf ? t0 + width * (float(k) + stratum) : closest + width * (float(k - firstCount) + stratum);

			vec3 position = volRayDir * t;
			float sigmaT = volExtinctionAt(volCameraPosition.y + position.y, t);

			float distanceToLight;
			vec3 contribution = volEvalLocalLight(data, diffuse, direction, falloff, position, distanceToLight);

			if (contribution.r + contribution.g + contribution.b > 0.0) {
				${occlusion}
				result += contribution * (volCombinedTransmittance(t, sigmaT, distanceToLight) * sigmaT * width);
			}
		}

		return vec4(result, 1.0);
`;
}

/**
 * The raymarching pass. Accumulates the single-scattering integral of every enabled light of the scene
 * along the view ray, through the participating medium described by the configuration of the pipeline.
 *
 * The lights are not all marched together: a directional light lights the whole view ray and is marched
 * along it, but a point or a spot light only reaches the part of the ray crossing its volume, so each one is
 * integrated over that part alone, with samples of its own. A light the ray doesn't cross costs a single
 * ray/volume intersection, and a small light gets as many samples as a big one instead of the few steps of
 * the global march that happened to fall inside it.
 *
 * The result is written as (rgb = in-scattered radiance, a = transmittance of the medium at the end of the ray).
 * @param shadowSlotCount defines the number of shadowed light slots the shader is generated for.
 */
export function buildVolumetricLightingScatteringShader(shadowSlotCount: number): string {
	const slots: string[] = [];
	const globalSlotContributions: string[] = [];
	const localSlotContributions: string[] = [];

	for (let i = 0; i < shadowSlotCount; ++i) {
		slots.push(
			/* glsl */ `
#if VOL_SHADOW_SLOT_COUNT > {X}
	#if VOL_SHADOW_KIND{X} == 2
		uniform samplerCube volShadowSampler{X};
	#elif VOL_SHADOW_KIND{X} == 1
		uniform highp sampler2DShadow volShadowSampler{X};
	#else
		uniform sampler2D volShadowSampler{X};
	#endif

	// Returns the shadowing of a point given its position relative to the camera and, for the 2d shadow maps, its
	// position in the clip space of the light, which the callers compute the cheapest way they can.
	float volShadow{X}(vec3 position, vec4 clip) {
		vec4 info = volShadowInfo[{X}];
		float edge = volShadowLightFalloff[{X}].z;

		#if VOL_SHADOW_KIND{X} == 2
			// Cube shadow map of a point light. It stores the radial distance to the light.
			vec3 toFragment = position - volShadowLightData[{X}].xyz;
			float depth = clamp((length(toFragment) + info.z) / info.w, 0.0, 1.0);

			toFragment = normalize(toFragment);
			toFragment.y = -toFragment.y;

			#ifdef VOL_SHADOW_PACKED{X}
				float shadowMapSample = volUnpack(textureCube(volShadowSampler{X}, toFragment));
			#else
				float shadowMapSample = textureCube(volShadowSampler{X}, toFragment).x;
			#endif

			#if VOL_SHADOW_MODE{X} == 1
				// Exponential shadow map, same encoding as the 2d case. "info.y" holds the depth scale.
				return 1.0 - clamp(exp(min(87.0, info.y * depth)) * shadowMapSample, 0.0, 1.0 - info.x);
			#elif VOL_SHADOW_MODE{X} == 2
				return clamp(exp(min(87.0, -info.y * (depth - shadowMapSample))), info.x, 1.0);
			#else
				return depth > shadowMapSample ? info.x : 1.0;
			#endif
		#else
			vec3 clipSpace = clip.xyz / clip.w;

			// "getTransformMatrix" gives the world to light clip space matrix without the [-1, 1] -> [0, 1] bias.
			#if VOL_SHADOW_KIND{X} == 1
				vec3 uvDepth = vec3(0.5 * clipSpace + vec3(0.5));
				#ifdef VOL_NDC_HALF_Z
					uvDepth.z = clipSpace.z;
				#endif

				// Same guard as "computeShadowWithPCF1": past the far plane of the shadow map the hardware
				// comparison would fail against every texel a caster wrote, reporting the sample as occluded
				// while the surfaces at the same distance are lit by the material path.
				float pcfDepthMetric = volDepthMetric(clip, info.zw);
				if (pcfDepthMetric < 0.0 || pcfDepthMetric > 1.0 || uvDepth.x < 0.0 || uvDepth.x > 1.0 || uvDepth.y < 0.0 || uvDepth.y > 1.0) {
					return 1.0;
				}

				// Hardware comparison sampling. "info.y" holds the inverse of the size of the shadow map.
				#if VOL_PCF_TAPS == 4
					float shadow = 0.25 * (
						texture2DLodEXT(volShadowSampler{X}, uvDepth + vec3(-0.5 * info.y, -0.5 * info.y, 0.0), 0.) +
						texture2DLodEXT(volShadowSampler{X}, uvDepth + vec3( 0.5 * info.y, -0.5 * info.y, 0.0), 0.) +
						texture2DLodEXT(volShadowSampler{X}, uvDepth + vec3(-0.5 * info.y,  0.5 * info.y, 0.0), 0.) +
						texture2DLodEXT(volShadowSampler{X}, uvDepth + vec3( 0.5 * info.y,  0.5 * info.y, 0.0), 0.)
					);
				#else
					float shadow = texture2DLodEXT(volShadowSampler{X}, uvDepth, 0.);
				#endif

				return volFallOff(mix(info.x, 1.0, shadow), clipSpace.xy, edge);
			#else
				vec2 uv = 0.5 * clipSpace.xy + vec2(0.5);
				if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
					return 1.0;
				}

				float depthMetric = clamp(volDepthMetric(clip, info.zw), 0.0, 1.0);

				#ifdef VOL_SHADOW_PACKED{X}
					float shadowMapSample = volUnpack(texture2DLodEXT(volShadowSampler{X}, uv, 0.));
				#else
					float shadowMapSample = texture2DLodEXT(volShadowSampler{X}, uv, 0.).x;
				#endif

				#if VOL_SHADOW_MODE{X} == 1
					// Exponential shadow map. "info.y" holds the depth scale of the generator.
					return volFallOff(1.0 - clamp(exp(min(87.0, info.y * depthMetric)) * shadowMapSample, 0.0, 1.0 - info.x), clipSpace.xy, edge);
				#elif VOL_SHADOW_MODE{X} == 2
					// Close exponential shadow map.
					return volFallOff(clamp(exp(min(87.0, -info.y * (depthMetric - shadowMapSample))), info.x, 1.0), clipSpace.xy, edge);
				#else
					return depthMetric > shadowMapSample ? volFallOff(info.x, clipSpace.xy, edge) : 1.0;
				#endif
			#endif
		#endif
	}

	#if VOL_SHADOW_LOCAL{X} == 1
		// Point or spot light casting volumetric shadows: integrated over its own volume, like the others.
		vec4 volIntegrateShadowSlot{X}(float tStart, float tEnd) {
			vec4 data = volShadowLightData[{X}];
			vec4 direction = volShadowLightDirection[{X}];
			vec4 falloff = volShadowLightFalloff[{X}];

			vec2 chord = volLightChord(data, direction, falloff.x);
			float t0 = max(chord.x, tStart);
			float t1 = min(chord.y, tEnd);

			if (t1 <= t0) {
				return vec4(0.0);
			}

			vec4 diffuse = volShadowLightDiffuse[{X}];

			// The light clip space position of the points of the view ray is affine in their distance to the camera,
			// so each sample only costs a multiply-add instead of a matrix product.
			vec4 clipOrigin = volShadowMatrix[{X}] * vec4(volCameraPosition, 1.0);
			vec4 clipDirection = volShadowMatrix[{X}] * vec4(volRayDir, 0.0);
			${buildLocalLightIntegration("float({X}) + 0.5", "contribution *= mix(1.0, volShadow{X}(position, clipOrigin + clipDirection * t), falloff.w);")}
		}
	#endif
#endif
`.replace(/\{X\}/g, i.toString())
		);

		globalSlotContributions.push(
			/* glsl */ `
			#if VOL_SHADOW_SLOT_COUNT > {X}
				#if VOL_SHADOW_LOCAL{X} == 0
				{
					// The matrix product is recomputed rather than kept affine: the march already holds many values
					// alive across its steps, and fewer live registers means more pixels processed in parallel.
					float shadow = volShadow{X}(position, volShadowMatrix[{X}] * vec4(volCameraPosition + position, 1.0));
					scattering += volEvalDirectionalLight(volShadowLightData[{X}], volShadowLightDiffuse[{X}]) * mix(1.0, shadow, volShadowLightFalloff[{X}].w);
					stepLights += 1.0;
				}
				#endif
			#endif
`.replace(/\{X\}/g, i.toString())
		);

		localSlotContributions.push(
			/* glsl */ `
	#if VOL_SHADOW_SLOT_COUNT > {X}
		#if VOL_SHADOW_LOCAL{X} == 1
			lightResult = volIntegrateShadowSlot{X}(tStart, tEnd);
			accumulated += lightResult.rgb;
			evaluatedLights += lightResult.a;
		#endif
	#endif
`.replace(/\{X\}/g, i.toString())
		);
	}

	return /* glsl */ `precision highp float;
precision highp int;

varying vec2 vUV;

// Full resolution linear depth of the scene, written by the linear depth pass.
uniform highp sampler2D textureSampler;

// Ratio between the resolution of the linear depth and the resolution of the scattering buffer.
uniform vec2 volDepthRatio;

uniform mat4 volInverseViewProjection;
uniform vec3 volCameraPosition;
uniform vec3 volCameraForward;
uniform vec2 volCameraMinMaxZ;
uniform float volFrameIndex;

uniform vec4 volFogInfos;
uniform vec3 volFogColor;
uniform float volLinearFogEps;
uniform vec4 volMedium;

#ifdef VOL_SCREEN_SHADOWS
	uniform mat4 volViewProjection;
	uniform vec4 volScreenShadowParams;
#endif
uniform vec3 volAmbient;

// (maximum distance, dithering strength, light extinction clamp, number of point and spot lights in the arrays)
uniform vec4 volParams;

#if VOL_MAX_ARRAY_LIGHTS > 0
	uniform vec4 volLightData[VOL_MAX_ARRAY_LIGHTS];
	uniform vec4 volLightDiffuse[VOL_MAX_ARRAY_LIGHTS];
	uniform vec4 volLightDirection[VOL_MAX_ARRAY_LIGHTS];
	uniform vec4 volLightFalloff[VOL_MAX_ARRAY_LIGHTS];
#endif

#if VOL_SHADOW_SLOT_COUNT > 0
	uniform vec4 volShadowLightData[VOL_SHADOW_SLOT_COUNT];
	uniform vec4 volShadowLightDiffuse[VOL_SHADOW_SLOT_COUNT];
	uniform vec4 volShadowLightDirection[VOL_SHADOW_SLOT_COUNT];
	uniform vec4 volShadowLightFalloff[VOL_SHADOW_SLOT_COUNT];
	uniform vec4 volShadowInfo[VOL_SHADOW_SLOT_COUNT];
	uniform mat4 volShadowMatrix[VOL_SHADOW_SLOT_COUNT];
#endif

#ifdef VOL_CSM
	uniform vec4 volCsmLightData;
	uniform vec4 volCsmLightDiffuse;
	uniform vec4 volCsmLightDirection;
	uniform vec4 volCsmLightFalloff;
	uniform vec4 volCsmInfo;
	uniform mat4 volCsmMatrices[VOL_CSM_CASCADES];

	#if VOL_CSM_KIND == 1
		uniform highp sampler2DArrayShadow volCsmSampler;
	#else
		uniform highp sampler2DArray volCsmSampler;
	#endif
#endif

// Values shared by every function of the pass, computed once per pixel. Every position the raymarching
// manipulates is relative to the camera, which keeps the precision of the lights far from the origin.
vec3 volRayDir;
float volCosForward;
float volNoise;
float volJitter;

#ifdef VOL_SCREEN_SHADOWS
	ivec2 volDepthSize;
	vec4 volClipOrigin;
	vec4 volClipDirection;
#endif

${packingHelpers}
${linearDepthHelpers}

float volFallOff(float value, vec2 clipSpaceXY, float frustumEdgeFalloff) {
	float mask = smoothstep(1.0 - frustumEdgeFalloff, 1.00000012, clamp(dot(clipSpaceXY, clipSpaceXY), 0.0, 1.0));
	return mix(value, 1.0, mask);
}

// Reproduces the depth metric computed by the "shadowsVertex" include of Babylon.js: the raw clip space
// Z is used, without the perspective divide, so the comparison matches what the shadow map stores.
float volDepthMetric(vec4 clip, vec2 depthValues) {
	#ifdef VOL_REVERSE_DEPTH
		return (-clip.z + depthValues.x) / depthValues.y;
	#else
		return (clip.z + depthValues.x) / depthValues.y;
	#endif
}

// Henyey-Greenstein phase function. "c" is the cosine of the angle between the direction the light
// travels and the direction the ray travels, "g" the anisotropy of the medium.
//
// Normalised to 1 for an isotropic medium rather than to an integral of 1 over the sphere: the lighting of
// the surfaces in Babylon.js doesn't divide by PI either, so an intensity of 1 means the same thing for the
// light shafts as it does for the surfaces the same light hits.
float volPhaseHG(float c, float g) {
	float g2 = g * g;
	float d = max(1.0 + g2 - 2.0 * g * c, 1e-4);
	return (1.0 - g2) / (d * sqrt(d));
}

float volBayer4(vec2 p) {
	vec2 p1 = mod(floor(p), 2.0);
	vec2 p2 = mod(floor(p * 0.5), 2.0);

	float b1 = 2.0 * p1.x + 3.0 * p1.y - 4.0 * p1.x * p1.y;
	float b2 = 2.0 * p2.x + 3.0 * p2.y - 4.0 * p2.x * p2.y;

	return (b1 * 4.0 + b2) / 16.0;
}

float volInterleavedGradientNoise(vec2 p) {
	return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

// Returns the offset of the samples of a light inside their strata. Each light gets its own offset, a golden
// ratio sequence seeded by the noise of the pixel, so the lights don't all show the same pattern.
float volStratumOffset(float seed) {
	#if VOL_DITHER == 0
		return 0.5;
	#else
		return mix(0.5, fract(volNoise + seed * 0.618034), volParams.y);
	#endif
}

// Extinction coefficient of the medium, the exact analytic derivative of its optical depth:
// sigma(t) = -d/dt ln(T(t)). Keeping the two in sync is what makes the result independent from the number
// of samples the medium is integrated with. "volFogInfos" is (mode, start, end, density).
float volFogExtinction(float t) {
	#if VOL_FOG_MODE == 2
		// T = (end - t) / (end - start) -> sigma = 1 / (end - t), clamped to avoid the pole at t = end.
		return t < volFogInfos.y ? 0.0 : 1.0 / max(volFogInfos.z - t, volLinearFogEps);
	#elif VOL_FOG_MODE == 1
		// T = e^(-(t * density)^2) -> sigma = 2 * density^2 * t.
		return 2.0 * volFogInfos.w * volFogInfos.w * t;
	#else
		// T = e^(-t * density) -> sigma = density (the medium is uniform).
		return volFogInfos.w;
	#endif
}

// "height" is the absolute altitude of the sample, "t" its distance to the camera.
float volExtinctionAt(float height, float t) {
	float sigma = volFogExtinction(t);

	#ifdef VOL_HEIGHT_FOG
		sigma *= exp(-max(0.0, height - volMedium.y) * volMedium.z);
	#endif

	return sigma;
}

// Transmittance of the medium between the camera and the point of the view ray at the distance "t". The
// three models match the ones the fog of Babylon.js uses, but every value comes from the configuration of
// this pipeline: the medium the shafts are computed in is independent from the fog applied on the surfaces.
#if VOL_TRANSMITTANCE == 1
	// Length of medium at full density equivalent to the part [s1, s2] of the view ray, which lies entirely on
	// one side of the base altitude of the height falloff.
	float volHeightSegment(float s1, float s2) {
		float y0 = volCameraPosition.y - volMedium.y;
		float h1 = y0 + s1 * volRayDir.y;
		float h2 = y0 + s2 * volRayDir.y;

		// Under the base altitude the medium has its full density.
		if (h1 + h2 <= 0.0) {
			return s2 - s1;
		}

		// Over it, the integral of e^(-falloff * height) along the ray, falling back on the midpoint rule
		// when the altitude barely changes along the segment, where the closed form would cancel out.
		float e1 = exp(-volMedium.z * max(h1, 0.0));
		float e2 = exp(-volMedium.z * max(h2, 0.0));
		float slope = volMedium.z * volRayDir.y;

		return abs(slope * (s2 - s1)) < 1e-4 ? 0.5 * (e1 + e2) * (s2 - s1) : (e1 - e2) / slope;
	}

	// Exponential medium whose density decreases with the altitude: exact, split where the ray crosses the base altitude.
	float volOpticalDepth(float t) {
		float crossing = abs(volRayDir.y) > 1e-6 ? (volMedium.y - volCameraPosition.y) / volRayDir.y : -1.0;
		float opticalLength = (crossing > 0.0 && crossing < t) ? volHeightSegment(0.0, crossing) + volHeightSegment(crossing, t) : volHeightSegment(0.0, t);

		return volFogInfos.w * opticalLength;
	}

	float volTransmittance(float t) {
		return exp(-volOpticalDepth(t));
	}
#elif VOL_TRANSMITTANCE == 2
	// The other fog modes combined with the height falloff have no closed form: their optical depth is
	// integrated once per pixel along the view ray, and interpolated from there.
	float volOpticalDepths[VOL_TRANSMITTANCE_SAMPLES + 1];
	float volOpticalDepthStart;
	float volOpticalDepthScale;

	void volBuildOpticalDepths(float tStart, float tEnd) {
		float stepSize = (tEnd - tStart) / float(VOL_TRANSMITTANCE_SAMPLES);

		volOpticalDepthStart = tStart;
		volOpticalDepthScale = 1.0 / stepSize;

		// The medium between the camera and the near plane is too thin to be worth integrating.
		float previous = volExtinctionAt(volCameraPosition.y + volRayDir.y * tStart, tStart);
		float opticalDepth = previous * tStart;

		volOpticalDepths[0] = opticalDepth;

		for (int i = 1; i <= VOL_TRANSMITTANCE_SAMPLES; ++i) {
			float t = tStart + stepSize * float(i);
			float sigma = volExtinctionAt(volCameraPosition.y + volRayDir.y * t, t);

			opticalDepth += 0.5 * (previous + sigma) * stepSize;
			volOpticalDepths[i] = opticalDepth;
			previous = sigma;
		}
	}

	float volOpticalDepth(float t) {
		float x = clamp((t - volOpticalDepthStart) * volOpticalDepthScale, 0.0, float(VOL_TRANSMITTANCE_SAMPLES));
		int i = min(int(x), VOL_TRANSMITTANCE_SAMPLES - 1);

		return mix(volOpticalDepths[i], volOpticalDepths[i + 1], x - float(i));
	}

	float volTransmittance(float t) {
		return exp(-volOpticalDepth(t));
	}
#elif VOL_FOG_MODE == 2
	// The linear mode is the only one whose transmittance, rather than its optical depth, is simple.
	float volTransmittance(float t) {
		return clamp((volFogInfos.z - t) / max(volFogInfos.z - volFogInfos.y, volLinearFogEps), 0.0, 1.0);
	}
#else
	float volOpticalDepth(float t) {
		#if VOL_FOG_MODE == 1
			float x = t * volFogInfos.w;
			return x * x;
		#else
			return t * volFogInfos.w;
		#endif
	}

	float volTransmittance(float t) {
		return exp(-volOpticalDepth(t));
	}
#endif

// Transmittance of the medium between the camera and the point of the view ray at the distance "t", combined
// with the attenuation of the light on its way from the light to that point. Both are exponentials of optical
// depths whenever the fog mode allows it, which saves one exponential per sample.
float volCombinedTransmittance(float t, float sigmaT, float distanceToLight) {
	#ifdef VOL_LIGHT_EXTINCTION
		// Exact for an exponential fog, which describes a homogeneous medium, and a faithful approximation for
		// the other modes.
		float lightOpticalDepth = sigmaT * min(distanceToLight, volParams.z);

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
	// Walks a segment going from a point of the medium towards a light through the depth buffer, and reports the
	// point as occluded as soon as one of the samples sits behind what the depth buffer holds. This is what stops
	// the shafts of a light that has no shadow map from showing through the walls between it and the camera.
	//
	// The segment is given in clip space: the sample at the fraction "u" of the segment is "clipStart + u * clipDelta".
	// The clip space position is affine in the world position, and so is the distance along the view axis, so
	// interpolating both is exact and replaces the matrix product each sample would cost with multiply-adds.
	// "volScreenShadowParams" is (maximum traced distance, relative depth bias, relative surface thickness, unused).
	float volScreenShadow(vec4 clipStart, vec4 clipDelta, float depthStart, float depthDelta) {
		for (int i = 1; i <= VOL_SCREEN_SHADOW_STEPS; ++i) {
			// The samples are spread strictly between the shaded point and the end of the segment: the point
			// itself is on the view ray, so it always sits in front of the depth buffer.
			float u = (float(i) + volJitter) * (1.0 / float(VOL_SCREEN_SHADOW_STEPS + 1));

			vec4 clip = clipStart + clipDelta * u;
			if (clip.w <= 0.0) {
				continue;
			}

			vec2 uv = (clip.xy / clip.w) * 0.5 + 0.5;
			if (uv.x < 0.0 || uv.x >= 1.0 || uv.y < 0.0 || uv.y >= 1.0) {
				continue;
			}

			float sceneDepth = volReadLinearDepth(textureSampler, ivec2(uv * vec2(volDepthSize)));

			// Bounded by the assumed thickness of the surface: a sample much further away than the surface it is
			// hidden behind has passed it rather than been stopped by it, and counting it as occluded would
			// stamp the silhouette of everything in the foreground into the shafts behind it.
			float depthDifference = depthStart + depthDelta * u - sceneDepth;
			float bias = max(volScreenShadowParams.y * sceneDepth, volCameraMinMaxZ.x);

			if (depthDifference > bias && depthDifference < volScreenShadowParams.z * sceneDepth) {
				return 0.0;
			}
		}

		return 1.0;
	}

	// Occlusion of a point or a spot light, seen from the point of the view ray at the distance "t". The
	// search stops at the light, or after the maximum traced distance when the light is further than that.
	float volScreenShadowToLight(float t, vec4 lightClip, float lightDepth, float distanceToLight) {
		vec4 clipStart = volClipOrigin + volClipDirection * t;
		float depthStart = t * volCosForward;
		float fraction = min(1.0, volScreenShadowParams.x / max(distanceToLight, 1e-4));

		return volScreenShadow(clipStart, (lightClip - clipStart) * fraction, depthStart, (lightDepth - depthStart) * fraction);
	}
#endif

// Evaluates the in-scattered radiance coming from a directional light, without any shadowing. "data.xyz"
// already holds the direction pointing to the light, and the scattering angle is the angle between the
// direction the light travels (-data.xyz) and the direction the ray travels (-volRayDir).
vec3 volEvalDirectionalLight(vec4 data, vec4 diffuse) {
	return diffuse.rgb * volPhaseHG(dot(volRayDir, data.xyz), diffuse.a);
}

// Evaluates the in-scattered radiance coming from a point or a spot light at the given position, relative to
// the camera, without any shadowing nor extinction.
vec3 volEvalLocalLight(vec4 data, vec4 diffuse, vec4 direction, vec4 falloff, vec3 position, out float distanceToLight) {
	vec3 toLight = data.xyz - position;
	distanceToLight = max(length(toLight), 1e-4);

	vec3 lightVector = toLight / distanceToLight;

	// Same linear attenuation as "computeLighting" in the "lightsFragmentFunctions" include.
	float attenuation = max(0.0, 1.0 - distanceToLight / falloff.x);

	if (data.w == 2.0) {
		float cosAngle = max(0.0, dot(direction.xyz, -lightVector));
		attenuation *= (cosAngle >= direction.w) ? max(0.0, pow(cosAngle, falloff.y)) : 0.0;
	}

	if (attenuation <= 0.0) {
		return vec3(0.0);
	}

	return diffuse.rgb * (attenuation * volPhaseHG(dot(volRayDir, lightVector), diffuse.a));
}

// Returns the part of the view ray crossing the cone of a spot light, cut by the sphere of its range.
// "apex" is relative to the camera and "sphere" is the part of the ray crossing the sphere of the range.
vec2 volConeChord(vec3 apex, vec3 axis, float cosAngle, float range, vec2 sphere) {
	// Only a convex cone can be intersected exactly, anything wider keeps the sphere of the range.
	if (cosAngle <= 1e-3) {
		return sphere;
	}

	// Expressed in units of the range of the light, which keeps the quadratic well conditioned. A point of the
	// view ray is inside the cone when "dot(p - apex, axis) >= |p - apex| * cos(angle)".
	vec3 origin = apex * (-1.0 / range);
	float dv = dot(volRayDir, axis);
	float ov = dot(origin, axis);
	float cos2 = cosAngle * cosAngle;

	float a = dv * dv - cos2;
	float b = dv * ov - cos2 * dot(volRayDir, origin);
	float c = ov * ov - cos2 * dot(origin, origin);

	// The ray is parallel to the surface of the cone, the sphere is a conservative bound.
	if (abs(a) < 1e-4) {
		return sphere;
	}

	float discriminant = b * b - a * c;
	vec2 cone;

	if (a < 0.0) {
		// Less aligned with the axis than the surface of the cone: the ray crosses it along a single segment.
		if (discriminant <= 0.0) {
			return vec2(1.0, -1.0);
		}

		float s = sqrt(discriminant);
		cone = vec2((-b + s) / a, (-b - s) / a);

		// The segment must belong to the cone of the light, not to its mirror image behind the apex.
		if (dv * 0.5 * (cone.x + cone.y) + ov < 0.0) {
			return vec2(1.0, -1.0);
		}
	} else {
		// More aligned with the axis than the surface: the line crosses both the cone and its mirror image, and
		// only the half line going in the direction of the axis belongs to the cone of the light.
		float s = sqrt(max(discriminant, 0.0));
		cone = dv > 0.0 ? vec2((-b + s) / a, 1e30) : vec2(-1e30, (-b - s) / a);
	}

	// Slightly widened: the samples outside of the cone are rejected by the lighting itself, while an interval
	// cut too short by the rounding errors would clip the edges of the cone.
	return vec2(max(sphere.x, (cone.x - 0.005) * range), min(sphere.y, (cone.y + 0.005) * range));
}

// Returns the part of the view ray, as distances to the camera, crossing the volume a point or a spot light
// reaches. An empty part is returned as an interval that ends before it starts.
vec2 volLightChord(vec4 data, vec4 direction, float range) {
	// Computed from the point of the ray closest to the light rather than with the textbook discriminant,
	// which cancels out catastrophically for the small lights far from the camera.
	float closest = dot(data.xyz, volRayDir);
	vec3 offset = data.xyz - volRayDir * closest;
	float halfChord2 = range * range - dot(offset, offset);

	if (halfChord2 <= 0.0) {
		return vec2(1.0, -1.0);
	}

	float halfChord = sqrt(halfChord2);
	vec2 chord = vec2(closest - halfChord, closest + halfChord);

	if (data.w == 2.0) {
		chord = volConeChord(data.xyz, direction.xyz, direction.w, range, chord);
	}

	return chord;
}

// Returns the number of samples taken over the given chord of a light: at least "VOL_LIGHT_STEPS" across the
// diameter of the light, and at least the density the directional lights are marched with, so a light covering
// most of the view ray is never sampled more coarsely than by a march of the whole ray.
int volLocalSampleCount(float chordLength, float range, float rayLength) {
	float count = max(float(VOL_LIGHT_STEPS) * chordLength / (2.0 * range), float(VOL_STEPS) * chordLength / rayLength);
	return clamp(int(ceil(count)), 2, VOL_LOCAL_MAX_STEPS);
}

${slots.join("\n")}

#ifdef VOL_CSM
	// A cascade is an orthographic box in the clip space of the light, where the view ray is a straight line
	// "origin + t * direction". The parts of the view ray inside each box are computed once per pixel, so finding
	// the cascade of a sample only costs a few comparisons, and the clip space position of the view ray is only
	// recomputed when the march enters another cascade, which happens a handful of times per ray.
	vec4 volCsmEntries;
	vec4 volCsmExits;
	int volCsmCurrent;
	vec4 volCsmClipOrigin;
	vec4 volCsmClipDirection;

	// Returns the part of the view ray inside the box of a cascade, keeping the same 2% margin on its sides as
	// the lookup: a point outside every cascade must stay lit, exactly like the material path does past the
	// last cascade, and falling back on another cascade would sample its clamped border texel.
	vec2 volCsmBoxInterval(vec4 origin, vec4 direction) {
		#ifdef VOL_NDC_HALF_Z
			vec3 boxMin = vec3(-0.96, -0.96, 0.0);
		#else
			vec3 boxMin = vec3(-0.96, -0.96, -1.0);
		#endif
		vec3 boxMax = vec3(0.96, 0.96, 1.0);

		// A direction parallel to an axis gives huge bounds of the same sign when the ray is outside of the slab,
		// and huge bounds of opposite signs when it is inside, which is exactly what the slab test expects.
		vec3 safeDirection = mix(vec3(1e-9), direction.xyz, greaterThan(abs(direction.xyz), vec3(1e-9)));
		vec3 inverseDirection = 1.0 / safeDirection;
		vec3 t0 = (boxMin - origin.xyz) * inverseDirection;
		vec3 t1 = (boxMax - origin.xyz) * inverseDirection;
		vec3 tMin = min(t0, t1);
		vec3 tMax = max(t0, t1);

		return vec2(max(max(tMin.x, tMin.y), tMin.z), min(min(tMax.x, tMax.y), tMax.z));
	}

	void volPrepareCsm() {
		volCsmEntries = vec4(1e30);
		volCsmExits = vec4(-1e30);

		for (int cascade = 0; cascade < VOL_CSM_CASCADES; ++cascade) {
			vec2 interval = volCsmBoxInterval(volCsmMatrices[cascade] * vec4(volCameraPosition, 1.0), volCsmMatrices[cascade] * vec4(volRayDir, 0.0));
			volCsmEntries[cascade] = interval.x;
			volCsmExits[cascade] = interval.y;
		}

		volCsmCurrent = -1;
	}

	// Returns the shadowing of the point of the view ray at the distance "t" from the camera.
	float volCsmShadow(float t) {
		// The first cascade containing the sample is the most detailed one.
		int cascade = -1;
		for (int i = VOL_CSM_CASCADES - 1; i >= 0; --i) {
			if (t >= volCsmEntries[i] && t <= volCsmExits[i]) {
				cascade = i;
			}
		}

		if (cascade < 0) {
			return 1.0;
		}

		if (cascade != volCsmCurrent) {
			volCsmCurrent = cascade;
			volCsmClipOrigin = volCsmMatrices[cascade] * vec4(volCameraPosition, 1.0);
			volCsmClipDirection = volCsmMatrices[cascade] * vec4(volRayDir, 0.0);
		}

		// The projection of a directional light is orthographic, "w" is always 1.
		vec4 clip = volCsmClipOrigin + volCsmClipDirection * t;
		vec3 clipSpace = clip.xyz;

		#if VOL_CSM_KIND == 1
			vec3 uvDepth = vec3(0.5 * clipSpace + vec3(0.5));
			#ifdef VOL_NDC_HALF_Z
				uvDepth.z = clipSpace.z;
			#endif

			float shadow = texture2D(volCsmSampler, vec4(uvDepth.x, uvDepth.y, float(cascade), uvDepth.z));
			return volFallOff(mix(volCsmInfo.x, 1.0, shadow), clipSpace.xy, volCsmLightFalloff.z);
		#else
			vec2 uv = 0.5 * clipSpace.xy + vec2(0.5);
			float depthMetric = clamp(volDepthMetric(clip, volCsmInfo.zw), 0.0, 1.0);

			#ifdef VOL_CSM_PACKED
				float shadowMapSample = volUnpack(texture2D(volCsmSampler, vec3(uv, float(cascade))));
			#else
				float shadowMapSample = texture2D(volCsmSampler, vec3(uv, float(cascade))).x;
			#endif

			return depthMetric > shadowMapSample ? volFallOff(volCsmInfo.x, clipSpace.xy, volCsmLightFalloff.z) : 1.0;
		#endif
	}
#endif

#if VOL_GLOBAL_LIGHT_COUNT > 0
	// Marches the whole view ray for the lights that reach all of it: the directional lights. Returns the
	// in-scattered radiance in "rgb" and the number of lights evaluated in "a".
	vec4 volMarchGlobalLights(float tStart, float tEnd) {
		#if VOL_DIRECTIONAL_LIGHT_COUNT > 0
			#ifdef VOL_SCREEN_SHADOWS
				// The occlusion search of a directional light always walks the same direction over the same distance,
				// only its starting point moves along the view ray.
				vec4 directionClip[VOL_DIRECTIONAL_LIGHT_COUNT];
				float directionDepth[VOL_DIRECTIONAL_LIGHT_COUNT];

				for (int li = 0; li < VOL_DIRECTIONAL_LIGHT_COUNT; ++li) {
					vec3 traced = volLightData[li].xyz * volScreenShadowParams.x;
					directionClip[li] = volViewProjection * vec4(traced, 0.0);
					directionDepth[li] = dot(traced, volCameraForward);
				}
			#endif
		#endif

		#if VOL_DISTRIBUTION == 1
			float ratio = pow(tEnd / tStart, 1.0 / float(VOL_STEPS));
		#else
			float uniformStep = (tEnd - tStart) / float(VOL_STEPS);
		#endif

		vec3 result = vec3(0.0);
		float evaluatedLights = 0.0;
		float segmentStart = tStart;

		for (int i = 0; i < VOL_STEPS; ++i) {
			#if VOL_DISTRIBUTION == 1
				float segmentEnd = segmentStart * ratio;
			#else
				float segmentEnd = segmentStart + uniformStep;
			#endif

			float segmentBegin = segmentStart;
			float dt = segmentEnd - segmentBegin;

			// The jitter picks the sample inside its own segment, so the marched interval stays exactly
			// [tStart, tEnd]. Shifting the whole sequence instead would scale the length of the integrated
			// path by the jitter and turn the dithering into multiplicative noise.
			float t = segmentBegin + dt * volJitter;
			segmentStart = segmentEnd;

			vec3 position = volRayDir * t;
			float sigmaT = volExtinctionAt(volCameraPosition.y + position.y, t);

			if (sigmaT <= 1e-6) {
				continue;
			}

			// The transmittance at the START of the segment: the factor below accounts for the extinction
			// across the segment itself.
			float viewTransmittance = volTransmittance(segmentBegin);
			if (viewTransmittance < 0.003) {
				break;
			}

			vec3 scattering = vec3(0.0);
			float stepLights = 0.0;

${globalSlotContributions.join("")}
			#ifdef VOL_CSM
			{
				scattering += volEvalDirectionalLight(volCsmLightData, volCsmLightDiffuse) * mix(1.0, volCsmShadow(t), volCsmLightFalloff.w);
				stepLights += 1.0;
			}
			#endif

			#if VOL_DIRECTIONAL_LIGHT_COUNT > 0
				for (int li = 0; li < VOL_DIRECTIONAL_LIGHT_COUNT; ++li) {
					vec3 contribution = volEvalDirectionalLight(volLightData[li], volLightDiffuse[li]);

					#ifdef VOL_SCREEN_SHADOWS
						// "volLightFalloff[li].z" carries whether this light asked to be occluded by the geometry.
						if (volLightFalloff[li].z > 0.5) {
							contribution *= volScreenShadow(volClipOrigin + volClipDirection * t, directionClip[li], t * volCosForward, directionDepth[li]);
						}
					#endif

					scattering += contribution;
					stepLights += 1.0;
				}
			#endif

			evaluatedLights = max(evaluatedLights, stepLights);

			// Analytic integral of the in-scattering over the segment, "sigma" times "(1 - e^(-sigma * dt)) / sigma".
			// This is what makes the result independent from the number of steps instead of merely converging to it.
			result += scattering * (viewTransmittance * (1.0 - exp(-sigmaT * dt)));
		}

		return vec4(result, evaluatedLights);
	}
#endif

#if VOL_LOCAL_ARRAY_LIGHTS == 1
	// Integrates a point or a spot light of the arrays over the part of the view ray crossing its volume.
	// Returns the in-scattered radiance in "rgb" and whether the light was evaluated in "a".
	vec4 volIntegrateArrayLight(int index, float tStart, float tEnd) {
		vec4 data = volLightData[index];
		vec4 direction = volLightDirection[index];
		vec4 falloff = volLightFalloff[index];

		vec2 chord = volLightChord(data, direction, falloff.x);
		float t0 = max(chord.x, tStart);
		float t1 = min(chord.y, tEnd);

		if (t1 <= t0) {
			return vec4(0.0);
		}

		vec4 diffuse = volLightDiffuse[index];

		#ifdef VOL_SCREEN_SHADOWS
			// "falloff.z" carries whether this light asked to be occluded by the geometry.
			bool occluded = falloff.z > 0.5;
			vec4 lightClip = volClipOrigin + volViewProjection * vec4(data.xyz, 0.0);
			float lightDepth = dot(data.xyz, volCameraForward);
		#endif

		${buildLocalLightIntegration(
			"float(index)",
			`#ifdef VOL_SCREEN_SHADOWS
					if (occluded) {
						contribution *= volScreenShadowToLight(t, lightClip, lightDepth, distanceToLight);
					}
				#endif`
		)}
	}
#endif

void main(void) {
	// Reconstruct the world space direction of the view ray from the UV of the pixel.
	vec4 farPoint = volInverseViewProjection * vec4(vUV * 2.0 - 1.0, 1.0, 1.0);
	volRayDir = normalize(farPoint.xyz / farPoint.w - volCameraPosition);

	// The depth map stores the distance along the view axis, the ray is not aligned with it.
	volCosForward = max(dot(volRayDir, volCameraForward), 1e-4);

	ivec2 depthSize = textureSize(textureSampler, 0);
	float viewZ = volReadLinearDepth(textureSampler, volScatterToDepthTexel(ivec2(gl_FragCoord.xy), depthSize));

	float tEnd = min(viewZ / volCosForward, volParams.x);
	float tStart = max(volCameraMinMaxZ.x / volCosForward, 1e-3);

	if (tEnd <= tStart) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
		return;
	}

	// Offsets the samples inside their segments to trade the banding produced by a low sample count for noise.
	volNoise = 0.0;
	#if VOL_DITHER == 1
		volNoise = volBayer4(gl_FragCoord.xy);
	#elif VOL_DITHER == 2
		vec2 ditherPosition = gl_FragCoord.xy;
		#ifdef VOL_TEMPORAL_JITTER
			ditherPosition += volFrameIndex * 5.588238;
		#endif
		volNoise = volInterleavedGradientNoise(ditherPosition);
	#endif
	volJitter = volNoise * volParams.y;

	#ifdef VOL_SCREEN_SHADOWS
		volDepthSize = depthSize;
		volClipOrigin = volViewProjection * vec4(volCameraPosition, 1.0);
		volClipDirection = volViewProjection * vec4(volRayDir, 0.0);
	#endif

	#if VOL_TRANSMITTANCE == 2
		volBuildOpticalDepths(tStart, tEnd);
	#endif

	#ifdef VOL_CSM
		volPrepareCsm();
	#endif

	float evaluatedLights = 0.0;

	// The in-scattering of the constant ambient light has a closed form whatever the medium: the extinction is
	// the derivative of the optical depth, so the integral of "sigma * T" along the ray is "T(start) - T(end)".
	vec3 accumulated = volAmbient * (volTransmittance(tStart) - volTransmittance(tEnd));
	vec4 lightResult = vec4(0.0);

	#if VOL_GLOBAL_LIGHT_COUNT > 0
		lightResult = volMarchGlobalLights(tStart, tEnd);
		accumulated += lightResult.rgb;
		evaluatedLights += lightResult.a;
	#endif

${localSlotContributions.join("")}

	#if VOL_LOCAL_ARRAY_LIGHTS == 1
		int localEnd = VOL_DIRECTIONAL_LIGHT_COUNT + int(volParams.w + 0.5);

		for (int i = VOL_DIRECTIONAL_LIGHT_COUNT; i < VOL_MAX_ARRAY_LIGHTS; ++i) {
			if (i >= localEnd) {
				break;
			}

			lightResult = volIntegrateArrayLight(i, tStart, tEnd);
			accumulated += lightResult.rgb;
			evaluatedLights += lightResult.a;
		}
	#endif

	// The scattering coefficient is a fraction of the extinction, which guarantees energy conservation.
	vec3 result = accumulated * volMedium.x * volFogColor;
	float finalTransmittance = volTransmittance(tEnd);

	#if VOL_DEBUG == 3
		// From blue for no light to red for 16 lights or more evaluated by the pixel.
		float ratioOfBudget = clamp(evaluatedLights / 16.0, 0.0, 1.0);
		result = vec3(ratioOfBudget, 1.0 - abs(ratioOfBudget * 2.0 - 1.0), 1.0 - ratioOfBudget);
	#endif

	#ifdef VOL_LDR_ENCODE
		result = result / (1.0 + result);
	#endif

	gl_FragColor = vec4(result, finalTransmittance);
}
`;
}

/**
 * The separable bilateral blur pass. Denoises the low resolution scattering buffer without letting the
 * light shafts bleed across the silhouettes of the geometry.
 */
export function buildVolumetricLightingBlurShader(): string {
	return /* glsl */ `precision highp float;
precision highp int;

varying vec2 vUV;

uniform sampler2D textureSampler;
uniform highp sampler2D volLinearDepthSampler;

uniform vec2 volCameraMinMaxZ;
uniform vec2 volDepthRatio;
uniform vec2 volBlurDirection;
uniform vec2 volBlurParams;

${packingHelpers}
${linearDepthHelpers}

void main(void) {
	// The blur runs at the resolution of the scattering buffer and every tap is an exact texel, compared using
	// the depth the raymarching used for it: no filtering is needed, no depth has to be unpacked nor linearized.
	ivec2 size = textureSize(textureSampler, 0);
	ivec2 depthSize = textureSize(volLinearDepthSampler, 0);
	ivec2 center = ivec2(gl_FragCoord.xy);
	ivec2 direction = ivec2(volBlurDirection);

	float centerDepth = volReadLinearDepth(volLinearDepthSampler, volScatterToDepthTexel(center, depthSize));
	float inverseDepthThreshold = 1.0 / max(volBlurParams.y * max(centerDepth, volCameraMinMaxZ.x), 1e-4);
	float sigma = max(volBlurParams.x, 1e-4);
	float inverseTwoSigma2 = 1.0 / (2.0 * sigma * sigma);

	vec4 result = texelFetch(textureSampler, center, 0);
	float totalWeight = 1.0;

	for (int i = 1; i <= VOL_BLUR_RADIUS; ++i) {
		float spatialWeight = exp(-float(i * i) * inverseTwoSigma2);

		ivec2 positive = center + direction * i;
		ivec2 negative = center - direction * i;

		if (positive.x < size.x && positive.y < size.y) {
			float weight = spatialWeight * exp(-abs(volReadLinearDepth(volLinearDepthSampler, volScatterToDepthTexel(positive, depthSize)) - centerDepth) * inverseDepthThreshold);
			result += texelFetch(textureSampler, positive, 0) * weight;
			totalWeight += weight;
		}

		if (negative.x >= 0 && negative.y >= 0) {
			float weight = spatialWeight * exp(-abs(volReadLinearDepth(volLinearDepthSampler, volScatterToDepthTexel(negative, depthSize)) - centerDepth) * inverseDepthThreshold);
			result += texelFetch(textureSampler, negative, 0) * weight;
			totalWeight += weight;
		}
	}

	gl_FragColor = result / totalWeight;
}
`;
}

/**
 * The composition pass. Upsamples the low resolution scattering buffer using a depth aware filter and
 * adds it to the color of the scene.
 */
export function buildVolumetricLightingComposeShader(): string {
	return /* glsl */ `precision highp float;
precision highp int;

varying vec2 vUV;

uniform sampler2D textureSampler;
uniform sampler2D volSceneSampler;
uniform highp sampler2D volLinearDepthSampler;

uniform vec2 volCameraMinMaxZ;
uniform vec2 volDepthRatio;
uniform vec4 volComposeParams;

${packingHelpers}
${linearDepthHelpers}

float volBayer8(vec2 p) {
	vec2 p1 = mod(floor(p), 2.0);
	vec2 p2 = mod(floor(p * 0.5), 2.0);
	vec2 p3 = mod(floor(p * 0.25), 2.0);

	float b1 = 2.0 * p1.x + 3.0 * p1.y - 4.0 * p1.x * p1.y;
	float b2 = 2.0 * p2.x + 3.0 * p2.y - 4.0 * p2.x * p2.y;
	float b3 = 2.0 * p3.x + 3.0 * p3.y - 4.0 * p3.x * p3.y;

	return (b1 * 16.0 + b2 * 4.0 + b3) / 64.0;
}

// Nearest depth upsampling: the four low resolution taps around the pixel are weighted by both their
// bilinear weight and how close the depth the raymarching used for them is to the depth of the pixel.
vec4 volUpsample(float centerDepth, ivec2 depthSize) {
	ivec2 size = textureSize(textureSampler, 0);
	vec2 texelCoordinate = vUV * vec2(size) - 0.5;
	vec2 baseCoordinate = floor(texelCoordinate);
	vec2 fraction = texelCoordinate - baseCoordinate;

	ivec2 base = ivec2(baseCoordinate);
	ivec2 maximum = size - 1;

	float inverseDepthThreshold = 1.0 / max(volComposeParams.z * max(centerDepth, volCameraMinMaxZ.x), 1e-4);

	vec4 result = vec4(0.0);
	float totalWeight = 0.0;

	vec4 nearestSample = vec4(0.0);
	float nearestDistance = 1e20;

	for (int y = 0; y < 2; ++y) {
		for (int x = 0; x < 2; ++x) {
			ivec2 coordinates = clamp(base + ivec2(x, y), ivec2(0), maximum);

			float bilinearWeight = (x == 0 ? 1.0 - fraction.x : fraction.x) * (y == 0 ? 1.0 - fraction.y : fraction.y);
			float depthDistance = abs(volReadLinearDepth(volLinearDepthSampler, volScatterToDepthTexel(coordinates, depthSize)) - centerDepth);

			vec4 tap = texelFetch(textureSampler, coordinates, 0);

			if (depthDistance < nearestDistance) {
				nearestDistance = depthDistance;
				nearestSample = tap;
			}

			float weight = bilinearWeight / (1e-4 + depthDistance * inverseDepthThreshold);
			result += tap * weight;
			totalWeight += weight;
		}
	}

	// Every tap sits on the other side of a silhouette, fall back to the closest one instead of averaging.
	return totalWeight > 1e-4 ? result / totalWeight : nearestSample;
}

void main(void) {
	// The linear depth has the full resolution of the canvas: same texel the depth map would give with a nearest filter.
	ivec2 depthSize = textureSize(volLinearDepthSampler, 0);
	float centerDepth = volReadLinearDepth(volLinearDepthSampler, min(ivec2(vUV * vec2(depthSize)), depthSize - 1));

	vec4 volumetric = volUpsample(centerDepth, depthSize);

	#ifdef VOL_LDR_ENCODE
		volumetric.rgb = volumetric.rgb / max(vec3(1e-4), 1.0 - volumetric.rgb);
	#endif

	#if VOL_DEBUG == 1 || VOL_DEBUG == 3
		gl_FragColor = vec4(volumetric.rgb * volComposeParams.x, 1.0);
		return;
	#elif VOL_DEBUG == 2
		gl_FragColor = vec4(vec3(volumetric.a), 1.0);
		return;
	#endif

	vec3 sceneColor = texture2D(volSceneSampler, vUV).rgb;

	// The materials of the scene already attenuated their color with the fog, so this is left at 0 by
	// default and only becomes useful when the medium is driven by the pipeline instead of the scene fog.
	sceneColor *= mix(1.0, volumetric.a, volComposeParams.y);

	vec3 result = sceneColor + volumetric.rgb * volComposeParams.x;

	// Breaks up the banding an 8 bits output would otherwise show on the smooth gradients of the shafts.
	result += (volBayer8(gl_FragCoord.xy) - 0.5) * volComposeParams.w;

	gl_FragColor = vec4(result, 1.0);
}
`;
}

const registered: Partial<Record<ShaderLanguage, boolean>> = {};

/**
 * Registers the shaders of the volumetric lighting rendering pipeline in the shader store of Babylon.js.
 * Calling this function multiple times for the same language has no effect.
 *
 * The WGSL sources are hand written rather than transpiled from the GLSL ones: Babylon.js can only convert
 * GLSL to WGSL by downloading twgsl from its CDN, which an offline application can't rely on.
 * @param shaderLanguage defines the language the shaders are registered for.
 */
export function registerVolumetricLightingShaders(shaderLanguage: ShaderLanguage): void {
	if (registered[shaderLanguage]) {
		return;
	}

	registered[shaderLanguage] = true;

	if (shaderLanguage === ShaderLanguage.WGSL) {
		const shaders = getVolumetricLightingShadersWGSL();

		ShaderStore.ShadersStoreWGSL[`${volumetricLightingLinearDepthShaderName}PixelShader`] = shaders.linearDepth;
		ShaderStore.ShadersStoreWGSL[`${volumetricLightingScatteringShaderName}PixelShader`] = shaders.scattering;
		ShaderStore.ShadersStoreWGSL[`${volumetricLightingBlurShaderName}PixelShader`] = shaders.blur;
		ShaderStore.ShadersStoreWGSL[`${volumetricLightingComposeShaderName}PixelShader`] = shaders.compose;

		return;
	}

	ShaderStore.ShadersStore[`${volumetricLightingLinearDepthShaderName}PixelShader`] = buildVolumetricLightingLinearDepthShader();
	ShaderStore.ShadersStore[`${volumetricLightingScatteringShaderName}PixelShader`] = buildVolumetricLightingScatteringShader(maxVolumetricShadowSlots);
	ShaderStore.ShadersStore[`${volumetricLightingBlurShaderName}PixelShader`] = buildVolumetricLightingBlurShader();
	ShaderStore.ShadersStore[`${volumetricLightingComposeShaderName}PixelShader`] = buildVolumetricLightingComposeShader();
}
