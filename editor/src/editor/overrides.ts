import { Module } from "module";
import { join } from "path/posix";
import childProcess from "child_process";

const originalLoad = Module["_load"];
const resolveFilename = Module["_resolveFilename"];

const originalSpawn = childProcess.spawn;

Module["_load"] = function (request: string, parent: typeof Module, isMain: boolean) {
	if (request.startsWith("babylonjs-editor-tools")) {
		return originalLoad(resolveFilename("babylonjs-editor-tools", module, false), parent, isMain);
	}

	if (request.startsWith("babylonjs-editor")) {
		return originalLoad(join(__dirname.replace(/\\/g, "/"), "../export.js"), parent, isMain);
	}

	if (request.startsWith("babylonjs-gui")) {
		return originalLoad(resolveFilename("babylonjs-gui", module, false), parent, isMain);
	}

	if (request.startsWith("babylonjs-loaders")) {
		return originalLoad(resolveFilename("babylonjs-loaders", module, false), parent, isMain);
	}

	if (request.startsWith("babylonjs-materials")) {
		return originalLoad(resolveFilename("babylonjs-materials", module, false), parent, isMain);
	}

	if (request.startsWith("babylonjs-post-process")) {
		return originalLoad(resolveFilename("babylonjs-post-process", module, false), parent, isMain);
	}

	if (request.startsWith("babylonjs-procedural-textures")) {
		return originalLoad(resolveFilename("babylonjs-procedural-textures", module, false), parent, isMain);
	}

	if (request.startsWith("babylonjs")) {
		return originalLoad(resolveFilename("babylonjs", module, false), parent, isMain);
	}

	return originalLoad(request, parent, isMain);
};

// This method is overriden to ensure that internal packages like "esbuild" that are unpacked from the
// asar archive are properly loaded when running the editor in production mode.
childProcess.spawn = function (path: string, ...args: any[]) {
	if (path?.includes("app.asar")) {
		path = path.replace("app.asar", "app.asar.unpacked");
	}

	return originalSpawn.call(this, path, ...args);
};
