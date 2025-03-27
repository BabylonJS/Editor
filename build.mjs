import { join } from "node:path";
import { rm } from "node:fs/promises";
import { platform, arch } from "node:os";

import dotEnv from "dotenv";
import yargs from "minimist";
import Builder from "electron-builder";

dotEnv.config();
const args = yargs(process.argv.slice(2));

function build({ x64, arm64 } = options) {
    return Builder.build({
        x64,
        arm64,
        projectDir: "./editor",
        config: {
            mac: platform() === "win32" ? null : {
                hardenedRuntime: true,
                appId: "com.babylonjs.editor",
                notarize: args.noSign ? false : true,
                identity: args.noSign ? null : undefined,
            },
            fileAssociations: [{
                ext: "bjseditor",
                name: "Babylon.js Editor Project"
            }],
            appId: "com.babylonjs.editor",
            productName: "BabylonJS Editor",
            icon: "./icons/babylonjs_icon",
            directories: {
                output: "./electron-packages/",
            },
            nsis: {
                oneClick: false
            },
            linux: {
                target: "AppImage"
            },
            asar: true,
            compression: "normal",
            extraFiles: [
                "bin/**",
                "templates/**",
            ],
            files: [
                "./build/**",
                "./fonts/**",
                "./assets/**",
                "./index.html",
            ],
        }
    });
};

(async () => {
    // Remove old build
    await rm(join(import.meta.dirname, "editor/electron-packages"), {
        force: true,
        recursive: true,
    });

    // Create build(s)
    const archs = [
        { type: "x64", enabled: args.x64 },
        { type: "arm64", enabled: args.arm64 },
    ];

    if (archs.find((a) => a.enabled)) {
        for (const a of archs.filter((a) => a.enabled)) {
            await build({ [a.type]: true });
        }
    } else {
        const architecture = arch();
        const x64 = architecture === "x64";
        const arm64 = architecture === "arm64";

        await build({ x64, arm64 });
    }
})();
