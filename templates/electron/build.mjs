import path from "path";
import { rm } from "node:fs/promises";

import Builder from "electron-builder";

const build = ({ x64, arm64 }) => {
	return Builder.build({
		x64,
		arm64,
		mac: ["default"],
		win: ["default"],
		config: {
			win: {
				target: "nsis",
				artifactName: "${productName}-${version}-${arch}.${ext}",
			},
			mac: {
				hardenedRuntime: true,
				appId: "com.babylonjs.editor.electron.template.app",
				notarize: false,
				identity: null,
			},
			appId: "com.babylonjs.editor.electron.template.app",
			productName: "Babylon.js Editor Electron Template",
			directories: {
				output: "./electron-packages/",
			},
			nsis: {
				oneClick: true,
				allowElevation: true,
			},
			asar: true,
			compression: "normal",
			files: ["dist/**"],
		},
	});
};

// Remove old build
await rm(path.resolve(import.meta.dirname, "./electron-packages"), {
	force: true,
	recursive: true,
});

await build({
	x64: true,
	arm64: true,
});
