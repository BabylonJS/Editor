import { Module } from "module";
import { join } from "path/posix";

const originalLoad = Module["_load"];

Module["_load"] = function (request: string, parent: typeof Module, isMain: boolean) {
	if (request.startsWith("babylonjs-editor")) {
		const editorPath = process.env.DEBUG
			? join(__dirname.replace(/\\/g, "/"), "../export.js")
			: join(__dirname.replace(/\\/g, "/"), "../../editor.js");

		return originalLoad(editorPath, parent, isMain);
	}

	return originalLoad(request, parent, isMain);
};
