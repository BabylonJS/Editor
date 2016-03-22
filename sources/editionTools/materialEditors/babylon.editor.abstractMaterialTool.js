var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AbstractMaterialTool = (function (_super) {
            __extends(AbstractMaterialTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AbstractMaterialTool(editionTool, containerID, tabID, tabName) {
                _super.call(this, editionTool);
                // Public members
                // Private members
                this._tabName = "New Tab";
                this.material = null;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-" + containerID
                ];
                this.tab = "MATERIAL." + tabID;
                this._tabName = tabName;
            }
            // Object supported
            AbstractMaterialTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Mesh) {
                    if (object.material && !(object.material instanceof BABYLON.MultiMaterial) && this.onObjectSupported(object.material))
                        return true;
                }
                else if (object instanceof BABYLON.SubMesh) {
                    var subMesh = object;
                    var multiMaterial = subMesh.getMesh().material;
                    if (multiMaterial instanceof BABYLON.MultiMaterial && multiMaterial.subMaterials[subMesh.materialIndex] && this.onObjectSupported(multiMaterial.subMaterials[subMesh.materialIndex]))
                        return true;
                }
                return false;
            };
            // Creates the UI
            AbstractMaterialTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: this._tabName });
            };
            // Update
            AbstractMaterialTool.prototype.update = function () {
                var object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                _super.prototype.update.call(this);
                if (object instanceof BABYLON.AbstractMesh) {
                    this.material = object.material;
                }
                else if (object instanceof BABYLON.SubMesh) {
                    this.material = object.getMaterial();
                }
                if (!this.material)
                    return false;
                this.object = object;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                return true;
            };
            // Adds a texture element
            AbstractMaterialTool.prototype.addTextureButton = function (name, property, parentFolder, callback) {
                return _super.prototype.addTextureFolder.call(this, this.material, name, property, parentFolder, callback);
            };
            return AbstractMaterialTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.AbstractMaterialTool = AbstractMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
