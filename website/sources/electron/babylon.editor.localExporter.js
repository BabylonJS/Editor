var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ElectronLocalExporter = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function ElectronLocalExporter(core) {
                var _this = this;
                // Initialize
                this._core = core;
                // Save...
                var filename = EDITOR.ElectronHelper.SceneFilename === "" ? "scene" : EDITOR.Tools.GetFilenameWithoutExtension(EDITOR.ElectronHelper.SceneFilename, true) + ".editorproject";
                if (ElectronLocalExporter._LocalFilename === "") {
                    EDITOR.ElectronHelper.CreateSaveDialog("Save Project", filename, ".editorproject", function (filename) {
                        if (filename === undefined)
                            return;
                        ElectronLocalExporter._LocalFilename = filename;
                        _this.writeProject(filename);
                    });
                }
                else
                    this.writeProject(filename);
            }
            ElectronLocalExporter.prototype.writeProject = function (filename) {
                var _this = this;
                this._core.editor.layouts.lockPanel("bottom", "Saving...", true);
                var fs = require('fs');
                var project = EDITOR.ProjectExporter.ExportProject(this._core, true);
                fs.writeFile(filename, project, function (error) {
                    console.log(error);
                    _this._core.editor.layouts.unlockPanel("bottom");
                });
            };
            // Static members
            ElectronLocalExporter._LocalFilename = "";
            return ElectronLocalExporter;
        }());
        EDITOR.ElectronLocalExporter = ElectronLocalExporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
