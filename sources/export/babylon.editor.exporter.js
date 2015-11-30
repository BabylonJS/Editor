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
                var scene = BABYLON.SceneSerializer.Serialize(this.core.currentScene);
                var string = JSON.stringify(scene);
            };
            return Exporter;
        })();
        EDITOR.Exporter = Exporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.exporter.js.map