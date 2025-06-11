import esbuild from "esbuild";

import { argv, exit } from "node:process";

const args = argv.slice(2);
const isWatch = args.includes("--watch");

const mainBuildOptions = {
    entryPoints: [
        "./src/index.ts",
    ],
    bundle: true,
    platform: "node",
    target: "node20", // target version of Node.js
    format: "cjs", // output format as CommonJS
    outfile: "./build/index.node.js",
    treeShaking: false,
    loader: {
        ".ts": "ts",
    },
    external: [
        "sharp",
        "electron",
        "babylonjs",
        "babylonjs-editor",
    ],
    keepNames: true,
    minify: !isWatch,
};

if (args.includes("--watch")) {
    esbuild
        .context(mainBuildOptions)
        .then(async (buildcontext) => {
            await buildcontext.watch();
            console.log("Watching...");
        })
        .catch((error) => {
            console.error(error);
            exit(1);
        });
} else {
    esbuild.build(mainBuildOptions).catch((error) => {
        console.error(error);
        exit(1);
    });
}
