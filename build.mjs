import { join } from "node:path";
import { rm } from "node:fs/promises";
import { platform, arch } from "node:os";

import dotEnv from "dotenv";
import yargs from "minimist";
import Builder from "electron-builder";

dotEnv.config();
const args = yargs(process.argv.slice(2));

const architecture = arch();

function build({ x64, arm64 } = options) {
	return Builder.build({
		x64,
		arm64,
		projectDir: "./editor",
		config: {
			publish: {
				provider: "generic",
				url: `https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/updates/${platform() === "darwin" && architecture === "x64" ? "x64/" : ""}`,
			},
			mac:
				platform() !== "darwin"
					? null
					: {
							hardenedRuntime: true,
							appId: "com.babylonjs.editor",
							notarize: args.noSign ? false : true,
							identity: args.noSign ? null : undefined,
						},
			fileAssociations: [
				{
					ext: "bjseditor",
					name: "Babylon.js Editor Project",
				},
			],
			appId: "com.babylonjs.editor",
			productName: "BabylonJS Editor",
			icon: "./icons/babylonjs_icon",
			directories: {
				output: "./electron-packages/",
			},
			nsis: {
				oneClick: false,
			},
			linux: {
				category: "Development",
				target: ["AppImage", "flatpak", "snap"],
			},
			flatpak: {
				baseVersion: "22.08",
				runtimeVersion: "22.08",
				category: "Development",

				finishArgs: ["--share=network", "--socket=x11", "--socket=wayland"],
			},
			snap: {
				base: "core22",
				confinement: "classic",
				grade: args.noSign ? "devel" : "stable",
				environment: {
					PATH: "$SNAP/bin:$SNAP/usr/bin:/usr/local/bin:$PATH",
				},
				plugs: ["home", "network", "opengl", "x11", "wayland", "browser-support", "process-control"],
			},
			asar: true,
			asarUnpack: ["**/node_modules/sharp/**/*", "**/node_modules/@img/**/*", "**/node_modules/node-pty/**/*"],
			compression: "normal",
			extraFiles: ["bin/**", "templates/**"],
			files: ["./build/**", "./fonts/**", "./assets/**", "./index.html"],
		},
	});
}

// Remove old build
await rm(join(import.meta.dirname, "editor/electron-packages"), {
	force: true,
	recursive: true,
});

// Create build(s)
if (args.x64 || args.arm64) {
	await build({
		x64: args.x64,
		arm64: args.arm64,
	});
} else {
	const x64 = architecture === "x64";
	const arm64 = architecture === "arm64";

	await build({ x64, arm64 });
}
