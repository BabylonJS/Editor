import esbuild from "esbuild";

import { argv, exit } from "node:process";

const args = argv.slice(2);
const isWatch = args.includes("--watch");

const mainBuildOptions = {
	bundle: true,
	platform: "node",
	target: "node20",
	format: "cjs",
	treeShaking: false,
	loader: {
		".ts": "ts",
	},
	keepNames: true,
	minify: !isWatch,
};

const configurations = [
	{
		...mainBuildOptions,
		entryPoints: ["@recast-navigation/core"],
		outfile: "./build/recast-core.js",
		external: ["@recast-navigation/generators"],
	},
	{
		...mainBuildOptions,
		entryPoints: ["@recast-navigation/generators"],
		outfile: "./build/recast-generators.js",
		external: ["@recast-navigation/core"],
	},
];

configurations.forEach((configuration) => {
	if (args.includes("--watch")) {
		esbuild
			.context(configuration)
			.then(async (buildcontext) => {
				await buildcontext.watch();
				console.log("Watching...");
			})
			.catch((error) => {
				console.error(error);
				exit(1);
			});
	} else {
		esbuild.build(configuration).catch((error) => {
			console.error(error);
			exit(1);
		});
	}
});
