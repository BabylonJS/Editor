export const cliPack = `
# Will compress all textures if enabled in the project settings
babylonjs-editor-cli pack
`;

export const enableKtx2 = `
import { loadScene, setUseKtx2CompressedTextures } from "babylonjs-editor-tools";

// some code

/**
 * Enable KTX2 support so your game / application will load on KTX2 compressed textures.
 * It is important to call this function before loading the scene.
 * Otherwise only original textures files will be loaded (.png, .jpg, etc.).
 */
setUseKtx2CompressedTextures(true);

// some code

await loadScene(rootUrl, name, scene, scriptsMap, {
    quality: "high",
});
`;
