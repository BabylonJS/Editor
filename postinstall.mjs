import { join } from "node:path";
import { execSync } from "node:child_process";
import { access, rename, rm, mkdir, copyFile } from "node:fs/promises";

import templatePackageJson from "./template/package.json" with { type: "json" };

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

async function packTemplate() {
    const tgzName = `${templatePackageJson.name}-v${templatePackageJson.version}.tgz`;

    execSync("yarn pack", {
        cwd: join(import.meta.dirname, "template"),
    });

    try {
        await access(join(import.meta.dirname, "editor/templates"));
    } catch (e) {
        await mkdir(join(import.meta.dirname, "editor/templates"));
    }

    await copyFile(
        join(import.meta.dirname, "template", tgzName),
        join(import.meta.dirname, "editor/templates/template.tgz"),
    );

    await rm(join(import.meta.dirname, "template", tgzName));

    console.log("Packed template: ", tgzName);
}

await packTemplate();
