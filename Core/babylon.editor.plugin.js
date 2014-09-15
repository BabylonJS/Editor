/// <reference path="../index.html" />

var BABYLON;
(function (BABYLON) { /// namespace BAYBLON
var Editor;
(function (Editor) { /// namespace Editor

var Plugin = (function () {

    function Plugin() {
        this.core = null;
        this.engine = null;
    };

    Plugin.prototype.configure = function (core) {
        this.core = core;
        this.engine = core.engine;
    }

    /// Statics
    Plugin.executeScript = function (path, core) {

        BABYLON.Tools.LoadFile(path, function (result) {
            eval.call(window, result);

            var plugin = createPlugin();
            plugin.configure(core);
            delete createPlugin;
        });

    }

    return Plugin;
})();

BABYLON.Editor.Plugin = Plugin;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON