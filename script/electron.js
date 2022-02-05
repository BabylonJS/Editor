const os = require("os");
const Builder = require("electron-builder");

const yargs = require("yargs");
const args = yargs.argv;

console.log(`
-------------------------------------------------------------
ELECTRON BUILD
-------------------------------------------------------------
`);
console.log("\nBuilding Electron...");

// Arch
const arch = os.arch();
const x64 = arch === "x64";
const arm64 = arch === "arm64";

// Build
Builder.build({
    x64,
    arm64,
    config: {
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
        asar: true,
        compression: "store",
        extraFiles: [
            "assets/wizard/**",
            "assets/project/**",
            "assets/scripts/**",
            "assets/graphs/**",
            "assets/extras/**",
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
