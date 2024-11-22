import { join } from "node:path";
import { platform, arch } from "node:os";
import { execSync } from "node:child_process";
import { existsSync, copyFileSync, rmSync, mkdirSync } from "node:fs";

import dotEnv from "dotenv";
import yargs from "minimist";
import Builder from "electron-builder";

import templatePackageJson from "./template/package.json" with { type: 'json' };

dotEnv.config();
const args = yargs(process.argv.slice(2));

const build = ({ x64, arm64 } = options) => {
    return Builder.build({
        x64,
        arm64,
        projectDir: "./editor",
        config: {
            mac: platform() === "win32" ? null : {
                hardenedRuntime: true,
                appId: "com.babylonjs.editor",
                notarize: {
                    teamId: process.env.APPLE_TEAM_ID,
                },
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
    rmSync(join(import.meta.dirname, "editor/electron-packages"), {
        force: true,
        recursive: true,
    });

    // Pack template
    const tgzName = `${templatePackageJson.name}-v${templatePackageJson.version}.tgz`;

    execSync("yarn pack", {
        cwd: join(import.meta.dirname, "template"),
    });

    if (!existsSync(join(import.meta.dirname, "editor/templates"))) {
        mkdirSync(join(import.meta.dirname, "editor/templates"));
    }

    copyFileSync(
        join(import.meta.dirname, "template", tgzName),
        join(import.meta.dirname, "editor/templates/template.tgz"),
    );

    rmSync(join(import.meta.dirname, "template", tgzName));

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
