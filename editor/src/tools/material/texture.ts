import { Scene } from "babylonjs";

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
