import { Scene } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { SerializationHelper } from "@babylonjs/core/Misc/decorators.serialization";

import { getPowerOfTwoUntil } from "../tools/scalar";

/**
 * Defines the reference to the original texture parser function.
 */
const textureParser = SerializationHelper._TextureParser;

SerializationHelper._TextureParser = (sourceProperty: any, scene: Scene, rootUrl: string): Nullable<BaseTexture> => {
	if (scene.loadingTexturesQuality === "high" || !sourceProperty.metadata?.baseSize) {
		return textureParser(sourceProperty, scene, rootUrl);
	}

	const width = sourceProperty.metadata.baseSize.width;
	const height = sourceProperty.metadata.baseSize.height;

	const isPowerOfTwo = width === getPowerOfTwoUntil(width) || height === getPowerOfTwoUntil(height);

	let suffix = "";

	switch (scene.loadingTexturesQuality) {
		case "medium":
			let midWidth = (width * 0.66) >> 0;
			let midHeight = (height * 0.66) >> 0;

			if (isPowerOfTwo) {
				midWidth = getPowerOfTwoUntil(midWidth);
				midHeight = getPowerOfTwoUntil(midHeight);
			}

			suffix = `_${midWidth}_${midHeight}`;
			break;

		case "low":
		case "very-low":
			let lowWidth = (width * 0.33) >> 0;
			let lowHeight = (height * 0.33) >> 0;

			if (isPowerOfTwo) {
				lowWidth = getPowerOfTwoUntil(lowWidth);
				lowHeight = getPowerOfTwoUntil(lowHeight);
			}

			suffix = `_${lowWidth}_${lowHeight}`;
			break;
	}

	const name = sourceProperty.name as string;

	if (!name || !suffix) {
		return textureParser(sourceProperty, scene, rootUrl);
	}

	const finalUrl = name.split("/");

	const filename = finalUrl.pop();
	if (!filename) {
		return textureParser(sourceProperty, scene, rootUrl);
	}

	const extension = filename.split(".").pop();
	const baseFilename = filename.replace(`.${extension}`, "");

	const newFilename = `${baseFilename}${suffix}.${extension}`;

	finalUrl.push(newFilename);

	sourceProperty.name = finalUrl.join("/");

	return textureParser(sourceProperty, scene, rootUrl);
};
