import { Material } from "babylonjs";

import { isPBRMaterial } from "../guards/material";

/**
 * The uv set a baked lightmap is unwrapped into. The first set belongs to the tiling surface textures, which
 * overlap and repeat and so cannot hold lighting that is unique to every texel.
 */
export const LIGHTMAP_COORDINATES_INDEX = 1;

/**
 * Moves a baked lightmap out of the emissive slot glTF made it travel in, and into the lightmap slot.
 *
 * glTF has no lightmap. Of the slots it does have, emissive is the only one that is full RGB, sRGB-encoded and free
 * to use a second uv set, so that is where Blender and other bakers put it. Loaded as-is the lighting is ADDED to the
 * surface, where a lightmap MULTIPLIES it, and the scene comes out washed out.
 *
 * An emissive texture on the second uv set is what marks a lightmap. A genuinely emissive material - a screen, a
 * painted backdrop - samples its texture on the first set, so it is left alone.
 *
 * The brightness is carried over exactly: glTF defines emission as `texture * emissiveFactor * emissiveStrength`,
 * the loader maps those to `emissiveTexture`, `emissiveColor` and `emissiveIntensity`, and that product becomes the
 * lightmap's level. An 8-bit atlas cannot hold lighting brighter than 1, so bakers divide it down and rely on
 * `KHR_materials_emissive_strength` to scale it back; this keeps that scale instead of clipping the bright end.
 *
 * The material becomes unlit. With `useLightmapAsShadowmap` Babylon computes `lighting * lightmap`, and for an unlit
 * material the lighting term is plain albedo - which gives `albedo * lightmap`, the definition of a lightmap. Leaving
 * it lit would shade the surface a second time on top of the bake, and would need a white fill light just to cancel
 * that out. Real-time lights and the environment no longer reach it: the bake already holds that light.
 *
 * @param material defines the reference to the material to convert.
 * @returns true if the material carried a lightmap and was converted.
 */
export function convertEmissiveLightmap(material: Material): boolean {
	if (!isPBRMaterial(material)) {
		return false;
	}

	const texture = material.emissiveTexture;
	if (!texture || texture.coordinatesIndex !== LIGHTMAP_COORDINATES_INDEX) {
		return false;
	}

	const color = material.emissiveColor;
	texture.level *= material.emissiveIntensity * Math.max(color.r, color.g, color.b);

	material.lightmapTexture = texture;
	material.useLightmapAsShadowmap = true;
	material.unlit = true;

	material.emissiveTexture = null;
	material.emissiveColor.set(0, 0, 0);
	material.emissiveIntensity = 1;

	return true;
}
