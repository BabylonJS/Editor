var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var PluginManager = (function () {
            function PluginManager() {
            }
            // Functions
            PluginManager.RegisterEditionTool = function (tool) {
                this.EditionToolPlugins.push(tool);
            };
            PluginManager.RegisterMainToolbarPlugin = function (plugin) {
                this.MainToolbarPlugins.push(plugin);
            };
            PluginManager.RegisterCustomUpdatePlugin = function (plugin) {
                this.CustomUpdatePlugins.push(plugin);
            };
            return PluginManager;
        }());
        // Plugins
        PluginManager.EditionToolPlugins = [];
        PluginManager.MainToolbarPlugins = [];
        PluginManager.CustomUpdatePlugins = [];
        EDITOR.PluginManager = PluginManager;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.pluginManager.js.map
