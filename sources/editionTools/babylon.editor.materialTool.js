var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var MaterialTool = (function (_super) {
            __extends(MaterialTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function MaterialTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.object = null;
                this.tab = "MATERIAL.TAB";
                this._dummyProperty = "";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-MATERIAL"
                ];
                this._forbiddenElements = [
                    "pointSize",
                    "sideOrientation",
                    "alphaMode",
                    "zOffset",
                    "fillMode",
                    // PBR
                    "overloadedAmbientIntensity",
                    "overloadedDiffuseIntensity",
                    "overloadedSpecularIntensity",
                    "overloadedEmissiveIntensity",
                    "overloadedAmbient",
                    "overloadedDiffuse",
                    "overloadedSpecular",
                    "overloadedEmissive",
                    "overloadedReflection",
                    "overloadedGlossiness",
                    "overloadedGlossinessIntensity",
                    "overloadedReflectionIntensity",
                    "overloadedShadowIntensity",
                    "overloadedShadeIntensity",
                ];
            }
            // Object supported
            MaterialTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Mesh) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            MaterialTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Material" });
            };
            // Update
            MaterialTool.prototype.update = function () {
                var _this = this;
                var object = this._editionTool.object.material;
                var scene = this._editionTool.core.currentScene;
                if (this._element) {
                    this._element.remove();
                    this._element = null;
                }
                if (!object || !(object instanceof BABYLON.Material))
                    return;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Material
                var materialFolder = this._element.addFolder("Material");
                var materials = [];
                for (var i = 0; i < scene.materials.length; i++)
                    materials.push(scene.materials[i].name);
                this._dummyProperty = object.name;
                materialFolder.add(this, "_dummyProperty", materials).name("Material :").onFinishChange(function (result) {
                    var material = scene.getMaterialByName(result);
                    _this._editionTool.object.material = material;
                    _this.update();
                });
                if (object instanceof BABYLON.StandardMaterial) {
                    materialFolder.add(this, "_convertToPBR").name("Convert Standard to PBR");
                }
                // Values
                var generalFolder = this._element.addFolder("Common");
                generalFolder.add(object, "name").name("Name");
                var propertiesFolder = this._element.addFolder("Properties");
                this._addNumberFields(propertiesFolder, object);
                var colorsFolder = this._element.addFolder("Colors");
                this._addColorFields(colorsFolder, object);
                var vectorsFolder = this._element.addFolder("Vectors");
                this._addVectorFields(vectorsFolder, object);
            };
            // Resize
            MaterialTool.prototype.resize = function () {
                this._element.width = this._editionTool.panel.width - 15;
            };
            // Adds a number
            MaterialTool.prototype._addNumberFields = function (folder, object) {
                for (var thing in object) {
                    var value = object[thing];
                    if (typeof value === "number" && thing[0] !== "_" && this._forbiddenElements.indexOf(thing) === -1) {
                        folder.add(object, thing).name(thing).step(0.01);
                    }
                }
            };
            // Adds colors
            MaterialTool.prototype._addColorFields = function (folder, object) {
                for (var thing in object) {
                    var value = object[thing];
                    if (value instanceof BABYLON.Color3 && thing[0] !== "_" && this._forbiddenElements.indexOf(thing) === -1) {
                        var colorFolder = this._element.addFolder(thing, folder);
                        colorFolder.close();
                        colorFolder.add(object[thing], "r").name("r").min(0.0).max(1.0).step(0.001);
                        colorFolder.add(object[thing], "g").name("g").min(0.0).max(1.0).step(0.001);
                        colorFolder.add(object[thing], "b").name("b").min(0.0).max(1.0).step(0.001);
                    }
                }
            };
            // Adds vectors
            MaterialTool.prototype._addVectorFields = function (folder, object) {
                for (var thing in object) {
                    var value = object[thing];
                    if (thing[0] === "_" || this._forbiddenElements.indexOf(thing) === -1)
                        continue;
                    if (value instanceof BABYLON.Vector3 || value instanceof BABYLON.Vector2) {
                        var vectorFolder = this._element.addFolder(thing, folder);
                        vectorFolder.close();
                        vectorFolder.add(object[thing], "x").name("x").step(0.01);
                        vectorFolder.add(object[thing], "y").name("y").step(0.01);
                        if (value instanceof BABYLON.Vector3)
                            vectorFolder.add(object[thing], "z").name("z").step(0.01);
                    }
                }
            };
            // Converts a standard material to PBR
            MaterialTool.prototype._convertToPBR = function () {
                var object = this._editionTool.object.material;
                var scene = this._editionTool.core.currentScene;
                var pbr = new BABYLON.PBRMaterial("New PBR Material", scene);
                // Textures
                pbr.diffuseTexture = object.diffuseTexture;
                pbr.bumpTexture = object.bumpTexture;
                pbr.ambientTexture = object.ambientTexture;
                pbr.emissiveTexture = object.emissiveTexture;
                pbr.lightmapTexture = object.lightmapTexture;
                pbr.reflectionTexture = object.reflectionTexture || scene.reflectionProbes[0].cubeTexture;
                pbr.specularTexture = object.specularTexture;
                pbr.useAlphaFromDiffuseTexture = object.useAlphaFromDiffuseTexture;
                // Colors
                pbr.diffuseColor = object.diffuseColor;
                pbr.emissiveColor = object.emissiveColor;
                pbr.specularColor = object.specularColor;
                pbr.ambientColor = object.ambientColor;
                pbr.glossiness = object.specularPower;
                pbr.alpha = object.alpha;
                pbr.alphaMode = object.alphaMode;
                // Finish
                this._editionTool.object.material = pbr;
                this.update();
            };
            return MaterialTool;
        })(EDITOR.AbstractTool);
        EDITOR.MaterialTool = MaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.materialTool.js.map