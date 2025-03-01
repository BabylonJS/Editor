import { Engine } from "@babylonjs/core/Engines/engine";

/**
 * Set the compressed texture format to use, based on the formats you have, and the formats
 * supported by the hardware / browser.
 * @param engine defines the reference to the engine to configure the texture format to use.
 * @see `@babylonjs/core/Engines/Extensions/engine.textureSelector.d.ts` for more information.
 */
export function configureEngineToUseCompressedTextures(engine: Engine) {
    engine.setTextureFormatToUse([
        "-dxt.ktx",
        "-astc.ktx",
        "-pvrtc.ktx",
        "-etc1.ktx",
        "-etc2.ktx",
    ]);
}
