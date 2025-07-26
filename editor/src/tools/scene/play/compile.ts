import { readFile } from "fs-extra";
import { dirname, join } from "path/posix";

import { build, BuildOptions, Plugin } from "esbuild";

import { projectConfiguration } from "../../../project/configuration";

export interface ICompilePlayScriptOptions {
	onTransformSource?: (path: string) => void;
}

export async function compilePlayScript(temporaryDirectory: string, options?: ICompilePlayScriptOptions) {
	if (!projectConfiguration.path) {
		return;
	}

	const projectDir = dirname(projectConfiguration.path);

	const replaceImports = {
		name: "replaceImports",
		setup: (build) => {
			build.onLoad({ filter: /.*/ }, async (args) => {
				const source = await readFile(args.path, "utf8");

				const transformedSource = source
					.replace(/"@babylonjs\/core\/?.*"/g, "\"babylonjs\"")
					.replace(/"@babylonjs\/gui\/?.*"/g, "\"babylonjs-gui\"")
					.replace(/"@babylonjs\/loaders\/?.*"/g, "\"babylonjs-loaders\"")
					.replace(/"@babylonjs\/materials\/?.*"/g, "\"babylonjs-materials\"")
					.replace(/"@babylonjs\/post-processes\/?.*"/g, "\"babylonjs-post-process\"")
					.replace(/"@babylonjs\/procedural-textures\/?.*"/g, "\"babylonjs-procedural-textures\"")
					.replace(/import\.meta\.dirname/g, "__dirname");

				options?.onTransformSource?.(args.path);

				return {
					loader: "default",
					contents: transformedSource,
				};
			});
		},
	} as Plugin;

	// This is a typical configuration for esbuild to bundle the scripts of the current project.
	// All scripts are referenced in the "src/scripts.ts" file.
	// We enable sourcemaps to help debugging the code directly in vscode or other editors.
	// Some libraries are set external:
	// - sharp: in case it is used in the project, sharp must always be external as it requries native bindings.
	// - electron: this is the Electron library, it is never required the scripts, electron injects it at runtime.
	// - babylonjs-*: it is **IMPORTANT HERE** that all the babylonjs dependencies are set external. The editor overrides module loading in order to always return the editor's version of the library.

	const buildOptions = {
		entryPoints: [
			join(projectDir, "src/scripts.ts"),
		],
		bundle: true,
		platform: "node",
		target: "node20",
		format: "cjs",

		// IMPORTANT: force .cjs extension as the editor will use "require".
		// When type is set to "module" in package.json, the output will be esm.
		// Let "require" create a wrapper by naming the file extension ".cjs".
		outfile: join(temporaryDirectory, "play/script.cjs"),

		treeShaking: true,
		sourcemap: true,
		loader: {
			".ts": "ts",
			".tsx": "tsx",
			".node": "file",
		},
		external: [
			"sharp",
			"electron",

			"babylonjs",
			"babylonjs-gui",
			"babylonjs-loaders",
			"babylonjs-materials",
			"babylonjs-post-process",
			"babylonjs-procedural-textures",

			// IMPORTANT: Don't make babylonjs-editor-tools external. It has to be bundled
			// so that one loaded in the editor is not altered by the one used by the play script.
			// "babylonjs-editor-tools",
		],
		keepNames: true,
		plugins: [
			replaceImports,
		],
		supported: {
			decorators: true,
		},
		tsconfig: join(projectDir, "tsconfig.json"),
	} as BuildOptions;

	await build(buildOptions);
}
