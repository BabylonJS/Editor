const os = require("os");
const Builder = require("electron-builder");

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
            compression: "maximum",
            extraFiles: [],
            files: [
                "./build/**",
                "./fonts/**",
                "./index.html",
            ],
        }
    });
};

(async () => {
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
