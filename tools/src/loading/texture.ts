import { Scene } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { SerializationHelper } from "@babylonjs/core/Misc/decorators.serialization";

import { _getKtx2TextureName, getTextureUrl, isUsingKtx2CompressedTextures } from "../tools/texture";

let registered = false;

export function registerTextureParser() {
	if (registered) {
		return;
	}

	registered = true;

	const textureParser = SerializationHelper._TextureParser;

	SerializationHelper._TextureParser = (sourceProperty: any, scene: Scene, rootUrl: string): Nullable<BaseTexture> => {
		if (isUsingKtx2CompressedTextures()) {
			if (sourceProperty.name) {
				sourceProperty.name = _getKtx2TextureName(sourceProperty.name);
			}

			if (sourceProperty.url) {
				sourceProperty.url = _getKtx2TextureName(sourceProperty.url);
			}
		}

		const suffix = getTextureUrl(sourceProperty, scene);
		if (!suffix) {
			return textureParser(sourceProperty, scene, rootUrl);
		}

		const originalName = sourceProperty.name;
		sourceProperty.name = suffix;

		const texture = textureParser(sourceProperty, scene, rootUrl);
		if (texture) {
			texture.name = originalName;
		}

		return texture;
	};
}
