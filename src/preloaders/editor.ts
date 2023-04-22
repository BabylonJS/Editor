import { join, resolve, basename } from "path";

/**
 * When href contains editor.html, let's load the editor itself.
 */
function runEditor(): void {
    window["CANNON"] = require("cannon");

    const Editor = require('../renderer/editor/index.js');

    // Configure monaco editor embedded loader
    const amdLoader = require('../../../node_modules/monaco-editor/min/vs/loader.js');
    const amdRequire = amdLoader.require;

    function uriFromPath(_path) {
        var pathName = resolve(_path).replace(/\\/g, '/');
        if (pathName.length > 0 && pathName.charAt(0) !== '/') {
            pathName = '/' + pathName;
        }
        return encodeURI('file://' + pathName);
    }

    amdRequire.config({
        baseUrl: uriFromPath(join(__dirname, '../../../node_modules/monaco-editor/min'))
    });

    // workaround monaco-css not understanding the environment
    (window as any).module = undefined;
    amdRequire(['vs/editor/editor.main'], function () {
        (window as any).monaco = monaco;

        if (!(window as any).editor) {
            (window as any).editor = new Editor.default();
        }

        const editorExports = require('../index.js');
        editorExports.editor = (window as any).editor;
    });
}

/**
 * When href contains play.html, let's run the project in an isolated iframe.
 */
function runIsolatedPlay(): void {
    window.addEventListener("message", function (ev) {
        if (ev.data?.id !== "init") {
            return;
        }

        const play = require("../renderer/play/index.js");
        new play.default(
            ev.data.workspaceDir,
            ev.data.outputSceneDirectory,
            ev.data.projectName,
            ev.data.physicsEngine,
        );
    });
}

window.addEventListener("DOMContentLoaded", async () => {
    // Require modules hack for development mode.
    require('../renderer/module.js');

    const { Tools } = require("../renderer/editor/tools/tools");
    await Tools.Wait(100);

    const htmlFile = basename(window.location.href);

    if (htmlFile === "editor.html") {
        return runEditor();
    }

    if (htmlFile === "play.html") {
        return runIsolatedPlay();
    }
});
