import { execNodePty } from "../../tools/node-pty";

import { EditorProjectPackageManager } from "../typings";

/**
 * Install the dependencies of the project located at the given working directory.
 * @param packageManager defines the package manager to use for installation.
 * @param cwd defines absolute path to the working directory where to install the dependencies.
 */
export async function installDependencies(packageManager: EditorProjectPackageManager, cwd: string) {
	let command = "";
	switch (packageManager) {
		case "npm":
			command = "npm i";
			break;
		case "pnpm":
			command = "pnpm i";
			break;
		case "bun":
			command = "bun i";
			break;
		default:
			command = "yarn";
			break;
	}

	const p = await execNodePty(command, { cwd });
	return p.wait();
}

/**
 * Installs the babylonjs-editor-tools package that matches the given version.
 * The given version is mostly the current version of the editor.
 * @param packageManager defines the package manager to use for installation.
 * @param cwd defines absolute path to the working directory where to install the dependencies.
 * @param version defines the version of babylonjs-editor-tools to install.
 */
export async function installBabylonJSEditorTools(packageManager: EditorProjectPackageManager, cwd: string, version: string) {
	let command = "";
	switch (packageManager) {
		case "npm":
			command = `npm install --save babylonjs-editor-tools@${version}`;
			break;
		case "pnpm":
			command = `pnpm add babylonjs-editor-tools@${version}`;
			break;
		case "bun":
			command = `bun add babylonjs-editor-tools@${version}`;
			break;
		default:
			command = `yarn add babylonjs-editor-tools@${version}`;
			break;
	}

	const p = await execNodePty(command, { cwd });
	return p.wait();
}
