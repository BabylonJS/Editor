/**
 * GLSL chunks of the terrain material plugin (SPEC §5.3), injected by TerrainMaterialPlugin.getCustomCode("fragment").
 * The strings are template literals: no double-quoted Babylon.js core module specifier may appear in this file (tools/esbuild.mjs rewrites them greedily).
 */

/** Non-UBO GLSL declarations of the plugin uniforms (WebGL1 and macOS Chrome/Electron WebGL2, spike S2). */
export const TERRAIN_GLSL_FRAGMENT_UNIFORMS: string = `#ifdef TERRAIN
uniform vec4 terrainLayerUV[8];
uniform vec4 terrainLayerTint[8];
uniform vec4 terrainLayerPBR[8];
uniform vec4 terrainLayerHeight[8];
uniform vec4 terrainInfo;
uniform vec4 terrainDebug;
#endif`;

/** The 6 fragment injection points of the plugin (same keys as TERRAIN_WGSL_FRAGMENT). */
export const TERRAIN_GLSL_FRAGMENT: Readonly<Record<string, string>> = {
	CUSTOM_FRAGMENT_DEFINITIONS: `#ifdef TERRAIN
uniform sampler2D terrainWeights0Sampler;
#ifdef TERRAIN_WEIGHTS1
uniform sampler2D terrainWeights1Sampler;
#endif
#ifdef TERRAIN_ALBEDO
uniform highp sampler2DArray terrainAlbedoArraySampler;
#endif
#ifdef TERRAIN_NORMALS
uniform highp sampler2DArray terrainNormalArraySampler;
#endif
vec3 terrainAlbedo = vec3(1.0);
vec3 terrainNormalTS = vec3(0.0, 0.0, 1.0);
float terrainRoughness = 1.0;
float terrainMetallic = 0.0;
#if TERRAIN_DEBUG > 0
vec3 terrainDebugColor = vec3(0.0);
float terrainDebugMask = 0.0;
const vec3 terrainPalette[8] = vec3[8](vec3(0.90, 0.20, 0.20), vec3(0.20, 0.80, 0.20), vec3(0.20, 0.40, 0.95), vec3(0.95, 0.85, 0.20), vec3(0.85, 0.30, 0.85), vec3(0.20, 0.85, 0.85), vec3(0.95, 0.55, 0.15), vec3(0.60, 0.60, 0.60));
#endif
mat3 terrainCotangentFrame(vec3 normal, vec3 p, vec2 uv) {
	vec3 dp1 = dFdx(p);
	vec3 dp2 = dFdy(p);
	vec2 duv1 = dFdx(uv);
	vec2 duv2 = dFdy(uv);
	vec3 dp2perp = cross(dp2, normal);
	vec3 dp1perp = cross(normal, dp1);
	vec3 tangent = dp2perp * duv1.x + dp1perp * duv2.x;
	vec3 bitangent = dp2perp * duv1.y + dp1perp * duv2.y;
	float det = max(dot(tangent, tangent), dot(bitangent, bitangent));
	float invmax = det == 0.0 ? 0.0 : inversesqrt(det);
	return mat3(tangent * invmax, bitangent * invmax, normal);
}
#endif`,
	CUSTOM_FRAGMENT_MAIN_BEGIN: `#ifdef TERRAIN
{
	vec2 terrainUV = vMainUV1;
	vec4 terrainW0 = texture(terrainWeights0Sampler, terrainUV);
#ifdef TERRAIN_WEIGHTS1
	vec4 terrainW1 = texture(terrainWeights1Sampler, terrainUV);
#else
	vec4 terrainW1 = vec4(0.0);
#endif
	float terrainWeights[8] = float[8](terrainW0.x, terrainW0.y, terrainW0.z, terrainW0.w, terrainW1.x, terrainW1.y, terrainW1.z, terrainW1.w);
	float terrainWSum = 0.0;
	for (int i = 0; i < 8; ++i) {
		if (i >= TERRAIN_LAYERS) {
			terrainWeights[i] = 0.0;
		}
		terrainWSum += terrainWeights[i];
	}
	if (terrainWSum > 0.0001) {
		for (int i = 0; i < 8; ++i) {
			terrainWeights[i] /= terrainWSum;
		}
	} else {
		terrainWeights[0] = 1.0;
	}
	vec4 terrainLA[8];
	vec4 terrainLN[8];
	for (int i = 0; i < TERRAIN_LAYERS; ++i) {
		vec2 layerUV = terrainUV * terrainLayerUV[i].xy + terrainLayerUV[i].zw;
#ifdef TERRAIN_ALBEDO
		terrainLA[i] = texture(terrainAlbedoArraySampler, vec3(layerUV, float(i)));
#else
		terrainLA[i] = vec4(1.0, 1.0, 1.0, 0.5);
#endif
#ifdef TERRAIN_NORMALS
		terrainLN[i] = texture(terrainNormalArraySampler, vec3(layerUV, float(i)));
#else
		terrainLN[i] = vec4(0.5, 0.5, 1.0, 1.0);
#endif
	}
#ifdef TERRAIN_HEIGHTBLEND
	float terrainT[8];
	float terrainMaxT = -1.0e5;
	for (int i = 0; i < TERRAIN_LAYERS; ++i) {
		float terrainH = clamp(terrainLA[i].a * terrainLayerHeight[i].x + terrainLayerHeight[i].y, 0.0, 1.0);
		terrainT[i] = terrainWeights[i] > 0.0 ? terrainH + terrainWeights[i] : -1.0e5;
		terrainMaxT = max(terrainMaxT, terrainT[i]);
	}
	float terrainBSum = 0.0;
	for (int i = 0; i < TERRAIN_LAYERS; ++i) {
		float terrainB = terrainWeights[i] > 0.0 ? max(terrainT[i] - (terrainMaxT - terrainInfo.y), 0.0) : 0.0;
		terrainWeights[i] = terrainB;
		terrainBSum += terrainB;
	}
	terrainBSum = max(terrainBSum, 0.0001);
	for (int i = 0; i < TERRAIN_LAYERS; ++i) {
		terrainWeights[i] /= terrainBSum;
	}
#endif
	terrainAlbedo = vec3(0.0);
	vec3 terrainN = vec3(0.0);
	terrainRoughness = 0.0;
	terrainMetallic = 0.0;
	for (int i = 0; i < TERRAIN_LAYERS; ++i) {
		float w = terrainWeights[i];
		vec4 tint = terrainLayerTint[i];
		vec4 pbr = terrainLayerPBR[i];
		float ao = mix(1.0, terrainLN[i].a, pbr.z);
		terrainAlbedo += toLinearSpace(terrainLA[i].rgb) * tint.rgb * ao * w;
		vec2 nxy = terrainLN[i].rg * 2.0 - 1.0;
		float nz = sqrt(clamp(1.0 - dot(nxy, nxy), 0.0, 1.0));
		terrainN += vec3(nxy * tint.w, nz) * w;
		terrainRoughness += pbr.x * terrainLN[i].b * w;
		terrainMetallic += pbr.y * w;
	}
	float terrainNLength = length(terrainN);
	terrainNormalTS = terrainNLength > 0.00001 ? terrainN / terrainNLength : vec3(0.0, 0.0, 1.0);
#if TERRAIN_DEBUG == 1
	for (int i = 0; i < TERRAIN_LAYERS; ++i) {
		terrainDebugColor += terrainPalette[i] * terrainWeights[i];
	}
	terrainDebugMask = 1.0;
#elif TERRAIN_DEBUG == 2
	float terrainActive = 0.0;
	for (int i = 0; i < TERRAIN_LAYERS; ++i) {
		terrainActive += i == int(terrainDebug.x + 0.5) ? terrainWeights[i] : 0.0;
	}
	terrainDebugColor = mix(vec3(0.05, 0.1, 0.4), vec3(1.0), terrainActive);
	terrainDebugMask = 1.0;
#elif TERRAIN_DEBUG == 3
	float terrainContour = vPositionW.y / max(terrainDebug.y, 0.001);
	float terrainContourWidth = fwidth(terrainContour);
	float terrainContourDist = abs(fract(terrainContour - 0.5) - 0.5) / max(terrainContourWidth, 0.00001);
	terrainDebugColor = vec3(1.0, 0.85, 0.2);
	// No line where the height doesn't vary across the pixel: a plateau lying exactly on a level (a new terrain, flat at 0) would be filled.
	terrainDebugMask = terrainContourWidth * max(terrainDebug.y, 0.001) > max(0.0001, abs(vPositionW.y) * 0.000001) ? 1.0 - min(terrainContourDist, 1.0) : 0.0;
#elif TERRAIN_DEBUG == 4
	float terrainSlope = degrees(acos(clamp(normalize(vNormalW).y, -1.0, 1.0)));
	terrainDebugColor = terrainSlope < 30.0 ? vec3(0.2, 0.8, 0.3) : (terrainSlope < 45.0 ? vec3(0.95, 0.8, 0.2) : vec3(0.9, 0.25, 0.2));
	terrainDebugMask = 1.0;
#elif TERRAIN_DEBUG == 5
	vec2 terrainCells = terrainUV * terrainDebug.z;
	vec2 terrainGrid = abs(fract(terrainCells - 0.5) - 0.5) / max(fwidth(terrainCells), vec2(0.00001));
	terrainDebugColor = vec3(1.0);
	terrainDebugMask = 1.0 - min(min(terrainGrid.x, terrainGrid.y), 1.0);
#endif
}
#endif`,
	CUSTOM_FRAGMENT_UPDATE_ALBEDO: `#ifdef TERRAIN
	surfaceAlbedo *= terrainAlbedo;
#endif`,
	CUSTOM_FRAGMENT_UPDATE_METALLICROUGHNESS: `#ifdef TERRAIN
	metallicRoughness = vec2(terrainMetallic, terrainRoughness);
#endif`,
	CUSTOM_FRAGMENT_BEFORE_LIGHTS: `#if defined(TERRAIN) && defined(TERRAIN_NORMALS)
{
	vec2 terrainTBNUV = gl_FrontFacing ? vMainUV1 : -vMainUV1;
	mat3 terrainTBN = terrainCotangentFrame(normalW, vPositionW, terrainTBNUV);
	vec3 terrainPerturbed = vec3(terrainNormalTS.xy * terrainInfo.z, terrainNormalTS.z);
	normalW = normalize(terrainTBN * terrainPerturbed);
}
#endif`,
	CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `#if defined(TERRAIN) && TERRAIN_DEBUG > 0
	finalColor = vec4(mix(finalColor.rgb, terrainDebugColor, clamp(terrainDebugMask * terrainDebug.w, 0.0, 1.0)), finalColor.a);
#endif`,
};
