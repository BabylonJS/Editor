const esbuild = require("esbuild");
const { remove } = require("fs-extra");

const replaceImportMetaDirname = {
    name: "replaceImportMetaDirname",
    setup(build) {
        build.onLoad({ filter: /.*/ }, async (args) => {
            const source = await require("fs").promises.readFile(args.path, "utf8");

            const transformedSource = source.replace(/import\.meta\.dirname/g, "__dirname");

            return {
                loader: "default",
                contents: transformedSource,
            };
        });
    },
};

addEventListener("message", async (event) => {
    const buildOptions = {
        entryPoints: [
            event.data.srcAbsolutePath,
        ],
        bundle: true,
        platform: "node",
        target: "node20",
        format: "cjs",
        outfile: event.data.outputAbsolutePath,
        treeShaking: false,
        loader: {
            ".ts": "ts",
            ".node": "file",
        },
        external: [
            "electron"
        ],
        keepNames: true,
        plugins: [
            replaceImportMetaDirname,
        ],
    };

    let inspectorProperties: any = null;

    try {
        await esbuild.build(buildOptions);
        const output = require(event.data.outputAbsolutePath) as any;
        inspectorProperties = output.default?._VisibleInInspector ?? null;
    } catch (e) {
        // Catch silently.
    }

    try {
        await remove(event.data.outputAbsolutePath);
    } catch (e) {
        // Catch silently.
    }

    postMessage(inspectorProperties);
});
