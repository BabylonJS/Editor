const os = require("os");
const Builder = require("electron-builder");

const yargs = require("yargs");
const args = yargs.argv;

console.log("-------------------------------------------------------------");
console.log("ELECTRON BUILD");
console.log("-------------------------------------------------------------");
console.log("\nBuilding Electron...");

const build = ({ x64, arm64 } = options) => {
    return Builder.build({
        x64,
        arm64,
        config: {
            mac: {
                identity: null,
            },
            fileAssociations: [{
                ext: "editorproject",
                name: "Babylon.js Editor Project"
            }, {
                ext: "editorworkspace",
                name: "Babylon.js Editor Workspace"
            }],
            appId: "editor.babylonjs.com",
            productName: "BabylonJS Editor",
            icon: "./css/icons/babylonjs_icon",
            directories: {
                output: "./electron-packages/"
            },
            nsis: {
                oneClick: false
            },
            linux: {
                target: "AppImage"
            },
            asar: true,
            compression: "store",
            extraFiles: [
                "assets/wizard/**",
                "assets/project/**",
                "assets/scripts/**",
                "assets/graphs/**",
                "assets/extras/**",

                "module/index.d.ts",
                "module/package.json",
            ],
            files: [
                "src/**",

                "build/**",
                "declaration/**",

                "assets/**",
                "css/**",
                "html/**",

                "photoshop-extension/**"
            ]
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
            console.log("   -------------------------------------------------------------");
            console.log(`   ${a.type}`);
            console.log("   -------------------------------------------------------------");
            await build({ [a.type]: true });
        }
    } else {
        const arch = os.arch();
        const x64 = arch === "x64";
        const arm64 = arch === "arm64";

        await build({ x64, arm64 });
    }
})();
