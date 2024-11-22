import { join } from "node:path";
import { access, rename } from "node:fs/promises";

const rootNodeModules = join(process.cwd(), "./node_modules/@babylonjs/core");
const editorNodeModules = join(process.cwd(), "./editor/node_modules/@babylonjs/core");

async function renameAssets(path) {
    try {
        await access(path);
    } catch (e) {
        return;
    }

    const glslangJs = join(path, "assets/glslang/glslang.js");

    try {
        await access(glslangJs);
        await rename(glslangJs, glslangJs.replace("glslang.js", "glslang.cjs"));

        console.log("Renamed glslang.js to glslang.cjs");
    } catch (e) {
        // Catch silently.
    }

    const twgslJs = join(path, "assets/twgsl/twgsl.js");

    try {
        await access(twgslJs);
        await rename(twgslJs, twgslJs.replace("twgsl.js", "twgsl.cjs"));

        console.log("Renamed twgsl.js to twgsl.cjs");
    } catch (e) {
        // Catch silently.
    }
}

await renameAssets(rootNodeModules);
await renameAssets(editorNodeModules);
