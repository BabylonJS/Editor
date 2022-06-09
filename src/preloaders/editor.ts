window.addEventListener("DOMContentLoaded", () => {
    // Require modules hack for development mode.
    require('../renderer/module.js');

    window["CANNON"] = require("cannon");

    const path = require('path');
    const Editor = require('../renderer/editor/index.js');

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
        (window as any).monaco = monaco;

        if (!(window as any).editor) {
            (window as any).editor = new Editor.default();
        }
    });
});