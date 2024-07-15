import { Scene } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { SerializationHelper } from "@babylonjs/core/Misc/decorators.serialization";

import { getPowerOfTwoUntil } from "./tools/scalar";

/**
 * Defines the reference to the original texture parser function.
 */
const textureParser = SerializationHelper._TextureParser;

SerializationHelper._TextureParser = (sourceProperty: any, scene: Scene, rootUrl: string): Nullable<BaseTexture> => {
    if (scene.loadingQuality === "high" || !sourceProperty.metadata?.baseSize) {
        return textureParser(sourceProperty, scene, rootUrl);
    }

    const width = sourceProperty.metadata.baseSize.width;
    const height = sourceProperty.metadata.baseSize.height;

    let suffix = "";

    switch (scene.loadingQuality) {
        case "medium":
            const midWidth = getPowerOfTwoUntil(width * 0.66);
            const midHeight = getPowerOfTwoUntil(height * 0.66);

            suffix = `_${midWidth}_${midHeight}`;
            break;

        case "low":
            const lowWidth = getPowerOfTwoUntil(width * 0.33);
            const lowHeight = getPowerOfTwoUntil(height * 0.33);

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
