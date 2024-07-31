const fs = require("fs");
const os = require("os");
const path = require("path");
const Builder = require("electron-builder");
const child_process = require("child_process");

require('dotenv').config();

const yargs = require("yargs");
const args = yargs.argv;

const build = ({ x64, arm64 } = options) => {
    return Builder.build({
        x64,
        arm64,
        projectDir: "./editor",
        config: {
            mac: os.platform() === "win32" ? null : {
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
    fs.rmSync(path.join(__dirname, "editor/electron-packages"), {
        force: true,
        recursive: true,
    });

    // Pack template
    const templatePackageJson = require(path.join(__dirname, "template/package.json"));
    const tgzName = `${templatePackageJson.name}-v${templatePackageJson.version}.tgz`;

    child_process.execSync("yarn pack", {
        cwd: path.join(__dirname, "template"),
    });

    if (!fs.existsSync(path.join(__dirname, "editor/templates"))) {
        fs.mkdirSync(path.join(__dirname, "editor/templates"));
    }

    fs.copyFileSync(
        path.join(__dirname, "template", tgzName),
        path.join(__dirname, "editor/templates/template.tgz"),
    );

    fs.rmSync(path.join(__dirname, "template", tgzName));

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
        const arch = os.arch();
        const x64 = arch === "x64";
        const arm64 = arch === "arm64";

        await build({ x64, arm64 });
    }
})();
