import { ShaderStore } from "@babylonjs/core/Engines/shaderStore";

import { maxVolumetricShadowSlots } from "./types";

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
 * Common helpers shared by the three passes of the pipeline.
 */
const commonHelpers = /* glsl */ `
	float volUnpack(vec4 color) {
		const vec4 bitShift = vec4(1.0 / (255.0 * 255.0 * 255.0), 1.0 / (255.0 * 255.0), 1.0 / 255.0, 1.0);
		return dot(color, bitShift);
	}

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
 * The raymarching pass. Accumulates the single-scattering integral of every enabled light of the scene
 * along the view ray, through the participating medium described by the fog of the scene.
 *
 * The result is written as (rgb = in-scattered radiance, a = transmittance of the medium at the end of the ray).
 * @param shadowSlotCount defines the number of shadowed light slots the shader is generated for.
 */
export function buildVolumetricLightingScatteringShader(shadowSlotCount: number): string {
	const slots: string[] = [];

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

	float volShadow{X}(vec3 p) {
		vec4 info = volShadowInfo[{X}];
		float edge = volShadowLightFalloff[{X}].z;

		#if VOL_SHADOW_KIND{X} == 2
			// Cube shadow map of a point light. It stores the radial distance to the light.
			vec3 toFragment = p - volShadowLightData[{X}].xyz;
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
			vec4 clip = volShadowMatrix[{X}] * vec4(p, 1.0);
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
#endif
`.replace(/\{X\}/g, i.toString())
		);
	}

	const shadowContributions: string[] = [];
	for (let i = 0; i < shadowSlotCount; ++i) {
		shadowContributions.push(
			/* glsl */ `
			#if VOL_SHADOW_SLOT_COUNT > {X}
			{
				vec3 lightVector;
				float distanceToLight;
				vec3 contribution = volEvalLight(volShadowLightData[{X}], volShadowLightDiffuse[{X}], volShadowLightDirection[{X}], volShadowLightFalloff[{X}], p, rayDir, sigmaT, lightVector, distanceToLight);
				if (dot(contribution, contribution) > 0.0) {
					float shadow = mix(1.0, volShadow{X}(p), volShadowLightFalloff[{X}].w);
					scattering += contribution * shadow;
					stepLights += 1.0;
				}
			}
			#endif
`.replace(/\{X\}/g, i.toString())
		);
	}

	return /* glsl */ `precision highp float;

varying vec2 vUV;

uniform sampler2D textureSampler;
uniform sampler2D depthSampler;

uniform mat4 volInverseViewProjection;
uniform vec3 volCameraPosition;
uniform vec3 volCameraForward;
uniform vec2 volCameraMinMaxZ;
uniform vec2 volDepthUnpack;
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
uniform vec4 volParams;

#if VOL_ARRAY_LIGHT_COUNT > 0
	uniform vec4 volLightData[VOL_ARRAY_LIGHT_COUNT];
	uniform vec4 volLightDiffuse[VOL_ARRAY_LIGHT_COUNT];
	uniform vec4 volLightDirection[VOL_ARRAY_LIGHT_COUNT];
	uniform vec4 volLightFalloff[VOL_ARRAY_LIGHT_COUNT];
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

${commonHelpers}

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

// Transmittance of the medium between the camera and "t". The three models match the ones the fog of
// Babylon.js uses, but every value comes from the configuration of this pipeline: the medium the shafts are
// computed in is deliberately independent from the fog applied on the surfaces of the scene.
// "volFogInfos" is (mode, start, end, density).
float volMediumTransmittance(float t) {
	float coefficient = 1.0;

	#if VOL_FOG_MODE == 2
		coefficient = (volFogInfos.z - t) / max(volFogInfos.z - volFogInfos.y, volLinearFogEps);
	#elif VOL_FOG_MODE == 1
		coefficient = 1.0 / pow(2.71828, t * t * volFogInfos.w * volFogInfos.w);
	#else
		coefficient = 1.0 / pow(2.71828, t * volFogInfos.w);
	#endif

	return clamp(coefficient, 0.0, 1.0);
}

// The extinction coefficient is the exact analytic derivative of the transmittance above:
// sigma(t) = -d/dt ln(T(t)). Keeping the two in sync is what makes the result independent from the number
// of steps the medium is marched with.
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

float volExtinctionAt(vec3 p, float t) {
	float sigma = volFogExtinction(t);

	#ifdef VOL_HEIGHT_FOG
		sigma *= exp(-max(0.0, p.y - volMedium.y) * volMedium.z);
	#endif

	return sigma;
}

#ifdef VOL_SCREEN_SHADOWS
// Walks the segment between a point of the medium and a light, and reports the point as occluded as soon as
// one of the samples sits behind what the depth buffer holds. This is what stops the shafts of a light that
// has no shadow map from showing through the walls that stand between it and the camera.
// "volScreenShadowParams" is (maximum traced distance, relative depth bias, relative surface thickness, unused).
float volScreenShadow(vec3 p, vec3 lightVector, float distanceToLight, float jitter) {
	float traced = min(distanceToLight, volScreenShadowParams.x);
	if (traced <= 0.0) {
		return 1.0;
	}

	// The samples are spread strictly between the shaded point and the light: the point itself is on the
	// view ray, so it always sits in front of the depth buffer and could only ever occlude itself.
	float stepSize = traced / float(VOL_SCREEN_SHADOW_STEPS + 1);

	for (int i = 1; i <= VOL_SCREEN_SHADOW_STEPS; ++i) {
		vec3 samplePosition = p + lightVector * (stepSize * (float(i) + jitter));

		vec4 clip = volViewProjection * vec4(samplePosition, 1.0);
		if (clip.w <= 0.0) {
			continue;
		}

		vec2 uv = (clip.xy / clip.w) * 0.5 + 0.5;
		if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
			continue;
		}

		// Distance along the view axis, which is what the depth map stores.
		float sampleDepth = dot(samplePosition - volCameraPosition, volCameraForward);
		float sceneDepth = volLinearDepth(volSampleDepth(depthSampler, uv));

		// Bounded by the assumed thickness of the surface: a sample much further away than the surface it is
		// hidden behind has passed it rather than been stopped by it, and counting it as occluded would
		// stamp the silhouette of everything in the foreground into the shafts behind it.
		float depthDifference = sampleDepth - sceneDepth;
		float bias = max(volScreenShadowParams.y * sceneDepth, volCameraMinMaxZ.x);

		if (depthDifference > bias && depthDifference < volScreenShadowParams.z * sceneDepth) {
			return 0.0;
		}
	}

	return 1.0;
}
#endif

// Evaluates the in-scattered radiance coming from a single light, without any shadowing.
vec3 volEvalLight(vec4 data, vec4 diffuse, vec4 direction, vec4 falloff, vec3 p, vec3 rayDir, float sigmaT, out vec3 lightVector, out float distanceToLight) {
	float attenuation = 1.0;

	lightVector = vec3(0.0, 1.0, 0.0);
	distanceToLight = 0.0;

	if (data.w == 1.0) {
		// Directional light: "data.xyz" already holds the direction pointing to the light.
		lightVector = data.xyz;
		distanceToLight = 3.4e38;
	} else {
		vec3 toLight = data.xyz - p;
		distanceToLight = max(length(toLight), 1e-4);
		lightVector = toLight / distanceToLight;

		// Same linear attenuation as "computeLighting" in the "lightsFragmentFunctions" include.
		attenuation = max(0.0, 1.0 - distanceToLight / falloff.x);

		if (data.w == 2.0) {
			float cosAngle = max(0.0, dot(direction.xyz, -lightVector));
			attenuation *= (cosAngle >= direction.w) ? max(0.0, pow(cosAngle, falloff.y)) : 0.0;
		}
	}

	if (attenuation <= 0.0) {
		return vec3(0.0);
	}

	#ifdef VOL_LIGHT_EXTINCTION
		if (data.w != 1.0) {
			// Attenuation of the light on its way from the light to the sample. Exact for an exponential fog,
			// which describes a homogeneous medium, and a faithful approximation for the other modes.
			attenuation *= exp(-sigmaT * min(distanceToLight, volParams.z));
		}
	#endif

	// The scattering angle is the angle between the direction the light travels (-lightVector) and the
	// direction the ray travels (-rayDir), which is exactly dot(rayDir, lightVector).
	return diffuse.rgb * (attenuation * volPhaseHG(dot(rayDir, lightVector), diffuse.a));
}

${slots.join("\n")}

#ifdef VOL_CSM
	float volCsmShadow(vec3 p) {
		for (int cascade = 0; cascade < VOL_CSM_CASCADES; ++cascade) {
			vec4 clip = volCsmMatrices[cascade] * vec4(p, 1.0);
			vec3 clipSpace = clip.xyz / clip.w;
			vec2 uv = 0.5 * clipSpace.xy + vec2(0.5);

			// A point outside every cascade must stay lit, exactly like the material path does past the last
			// cascade. Falling back to the last cascade would sample its clamped border texel and report the
			// whole distant volume as shadowed.
			#ifdef VOL_NDC_HALF_Z
				bool insideDepth = clipSpace.z >= 0.0 && clipSpace.z <= 1.0;
			#else
				bool insideDepth = abs(clipSpace.z) <= 1.0;
			#endif

			bool inside = all(greaterThanEqual(uv, vec2(0.02))) && all(lessThanEqual(uv, vec2(0.98))) && insideDepth;
			if (!inside) {
				continue;
			}

			#if VOL_CSM_KIND == 1
				vec3 uvDepth = vec3(0.5 * clipSpace + vec3(0.5));
				#ifdef VOL_NDC_HALF_Z
					uvDepth.z = clipSpace.z;
				#endif

				float shadow = texture2D(volCsmSampler, vec4(uvDepth.x, uvDepth.y, float(cascade), uvDepth.z));
				return volFallOff(mix(volCsmInfo.x, 1.0, shadow), clipSpace.xy, volCsmLightFalloff.z);
			#else
				float depthMetric = clamp(volDepthMetric(clip, volCsmInfo.zw), 0.0, 1.0);

				#ifdef VOL_CSM_PACKED
					float shadowMapSample = volUnpack(texture2D(volCsmSampler, vec3(uv, float(cascade))));
				#else
					float shadowMapSample = texture2D(volCsmSampler, vec3(uv, float(cascade))).x;
				#endif

				return depthMetric > shadowMapSample ? volFallOff(volCsmInfo.x, clipSpace.xy, volCsmLightFalloff.z) : 1.0;
			#endif
		}

		return 1.0;
	}
#endif

void main(void) {
	// Reconstruct the world space direction of the view ray from the UV of the pixel.
	vec4 farPoint = volInverseViewProjection * vec4(vUV * 2.0 - 1.0, 1.0, 1.0);
	vec3 rayDir = normalize(farPoint.xyz / farPoint.w - volCameraPosition);

	// The depth map stores the distance along the view axis, the ray is not aligned with it.
	float cosForward = max(dot(rayDir, volCameraForward), 1e-4);
	float viewZ = volLinearDepth(volSampleDepth(depthSampler, vUV));

	float tEnd = min(viewZ / cosForward, volParams.x);
	float tStart = max(volCameraMinMaxZ.x / cosForward, 1e-3);

	if (tEnd <= tStart) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
		return;
	}

	// Offset the first sample of the ray to trade the banding produced by a low step count for noise.
	float jitter = 0.0;
	#if VOL_DITHER == 1
		jitter = volBayer4(gl_FragCoord.xy);
	#elif VOL_DITHER == 2
		vec2 ditherPosition = gl_FragCoord.xy;
		#ifdef VOL_TEMPORAL_JITTER
			ditherPosition += volFrameIndex * 5.588238;
		#endif
		jitter = volInterleavedGradientNoise(ditherPosition);
	#endif
	jitter *= volParams.y;

	#if VOL_DISTRIBUTION == 1
		float ratio = pow(tEnd / tStart, 1.0 / float(VOL_STEPS));
	#else
		float uniformStep = (tEnd - tStart) / float(VOL_STEPS);
	#endif

	vec3 accumulated = vec3(0.0);
	float transmittance = 1.0;
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
		float t = segmentBegin + dt * jitter;
		segmentStart = segmentEnd;

		vec3 p = volCameraPosition + rayDir * t;
		float sigmaT = volExtinctionAt(p, t);

		if (sigmaT > 1e-6) {
			// Both branches give the transmittance at the START of the segment: "segmentIntegral" below
			// already accounts for the extinction across the segment itself.
			#ifdef VOL_ANALYTIC_TRANSMITTANCE
				float viewTransmittance = volMediumTransmittance(segmentBegin);
			#else
				float viewTransmittance = transmittance;
			#endif

			if (viewTransmittance < 0.003) {
				break;
			}

			vec3 scattering = volAmbient;
			float stepLights = 0.0;

${shadowContributions.join("")}
			#ifdef VOL_CSM
			{
				vec3 lightVector;
				float distanceToLight;
				vec3 contribution = volEvalLight(volCsmLightData, volCsmLightDiffuse, volCsmLightDirection, volCsmLightFalloff, p, rayDir, sigmaT, lightVector, distanceToLight);
				if (dot(contribution, contribution) > 0.0) {
					scattering += contribution * mix(1.0, volCsmShadow(p), volCsmLightFalloff.w);
					stepLights += 1.0;
				}
			}
			#endif

			#if VOL_ARRAY_LIGHT_COUNT > 0
			for (int li = 0; li < VOL_ARRAY_LIGHT_COUNT; ++li) {
				vec3 lightVector;
				float distanceToLight;
				vec3 contribution = volEvalLight(volLightData[li], volLightDiffuse[li], volLightDirection[li], volLightFalloff[li], p, rayDir, sigmaT, lightVector, distanceToLight);

				#ifdef VOL_SCREEN_SHADOWS
					// "volLightFalloff[li].z" carries whether this light asked to be occluded by the geometry.
					if (dot(contribution, contribution) > 0.0 && volLightFalloff[li].z > 0.5) {
						contribution *= volScreenShadow(p, lightVector, distanceToLight, jitter);
					}
				#endif

				scattering += contribution;
				stepLights += dot(contribution, contribution) > 0.0 ? 1.0 : 0.0;
			}
			#endif

			evaluatedLights = max(evaluatedLights, stepLights);

			// The scattering coefficient is a fraction of the extinction, which guarantees energy conservation.
			scattering *= sigmaT * volMedium.x * volFogColor;

			// Analytic integral of the in-scattering over the segment. This is what makes the result
			// independent from the number of steps instead of merely converging to it.
			float attenuation = exp(-sigmaT * dt);
			float segmentIntegral = (1.0 - attenuation) / sigmaT;

			accumulated += viewTransmittance * scattering * segmentIntegral;

			#ifndef VOL_ANALYTIC_TRANSMITTANCE
				transmittance *= attenuation;
			#endif
		}
	}

	#ifdef VOL_ANALYTIC_TRANSMITTANCE
		float finalTransmittance = volMediumTransmittance(tEnd);
	#else
		float finalTransmittance = transmittance;
	#endif

	vec3 result = accumulated;

	#if VOL_DEBUG == 3
		float ratioOfBudget = clamp(evaluatedLights / float(max(VOL_ARRAY_LIGHT_COUNT + VOL_SHADOW_SLOT_COUNT + VOL_CSM_LIGHT_COUNT, 1)), 0.0, 1.0);
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

varying vec2 vUV;

uniform sampler2D textureSampler;
uniform sampler2D depthSampler;

uniform vec2 volCameraMinMaxZ;
uniform vec2 volDepthUnpack;
uniform vec2 volBlurDirection;
uniform vec2 volBlurParams;

${commonHelpers}

void main(void) {
	float centerDepth = volLinearDepth(volSampleDepth(depthSampler, vUV));
	float depthThreshold = max(volBlurParams.y * max(centerDepth, volCameraMinMaxZ.x), 1e-4);
	float sigma = max(volBlurParams.x, 1e-4);

	vec4 result = texture2D(textureSampler, vUV);
	float totalWeight = 1.0;

	for (int i = 1; i <= VOL_BLUR_RADIUS; ++i) {
		float offset = float(i);
		float spatialWeight = exp(-offset * offset / (2.0 * sigma * sigma));

		vec2 uvPositive = vUV + volBlurDirection * offset;
		vec2 uvNegative = vUV - volBlurDirection * offset;

		if (uvPositive.x <= 1.0 && uvPositive.y <= 1.0 && uvPositive.x >= 0.0 && uvPositive.y >= 0.0) {
			float weight = spatialWeight * exp(-abs(volLinearDepth(volSampleDepth(depthSampler, uvPositive)) - centerDepth) / depthThreshold);
			result += texture2D(textureSampler, uvPositive) * weight;
			totalWeight += weight;
		}

		if (uvNegative.x <= 1.0 && uvNegative.y <= 1.0 && uvNegative.x >= 0.0 && uvNegative.y >= 0.0) {
			float weight = spatialWeight * exp(-abs(volLinearDepth(volSampleDepth(depthSampler, uvNegative)) - centerDepth) / depthThreshold);
			result += texture2D(textureSampler, uvNegative) * weight;
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

varying vec2 vUV;

uniform sampler2D textureSampler;
uniform sampler2D volSceneSampler;
uniform sampler2D depthSampler;

uniform vec2 volCameraMinMaxZ;
uniform vec2 volDepthUnpack;
uniform vec2 volScatterTexelSize;
uniform vec4 volComposeParams;

${commonHelpers}

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
// bilinear weight and how close their depth is to the depth of the full resolution pixel.
vec4 volUpsample(float centerDepth) {
	vec2 scatterSize = 1.0 / volScatterTexelSize;
	vec2 texelCoordinate = vUV * scatterSize - 0.5;
	vec2 baseCoordinate = floor(texelCoordinate);
	vec2 fraction = texelCoordinate - baseCoordinate;

	float depthThreshold = max(volComposeParams.z * max(centerDepth, volCameraMinMaxZ.x), 1e-4);

	vec4 result = vec4(0.0);
	float totalWeight = 0.0;

	vec4 nearestSample = vec4(0.0);
	float nearestDistance = 1e20;

	for (int y = 0; y < 2; ++y) {
		for (int x = 0; x < 2; ++x) {
			vec2 offset = vec2(float(x), float(y));
			vec2 uv = (baseCoordinate + offset + 0.5) * volScatterTexelSize;

			float bilinearWeight = (x == 0 ? 1.0 - fraction.x : fraction.x) * (y == 0 ? 1.0 - fraction.y : fraction.y);
			float depthDistance = abs(volLinearDepth(volSampleDepth(depthSampler, uv)) - centerDepth);

			vec4 tap = texture2D(textureSampler, uv);

			if (depthDistance < nearestDistance) {
				nearestDistance = depthDistance;
				nearestSample = tap;
			}

			float weight = bilinearWeight / (1e-4 + depthDistance / depthThreshold);
			result += tap * weight;
			totalWeight += weight;
		}
	}

	// Every tap sits on the other side of a silhouette, fall back to the closest one instead of averaging.
	return totalWeight > 1e-4 ? result / totalWeight : nearestSample;
}

void main(void) {
	float centerDepth = volLinearDepth(volSampleDepth(depthSampler, vUV));

	vec4 volumetric = volUpsample(centerDepth);

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

let registered = false;

/**
 * Registers the shaders of the volumetric lighting rendering pipeline in the shader store of Babylon.js.
 * Calling this function multiple times has no effect.
 */
export function registerVolumetricLightingShaders(): void {
	if (registered) {
		return;
	}

	registered = true;

	ShaderStore.ShadersStore[`${volumetricLightingScatteringShaderName}PixelShader`] = buildVolumetricLightingScatteringShader(maxVolumetricShadowSlots);
	ShaderStore.ShadersStore[`${volumetricLightingBlurShaderName}PixelShader`] = buildVolumetricLightingBlurShader();
	ShaderStore.ShadersStore[`${volumetricLightingComposeShaderName}PixelShader`] = buildVolumetricLightingComposeShader();
}
