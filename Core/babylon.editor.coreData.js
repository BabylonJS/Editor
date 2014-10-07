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

var CoreData = (function () {

    /// -----------------------------------------------------------------------------------------------------
    /* Materials */
    /// -----------------------------------------------------------------------------------------------------
    function CoreDataMaterialShader(material, vertexProgram, pixelProgram, buildScript, callbackScript) {
        this.material = material;
        this.vertexProgram = vertexProgram;
        this.pixelProgram = pixelProgram;
        this.buildScript = buildScript;
        this.callbackScript = callbackScript;
        this.isUpdating = true;
    }

    /// -----------------------------------------------------------------------------------------------------
    /* Core Data */
    /// -----------------------------------------------------------------------------------------------------
    function CoreData() {
        this.materialShaders = new Array();
    }

    CoreData.prototype.addMaterial = function (material, vertexProgram, pixelProgram, buildScript, callbackScript) {
        var m = new CoreDataMaterialShader(material, vertexProgram, pixelProgram, buildScript, callbackScript);
        this.materialShaders.push(m);
        return m;
    }

    return CoreData;

})();

BABYLON.Editor.CoreData = CoreData;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON