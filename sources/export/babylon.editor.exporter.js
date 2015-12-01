var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Exporter = (function () {
            // private members
            /**
            * Constructor
            */
            function Exporter(core) {
                // Initialize
                this.core = core;
            }
            Exporter.prototype.exportScene = function () {
                //var scene = SceneSerializer.Serialize(this.core.currentScene);
                //var string = JSON.stringify(scene);
                var window = new EDITOR.GUI.GUIWindow("WindowExport", this.core, "Export Project", "");
                window.buttons = ["Export", "Cancel"];
                window.buildElement(null);
            };
            return Exporter;
        })();
        EDITOR.Exporter = Exporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.exporter.js.map