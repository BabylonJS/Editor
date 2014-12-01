/// <reference path="../index.html" />

/// Extends (already exists)
var __extends = this.__extends;

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
        this.core.removeCustomUpdate(this);
        delete this; /// Right in JS ?
    }

    /// Statics
    Plugin.executeScript = function (path, core, callback, parameters) {

        BABYLON.Tools.LoadFile(path, function (result) {
            eval.call(window, result);

            var plugin = createPlugin(parameters == null ? {} : parameters);
            plugin.configure(core);
            delete createPlugin;

            if (callback)
                callback(plugin);
        });

    }

    return Plugin;
})();

var EditionToolPlugin = (function (_super) {
    __extends(EditionToolPlugin, _super);

    function EditionToolPlugin() {
        _super.call(this);
    }

    /// Apply changes to the object
    EditionToolPlugin.prototype.applyChanges = null;

    /// Creates the UI
    EditionToolPlugin.prototype.clearUI = null;

    /// Called if the object changed
    EditionToolPlugin.prototype.objectChanged = null;

    /// Clears the UI
    EditionToolPlugin.prototype.clearUI = null;

    return EditionToolPlugin;
})(Plugin);

BABYLON.Editor.Plugin = Plugin;
BABYLON.Editor.EditionToolPlugin = EditionToolPlugin;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON