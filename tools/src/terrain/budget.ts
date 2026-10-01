/**
 * Conservative fragment sampler count of Babylon's PBR shader for a set of defines (SPEC §5.2.4), excluding the terrain plugin.
 * Derived from pbrFragmentSamplersDeclaration, pbrFragmentReflectionDeclaration, lightFragmentDeclaration, pbrDirectLightingSetupFunctions,
 * imageProcessingDeclaration and oitDeclaration (Babylon.js 9.27.1). The estimate must never be lower than the real count (GPU harness G5).
 */

/** Material textures: one sampler each when their define is truthy. */
const TERRAIN_PBR_TEXTURE_DEFINES: readonly string[] = [
	"ALBEDO",
	"BASE_WEIGHT",
	"BASE_DIFFUSE_ROUGHNESS",
	"AMBIENT",
	"OPACITY",
	"EMISSIVE",
	"LIGHTMAP",
	"REFLECTIVITY",
	"MICROSURFACEMAP",
	"METALLIC_REFLECTANCE",
	"REFLECTANCE",
	"DECAL",
	"BUMP",
	"DETAIL",
];

/** Optional PBR configurations: [configuration define, texture defines counted while the configuration is on]. */
const TERRAIN_PBR_CONFIGURATION_DEFINES: readonly [string, readonly string[]][] = [
	["CLEARCOAT", ["CLEARCOAT_TEXTURE", "CLEARCOAT_TEXTURE_ROUGHNESS", "CLEARCOAT_BUMP", "CLEARCOAT_TINT_TEXTURE"]],
	["IRIDESCENCE", ["IRIDESCENCE_TEXTURE", "IRIDESCENCE_THICKNESS_TEXTURE"]],
	["SHEEN", ["SHEEN_TEXTURE", "SHEEN_TEXTURE_ROUGHNESS"]],
	["ANISOTROPIC", ["ANISOTROPIC_TEXTURE"]],
];

/** Sub-surface textures counted while SUBSURFACE is on. */
const TERRAIN_PBR_SUBSURFACE_TEXTURE_DEFINES: readonly string[] = [
	"SS_THICKNESSANDMASK_TEXTURE",
	"SS_REFRACTIONINTENSITY_TEXTURE",
	"SS_TRANSLUCENCYINTENSITY_TEXTURE",
	"SS_TRANSLUCENCYCOLOR_TEXTURE",
];

/** Per-light textures: one sampler each when "<define><lightIndex>" is truthy. */
const TERRAIN_PBR_LIGHT_TEXTURE_DEFINES: readonly string[] = ["PROJECTEDLIGHTTEXTURE", "IESLIGHTTEXTURE", "RECTAREALIGHTEMISSIONTEXTURE"];

/**
 * Conservative count of fragment samplers used by PBR for these defines (§5.2.4), excluding the terrain plugin.
 * @param defines the material defines (a PBRMaterialDefines instance or any record of define values).
 * @param maxSimultaneousLights the material's maxSimultaneousLights: LIGHT{i} defines at or beyond this index are ignored.
 */
export function estimateTerrainPbrSamplers(defines: Record<string, unknown>, maxSimultaneousLights: number): number {
	const on = (name: string): boolean => {
		return !!defines[name];
	};

	let count = 0;

	for (const name of TERRAIN_PBR_TEXTURE_DEFINES) {
		if (on(name)) {
			++count;
		}
	}

	for (const [configuration, textures] of TERRAIN_PBR_CONFIGURATION_DEFINES) {
		if (on(configuration)) {
			for (const name of textures) {
				if (on(name)) {
					++count;
				}
			}
		}
	}

	// Reflection: reflectionSampler, + irradianceSampler, + reflectionSamplerLow/High without LOD-based micro surface.
	if (on("REFLECTION")) {
		++count;
		if (on("USEIRRADIANCEMAP")) {
			++count;
		}
		if (!on("LODBASEDMICROSFURACE")) {
			count += 2;
		}
	}

	if (on("ENVIRONMENTBRDF")) {
		++count;
	}

	// Sub-surface: refractionSampler (+ refractionSamplerLow/High) and the sub-surface textures.
	if (on("SUBSURFACE")) {
		if (on("SS_REFRACTION")) {
			++count;
			if (!on("LODBASEDMICROSFURACE")) {
				count += 2;
			}
		}
		for (const name of TERRAIN_PBR_SUBSURFACE_TEXTURE_DEFINES) {
			if (on(name)) {
				++count;
			}
		}
	}

	if (on("IBL_CDF_FILTERING")) {
		++count;
	}

	if (on("COLORGRADING") || on("COLORGRADING3D")) {
		++count;
	}

	if (on("ORDER_INDEPENDENT_TRANSPARENCY")) {
		count += 2;
	}

	// Area lights: the two LTC lookup textures.
	if (on("AREALIGHTUSED") && on("AREALIGHTSUPPORTED")) {
		count += 2;
	}

	const lightCount = Number.isFinite(maxSimultaneousLights) ? Math.max(0, Math.floor(maxSimultaneousLights)) : 0;
	for (let i = 0; i < lightCount; ++i) {
		if (!on(`LIGHT${i}`)) {
			continue;
		}

		// shadowTexture{i} (+ depthTexture{i} for PCSS).
		if (on(`SHADOW${i}`)) {
			++count;
			if (on(`SHADOWPCSS${i}`)) {
				++count;
			}
		}

		for (const name of TERRAIN_PBR_LIGHT_TEXTURE_DEFINES) {
			if (on(`${name}${i}`)) {
				++count;
			}
		}

		// Clustered light container: lightDataTexture{i} + tileMaskTexture{i}.
		if (on(`CLUSTLIGHT${i}`)) {
			count += 2;
		}
	}

	return count;
}
