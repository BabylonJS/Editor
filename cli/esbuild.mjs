import esbuild from "esbuild";

import { argv, exit } from "node:process";
import { readFile } from "node:fs/promises";

const args = argv.slice(2);
const isWatch = args.includes("--watch");

const replaceImportMetaDirname = {
	name: "replaceImportMetaDirname",
	setup(build) {
		build.onLoad({ filter: /.*/ }, async (args) => {
			const source = await readFile(args.path, "utf8");

			const transformedSource = source.replace(/import.meta.dirname/g, '"__dirname"');

			return {
				loader: "default",
				contents: transformedSource,
			};
		});
	},
};

const mainBuildOptions = {
	entryPoints: ["./src/export.mts"],
	bundle: true,
	platform: "node",
	target: "node20", // target version of Node.js
	format: "cjs", // output format as CommonJS
	outfile: "./build/index.node.js",
	treeShaking: false,
	loader: {
		".mts": "ts",
	},
	keepNames: true,
	minify: !isWatch,
	plugins: [replaceImportMetaDirname],
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
