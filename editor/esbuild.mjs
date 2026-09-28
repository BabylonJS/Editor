import esbuild from "esbuild";

import { argv, exit } from "node:process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

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
	// The MCP server the AI assistant starts to drive the editor, self-contained so it runs with the executable of the
	// editor (see "ELECTRON_RUN_AS_NODE") without any node_modules. It must stay unpacked from the asar archive.
	{
		bundle: true,
		platform: "node",
		target: "node20",
		format: "esm",
		minify: !isWatch,
		entryPoints: ["../mcp/src/index.mts"],
		outfile: "./build/mcp/index.mjs",
		banner: {
			js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);",
		},
	},
];

// The skills of the website, bundled as a plugin the AI assistant gives to the agents it runs (Claude Code loads it
// with "--plugin-dir", Codex gets its skills copied in the project, Antigravity CLI in the plugin the assistant gives it). It must stay unpacked from the asar archive.
function buildAssistantPlugin() {
	const pluginDirectory = "./build/assistant/plugin";
	const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));

	rmSync(pluginDirectory, {
		recursive: true,
		force: true,
	});

	mkdirSync(`${pluginDirectory}/.claude-plugin`, {
		recursive: true,
	});

	writeFileSync(
		`${pluginDirectory}/.claude-plugin/plugin.json`,
		JSON.stringify(
			{
				name: "babylonjs-editor",
				version: packageJson.version,
				description: "Skills to write the scripts of the projects made using the Babylon.js Editor.",
				author: { name: "Babylon.js Editor" },
				homepage: "https://editor.babylonjs.com",
			},
			null,
			"\t"
		)
	);

	cpSync("../website/public/skills/babylonjs-editor-tools", `${pluginDirectory}/skills/babylonjs-editor-tools`, {
		recursive: true,
	});
}

buildAssistantPlugin();

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
