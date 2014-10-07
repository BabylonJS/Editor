/// <reference path="../index.html" />

/* 

Core Data class that handles custom datas (material shaders, etc.),
custom events management...

BabylonEditorCore is the mediator of the editor.
Then, all plugins must be able to create everything
and dialog with the editor using on the BabylonEditorCore object.
*/

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor

var MaterialCreatorManager = (function () {

    /// Material Creator Manager
    function MaterialCreatorManager(codeEditor) {
        this.scene = null;
        this.material = null;

        this._codeEditor = codeEditor;
        this._enableLogs = false;
        this._enableSpies = false;
    }

    MaterialCreatorManager.prototype.log = function (text) {
        if (this._enableLogs)
            this._codeEditor.setValue(this._codeEditor.getValue() + text + '\n');
    }

    /// Material Manager
    function MaterialManager() {
        this.scene = null;
        this.material = null;
    }

    MaterialManager.prototype.log = function (message) { }

    return {
        MaterialCreatorManager: MaterialCreatorManager,
        MaterialManager: MaterialManager
    }

})();

var CoreData = (function () {


    /// -----------------------------------------------------------------------------------------------------
    /* Materials */
    /// -----------------------------------------------------------------------------------------------------
    function CoreDataMaterialShader(manager, vertexProgram, pixelProgram, buildScript, callbackScript) {
        this.manager = manager;
        this.vertexProgram = vertexProgram;
        this.pixelProgram = pixelProgram;
        this.buildScript = buildScript;
        this.callbackScript = callbackScript;
        
        var customBuild = eval(callbackScript);
        this.update = customBuild.update;

        this.isUpdating = true;
    }

    /// -----------------------------------------------------------------------------------------------------
    /* Core Data */
    /// -----------------------------------------------------------------------------------------------------
    function CoreData() {
        this.materialShaders = new Array();
    }

    CoreData.prototype.addMaterial = function (manager, vertexProgram, pixelProgram, buildScript, callbackScript) {
        var m = new CoreDataMaterialShader(manager, vertexProgram, pixelProgram, buildScript, callbackScript);
        this.materialShaders.push(m);
        return m;
    }

    return CoreData;

})();

BABYLON.Editor.MaterialCreatorManager = MaterialCreatorManager.MaterialCreatorManager;
BABYLON.Editor.MaterialManager = MaterialCreatorManager.MaterialManager;
BABYLON.Editor.CoreData = CoreData;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON