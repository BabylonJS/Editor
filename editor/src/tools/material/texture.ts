import { Scene, Texture } from "babylonjs";

import { isTexture } from "../guards/texture";

export function storeTexturesBaseSize(scene: Scene) {
	scene.textures.forEach((texture) => {
		if (isTexture(texture)) {
			texture.metadata ??= {};
			texture.metadata.baseSize = {
				width: texture.getBaseSize().width,
				height: texture.getBaseSize().height,
			};
		}
	});
}

/**
 * Flips a texture's image vertically and adjusts its uv transform so every surface still samples the same texel.
 *
 * Babylon applies `vScale` without a pivot - `v' = v * vScale + vOffset` - so negating the scale alone sends every
 * coordinate below zero. That only works while the texture wraps: -v then lands on 1 - v. A clamped texture instead
 * pins it to the edge row, and a baked lightmap - one atlas, clamped so islands never bleed across its border - came
 * out as one smeared strip of texels on every surface. Mirroring the offset as well keeps the coordinate inside 0..1,
 * which is right whatever the wrap mode.
 * @param texture defines the reference to the texture to flip.
 */
export function flipTextureV(texture: Texture) {
	texture._invertY = !texture._invertY;
	texture.vScale = -texture.vScale;
	texture.vOffset = 1 - texture.vOffset;
}
