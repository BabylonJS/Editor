var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var FilesInput = (function (_super) {
            __extends(FilesInput, _super);
            function FilesInput(core, sceneLoadedCallback, progressCallback, additionnalRenderLoopLogicCallback, textureLoadingCallback, startingProcessingFilesCallback) {
                _super.call(this, core.engine, core.currentScene, core.canvas, null, progressCallback, additionnalRenderLoopLogicCallback, textureLoadingCallback, FilesInput._callbackStart(core));
                this._sceneLoadedCallback = FilesInput._callback(sceneLoadedCallback, core, this);
            }
            FilesInput._callbackStart = function (core) {
                return function () {
                    core.editor.layouts.lockPanel("main", "Loading...", true);
                };
            };
            FilesInput._callback = function (callback, core, filesInput) {
                var readFileCallback = function (scene, jsFile) {
                    return function (result) {
                        EDITOR.ProjectImporter.ImportProject(core, result);
                        core.editor.sceneGraphTool.createUI();
                        core.editor.sceneGraphTool.fillGraph();
                        core.editor.timeline.reset();
                        if (jsFile.msClose)
                            jsFile.msClose();
                    };
                };
                return function (file, scene) {
                    var files = filesInput._filesToLoad;
                    var calledCallback = false;
                    for (var i = 0; i < files.length; i++) {
                        if (files[i].name.indexOf(".editorproject") === -1)
                            continue;
                        BABYLON.Tools.ReadFile(files[i], readFileCallback(scene, files[i]), null);
                    }
                    scene.getEngine().hideLoadingUI();
                    if (callback)
                        callback(file, scene);
                    core.editor.layouts.unlockPanel("main");
                };
            };
            return FilesInput;
        }(BABYLON.FilesInput));
        EDITOR.FilesInput = FilesInput;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
