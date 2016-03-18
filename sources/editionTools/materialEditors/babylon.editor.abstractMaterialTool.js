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
            // Add a color element
            AbstractMaterialTool.prototype.addColorFolder = function (color, propertyName, open, parent, callback) {
                if (open === void 0) { open = false; }
                var properties = ["r", "g", "b"];
                if (color instanceof BABYLON.Color4)
                    properties.push("a");
                var folder = this._element.addFolder(propertyName, parent);
                for (var i = 0; i < properties.length; i++) {
                    folder.add(color, properties[i]).min(0).max(1).name(properties[i]).onChange(function (result) {
                        if (callback)
                            callback();
                    });
                }
                if (!open)
                    folder.close();
                return folder;
            };
            // Add a vector element
            AbstractMaterialTool.prototype.addVectorFolder = function (vector, propertyName, open, parent, callback) {
                if (open === void 0) { open = false; }
                var properties = ["x", "y"];
                if (vector instanceof BABYLON.Vector3)
                    properties.push("z");
                var folder = this._element.addFolder(propertyName, parent);
                for (var i = 0; i < properties.length; i++) {
                    folder.add(vector, properties[i]).step(0.01).name(properties[i]).onChange(function (result) {
                        if (callback)
                            callback();
                    });
                }
                if (!open)
                    folder.close();
                return folder;
            };
            // Adds a texture element
            AbstractMaterialTool.prototype.addTextureButton = function (name, property, parentFolder, callback) {
                var _this = this;
                var stringName = name.replace(" ", "");
                var functionName = "_set" + stringName;
                var textures = ["None"];
                var scene = this.material.getScene();
                for (var i = 0; i < scene.textures.length; i++) {
                    textures.push(scene.textures[i].name);
                }
                this[functionName] = function () {
                    var textureEditor = new EDITOR.GUITextureEditor(_this._editionTool.core, _this.material.name + " - " + name, _this.material, property);
                };
                this[stringName] = (this.material[property] && this.material[property] instanceof BABYLON.BaseTexture) ? this.material[property].name : textures[0];
                var folder = this._element.addFolder(name, parentFolder);
                folder.close();
                folder.add(this, functionName).name("Browse...");
                folder.add(this, stringName, textures).name("Choose").onChange(function (result) {
                    if (result === "None") {
                        _this.material[property] = undefined;
                    }
                    else {
                        for (var i = 0; i < scene.textures.length; i++) {
                            if (scene.textures[i].name === result) {
                                _this.material[property] = scene.textures[i];
                                break;
                            }
                        }
                    }
                    if (callback)
                        callback();
                });
                return folder;
            };
            return AbstractMaterialTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.AbstractMaterialTool = AbstractMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
