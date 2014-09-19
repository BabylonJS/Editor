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

    Plugin.prototype.close = function () {
        this.core.removeEventReceiver(this);
        delete this; /// Right in JS ?
    }

    /// Statics
    Plugin.executeScript = function (path, core, callback, parameters) {

        BABYLON.Tools.LoadFile(path, function (result) {
            eval.call(window, result);

            var plugin = createPlugin(parameters);
            plugin.configure(core);
            delete createPlugin;

            if (callback)
                callback(plugin);
        });

    }

    return Plugin;
})();

BABYLON.Editor.Plugin = Plugin;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON