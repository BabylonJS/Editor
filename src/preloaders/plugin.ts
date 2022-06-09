window.addEventListener("DOMContentLoaded", () => {
    // Debug?
    if (process.env.ONE_WINDOW_AT_A_TIME === "true") {
        const { remote } = require("electron");
        const windows = remote.BrowserWindow.getAllWindows();

        windows[windows.length - 1].minimize();
        windows[0].maximize();
    }

    // Require modules hack for development mode.
    require('../renderer/module.js');
    const path = require('path');

    // Configure monaco editor embedded loader
    const amdLoader = require('../../../node_modules/monaco-editor/min/vs/loader.js');
    const amdRequire = amdLoader.require;

    function uriFromPath(_path) {
        var pathName = path.resolve(_path).replace(/\\/g, '/');
        if (pathName.length > 0 && pathName.charAt(0) !== '/') {
            pathName = '/' + pathName;
        }
        return encodeURI('file://' + pathName);
    }
    amdRequire.config({
        baseUrl: uriFromPath(path.join(__dirname, '../../../node_modules/monaco-editor/min'))
    });

    // workaround monaco-css not understanding the environment
    (window as any).module = undefined;
    amdRequire(['vs/editor/editor.main'], function () {
        debugger;
        (window as any).monaco = monaco;

        const plugin = require("../renderer/windows/index.js");
        (window as any).plugin = new plugin.default();
    });
});
