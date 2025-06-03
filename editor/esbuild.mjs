import { exit } from "node:process";

import esbuild from "esbuild";

const mainBuildOptions = {
    bundle: true,
    platform: "node",
    target: "node20", // target version of Node.js
    format: "cjs", // output format as CommonJS
    treeShaking: false,
    loader: {
        ".ts": "ts",
        ".tsx": "tsx",
    },
    external: [
        "sharp",
        "electron",
    ],
    keepNames: true,
};

const dashboardBuildOptions = {
    ...mainBuildOptions,
    entryPoints: ["./src/dashboard/main.tsx"],
    outfile: "./build/dashboard.js",
};

const splashBuildOptions = {
    ...mainBuildOptions,
    entryPoints: ["./src/splash/main.tsx"],
    outfile: "./build/splash.js",
};

const editorBuildOptions = {
    ...mainBuildOptions,
    entryPoints: ["./src/editor/main.tsx"],
    outfile: "./build/editor.js",
};

await Promise.all([
    esbuild.build(dashboardBuildOptions),
    esbuild.build(splashBuildOptions),
    esbuild.build(editorBuildOptions),
]).catch((error) => {
    console.error(error);
    exit(1);
});
