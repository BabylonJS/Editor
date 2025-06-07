const child_process = require("child_process");
const spawn = child_process.spawn;

child_process.spawn = function (...args: any[]) {
    if (args[0]?.includes("app.asar")) {
        args[0] = args[0].replace("app.asar", "app.asar.unpacked");
    }

    return spawn.apply(this, args);
};

const esbuild = require("esbuild");

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

async function compile(srcAbsolutePath: string, outputAbsolutePath: string) {
    const buildOptions = {
        entryPoints: [
            srcAbsolutePath,
        ],
        bundle: true,
        platform: "node",
        target: "node20",
        format: "cjs",
        outfile: outputAbsolutePath,
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

    try {
        await esbuild.build(buildOptions);

        postMessage({
            success: true,
        });
    } catch (e) {
        postMessage({
            success: false,
            error: e.toString(),
        });
    }
}

function extract(outputAbsolutePath: string) {
    let inspectorProperties: any = null;

    try {
        const output = require(outputAbsolutePath) as any;
        inspectorProperties = output.default?._VisibleInInspector ?? null;
    } catch (e) {
        // Catch silently.
    }

    postMessage(inspectorProperties);
}

addEventListener("message", async (event) => {
    switch (event.data.action) {
        case "compile":
            await compile(event.data.srcAbsolutePath, event.data.outputAbsolutePath);
            break;

        case "extract":
            extract(event.data.outputAbsolutePath);
            break;
    }
});
