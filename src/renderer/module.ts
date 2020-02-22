/**
 * README first.
 *
 * this module is used to trick the node.js require function.
 * The problem:
 * 		require will load js files that are relative to the script being loaded. For example, babylonjs/earcut will be required in
 * 		babylonjs modules folder and not in the babylonjs-editor modules folder. That means babylonjs and babylonjs-editor will not share
 * 		the same i18next instance (not the same loaded module).
 * The solution:
 * 		We need to hack the module "module" to return the right paths of the needed modules in order to take from cache.
 * 		For example, i18next will not be taken from [...]/babylonjs/node_modules/i18next/index.js but from [...]/babylonjs-editor/node_modules/i18next/index.js
 */

import { join, dirname } from "path";

const Module = require("module");
const cacheMap = {
	"babylonjs": join(dirname(Module._resolveFilename("babylonjs", module, false)), "babylon.max.js"),
	"babylonjs-materials": join(dirname(Module._resolveFilename("babylonjs-materials", module, false)), "babylonjs.materials.js"),
	"babylonjs-loaders": join(dirname(Module._resolveFilename("babylonjs-loaders", module, false)), "babylonjs.loaders.js"),
	"babylonjs-node-editor": join(dirname(Module._resolveFilename("babylonjs", module, false)), "..", "babylonjs-node-editor", "babylon.nodeEditor.max.js"),
	"react": Module._resolveFilename("react", module, false),
	"react-dom": Module._resolveFilename("react-dom", module, false),

	// Redirect @babylonjs/*
	"@babylonjs/core": join(dirname(Module._resolveFilename("babylonjs", module, false)), "babylon.max.js"),
}

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (filename: string, parent: any, isMain: boolean) {
	if (cacheMap[filename])
		return cacheMap[filename];

	return originalResolveFilename(filename, parent, isMain);
}

global["React"] = require("react");
global["ReactDOM"] = require("react-dom");
