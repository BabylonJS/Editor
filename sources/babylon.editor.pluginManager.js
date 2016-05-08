var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var PluginManager = (function () {
            function PluginManager() {
            }
            PluginManager.RegisterEditionTool = function (tool) {
                this.EditionToolPlugins.push(tool);
            };
            PluginManager.RegisterMainToolbarPlugin = function (plugin) {
                this.MainToolbarPlugin.push(plugin);
            };
            PluginManager.EditionToolPlugins = [];
            PluginManager.MainToolbarPlugin = [];
            return PluginManager;
        }());
        EDITOR.PluginManager = PluginManager;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
