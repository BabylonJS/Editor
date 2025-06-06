import { Module } from "module";
import { join } from "path/posix";

const originalLoad = Module["_load"];

Module["_load"] = function (request: string, parent: typeof Module, isMain: boolean) {
    if (request.startsWith("babylonjs-editor")) {
        return originalLoad(join(__dirname.replace(/\\/g, "/"), "../export.js"), parent, isMain);
    }

    return originalLoad(request, parent, isMain);
};
