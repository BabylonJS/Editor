const fs = require("fs");
const os = require("os");
const path = require("path");
const Builder = require("electron-builder");
const child_process = require("child_process");

const yargs = require("yargs");
const args = yargs.argv;

const build = ({ x64, arm64 } = options) => {
    return Builder.build({
        x64,
        arm64,
        projectDir: "./editor",
        config: {
            mac: {
                identity: null,
            },
            fileAssociations: [{
                ext: "bjseditor",
                name: "Babylon.js Editor Project"
            }],
            appId: "editor.babylonjs.com",
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