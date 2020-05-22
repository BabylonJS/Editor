const Builder = require("electron-builder");

const yargs = require("yargs");
const args = yargs.argv;

console.log(`
-------------------------------------------------------------
ELECTRON BUILD
-------------------------------------------------------------
`);
console.log("\nBuilding Electron...");

// Build
Builder.build({
    x64: true,
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
