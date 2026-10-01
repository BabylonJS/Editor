/**
 * WGSL chunks of the terrain material plugin (SPEC §5.4), injected by TerrainMaterialPlugin.getCustomCode("fragment", ShaderLanguage.WGSL).
 * The strings are template literals: no double-quoted Babylon.js core module specifier may appear in this file (tools/esbuild.mjs rewrites them greedily).
 */

/** The 6 fragment injection points of the plugin (same keys as TERRAIN_GLSL_FRAGMENT). */
export const TERRAIN_WGSL_FRAGMENT: Readonly<Record<string, string>> = {
	CUSTOM_FRAGMENT_DEFINITIONS: `#ifdef TERRAIN
var terrainWeights0SamplerSampler: sampler;
var terrainWeights0Sampler: texture_2d<f32>;
#ifdef TERRAIN_WEIGHTS1
var terrainWeights1SamplerSampler: sampler;
var terrainWeights1Sampler: texture_2d<f32>;
#endif
#ifdef TERRAIN_ALBEDO
var terrainAlbedoArraySamplerSampler: sampler;
var terrainAlbedoArraySampler: texture_2d_array<f32>;
#endif
#ifdef TERRAIN_NORMALS
var terrainNormalArraySamplerSampler: sampler;
var terrainNormalArraySampler: texture_2d_array<f32>;
#endif
var<private> terrainAlbedo: vec3f = vec3f(1.0);
var<private> terrainNormalTS: vec3f = vec3f(0.0, 0.0, 1.0);
var<private> terrainRoughness: f32 = 1.0;
var<private> terrainMetallic: f32 = 0.0;
#if TERRAIN_DEBUG > 0
var<private> terrainDebugColor: vec3f = vec3f(0.0);
var<private> terrainDebugMask: f32 = 0.0;
var<private> terrainPalette: array<vec3f, 8> = array<vec3f, 8>(vec3f(0.90, 0.20, 0.20), vec3f(0.20, 0.80, 0.20), vec3f(0.20, 0.40, 0.95), vec3f(0.95, 0.85, 0.20), vec3f(0.85, 0.30, 0.85), vec3f(0.20, 0.85, 0.85), vec3f(0.95, 0.55, 0.15), vec3f(0.60, 0.60, 0.60));
#endif
fn terrainCotangentFrame(normal: vec3f, p: vec3f, uv: vec2f) -> mat3x3f {
	let dp1: vec3f = dpdx(p);
	let dp2: vec3f = dpdy(p);
	let duv1: vec2f = dpdx(uv);
	let duv2: vec2f = dpdy(uv);
	let dp2perp: vec3f = cross(dp2, normal);
	let dp1perp: vec3f = cross(normal, dp1);
	let tangent: vec3f = dp2perp * duv1.x + dp1perp * duv2.x;
	let bitangent: vec3f = dp2perp * duv1.y + dp1perp * duv2.y;
	let det: f32 = max(dot(tangent, tangent), dot(bitangent, bitangent));
	let invmax: f32 = select(inverseSqrt(det), 0.0, det == 0.0);
	return mat3x3f(tangent * invmax, bitangent * invmax, normal);
}
#endif`,
	CUSTOM_FRAGMENT_MAIN_BEGIN: `#ifdef TERRAIN
{
	let terrainUV: vec2f = fragmentInputs.vMainUV1;
	let terrainW0: vec4f = textureSample(terrainWeights0Sampler, terrainWeights0SamplerSampler, terrainUV);
#ifdef TERRAIN_WEIGHTS1
	let terrainW1: vec4f = textureSample(terrainWeights1Sampler, terrainWeights1SamplerSampler, terrainUV);
#else
	let terrainW1: vec4f = vec4f(0.0);
#endif
	var terrainWeights = array<f32, 8>(terrainW0.x, terrainW0.y, terrainW0.z, terrainW0.w, terrainW1.x, terrainW1.y, terrainW1.z, terrainW1.w);
	var terrainWSum: f32 = 0.0;
	for (var i: i32 = 0; i < 8; i++) {
		if (i >= TERRAIN_LAYERS) {
			terrainWeights[i] = 0.0;
		}
		terrainWSum += terrainWeights[i];
	}
	if (terrainWSum > 0.0001) {
		for (var i: i32 = 0; i < 8; i++) {
			terrainWeights[i] = terrainWeights[i] / terrainWSum;
		}
	} else {
		terrainWeights[0] = 1.0;
	}
	var terrainLA: array<vec4f, 8>;
	var terrainLN: array<vec4f, 8>;
	for (var i: i32 = 0; i < TERRAIN_LAYERS; i++) {
		let layerUV: vec2f = terrainUV * uniforms.terrainLayerUV[i].xy + uniforms.terrainLayerUV[i].zw;
#ifdef TERRAIN_ALBEDO
		terrainLA[i] = textureSample(terrainAlbedoArraySampler, terrainAlbedoArraySamplerSampler, layerUV, i);
#else
		terrainLA[i] = vec4f(1.0, 1.0, 1.0, 0.5);
#endif
#ifdef TERRAIN_NORMALS
		terrainLN[i] = textureSample(terrainNormalArraySampler, terrainNormalArraySamplerSampler, layerUV, i);
#else
		terrainLN[i] = vec4f(0.5, 0.5, 1.0, 1.0);
#endif
	}
#ifdef TERRAIN_HEIGHTBLEND
	var terrainT: array<f32, 8>;
	var terrainMaxT: f32 = -1.0e5;
	for (var i: i32 = 0; i < TERRAIN_LAYERS; i++) {
		let terrainH: f32 = clamp(terrainLA[i].a * uniforms.terrainLayerHeight[i].x + uniforms.terrainLayerHeight[i].y, 0.0, 1.0);
		terrainT[i] = select(-1.0e5, terrainH + terrainWeights[i], terrainWeights[i] > 0.0);
		terrainMaxT = max(terrainMaxT, terrainT[i]);
	}
	var terrainBSum: f32 = 0.0;
	for (var i: i32 = 0; i < TERRAIN_LAYERS; i++) {
		let terrainB: f32 = select(0.0, max(terrainT[i] - (terrainMaxT - uniforms.terrainInfo.y), 0.0), terrainWeights[i] > 0.0);
		terrainWeights[i] = terrainB;
		terrainBSum += terrainB;
	}
	terrainBSum = max(terrainBSum, 0.0001);
	for (var i: i32 = 0; i < TERRAIN_LAYERS; i++) {
		terrainWeights[i] = terrainWeights[i] / terrainBSum;
	}
#endif
	terrainAlbedo = vec3f(0.0);
	var terrainN: vec3f = vec3f(0.0);
	terrainRoughness = 0.0;
	terrainMetallic = 0.0;
	for (var i: i32 = 0; i < TERRAIN_LAYERS; i++) {
		let w: f32 = terrainWeights[i];
		let tint: vec4f = uniforms.terrainLayerTint[i];
		let pbr: vec4f = uniforms.terrainLayerPBR[i];
		let ao: f32 = mix(1.0, terrainLN[i].a, pbr.z);
		terrainAlbedo += toLinearSpaceVec3(terrainLA[i].rgb) * tint.rgb * ao * w;
		let nxy: vec2f = terrainLN[i].rg * 2.0 - 1.0;
		let nz: f32 = sqrt(clamp(1.0 - dot(nxy, nxy), 0.0, 1.0));
		terrainN += vec3f(nxy * tint.w, nz) * w;
		terrainRoughness += pbr.x * terrainLN[i].b * w;
		terrainMetallic += pbr.y * w;
	}
	let terrainNLength: f32 = length(terrainN);
	terrainNormalTS = select(vec3f(0.0, 0.0, 1.0), terrainN / max(terrainNLength, 0.00001), terrainNLength > 0.00001);
#if TERRAIN_DEBUG == 1
	for (var i: i32 = 0; i < TERRAIN_LAYERS; i++) {
		terrainDebugColor += terrainPalette[i] * terrainWeights[i];
	}
	terrainDebugMask = 1.0;
#elif TERRAIN_DEBUG == 2
	var terrainActive: f32 = 0.0;
	for (var i: i32 = 0; i < TERRAIN_LAYERS; i++) {
		terrainActive += select(0.0, terrainWeights[i], i == i32(uniforms.terrainDebug.x + 0.5));
	}
	terrainDebugColor = mix(vec3f(0.05, 0.1, 0.4), vec3f(1.0), terrainActive);
	terrainDebugMask = 1.0;
#elif TERRAIN_DEBUG == 3
	let terrainContour: f32 = fragmentInputs.vPositionW.y / max(uniforms.terrainDebug.y, 0.001);
	let terrainContourWidth: f32 = fwidth(terrainContour);
	let terrainContourDist: f32 = abs(fract(terrainContour - 0.5) - 0.5) / max(terrainContourWidth, 0.00001);
	terrainDebugColor = vec3f(1.0, 0.85, 0.2);
	// No line where the height doesn't vary across the pixel: a plateau lying exactly on a level (a new terrain, flat at 0) would be filled.
	terrainDebugMask = select(0.0, 1.0 - min(terrainContourDist, 1.0), terrainContourWidth * max(uniforms.terrainDebug.y, 0.001) > max(0.0001, abs(fragmentInputs.vPositionW.y) * 0.000001));
#elif TERRAIN_DEBUG == 4
	let terrainSlope: f32 = degrees(acos(clamp(normalize(fragmentInputs.vNormalW).y, -1.0, 1.0)));
	terrainDebugColor = select(select(vec3f(0.9, 0.25, 0.2), vec3f(0.95, 0.8, 0.2), terrainSlope < 45.0), vec3f(0.2, 0.8, 0.3), terrainSlope < 30.0);
	terrainDebugMask = 1.0;
#elif TERRAIN_DEBUG == 5
	let terrainCells: vec2f = terrainUV * uniforms.terrainDebug.z;
	let terrainGrid: vec2f = abs(fract(terrainCells - 0.5) - 0.5) / max(fwidth(terrainCells), vec2f(0.00001));
	terrainDebugColor = vec3f(1.0);
	terrainDebugMask = 1.0 - min(min(terrainGrid.x, terrainGrid.y), 1.0);
#endif
}
#endif`,
	CUSTOM_FRAGMENT_UPDATE_ALBEDO: `#ifdef TERRAIN
	surfaceAlbedo *= terrainAlbedo;
#endif`,
	CUSTOM_FRAGMENT_UPDATE_METALLICROUGHNESS: `#ifdef TERRAIN
	metallicRoughness = vec2f(terrainMetallic, terrainRoughness);
#endif`,
	CUSTOM_FRAGMENT_BEFORE_LIGHTS: `#if defined(TERRAIN) && defined(TERRAIN_NORMALS)
{
	let terrainTBNUV: vec2f = select(-fragmentInputs.vMainUV1, fragmentInputs.vMainUV1, fragmentInputs.frontFacing);
	let terrainTBN: mat3x3f = terrainCotangentFrame(normalW, fragmentInputs.vPositionW, terrainTBNUV);
	let terrainPerturbed: vec3f = vec3f(terrainNormalTS.xy * uniforms.terrainInfo.z, terrainNormalTS.z);
	normalW = normalize(terrainTBN * terrainPerturbed);
}
#endif`,
	CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `#if defined(TERRAIN) && TERRAIN_DEBUG > 0
	finalColor = vec4f(mix(finalColor.rgb, terrainDebugColor, clamp(terrainDebugMask * uniforms.terrainDebug.w, 0.0, 1.0)), finalColor.a);
#endif`,
};
