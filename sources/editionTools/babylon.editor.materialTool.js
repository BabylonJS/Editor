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
                ];
            }
            // Object supported
            MaterialTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Mesh) {
                    if (object.material && !(object.material instanceof BABYLON.MultiMaterial))
                        return true;
                }
                else if (object instanceof BABYLON.SubMesh) {
                    var subMesh = object;
                    var multiMaterial = subMesh.getMesh().material;
                    if (multiMaterial instanceof BABYLON.MultiMaterial && multiMaterial.subMaterials[subMesh.materialIndex])
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
                var object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                _super.prototype.update.call(this);
                if (object instanceof BABYLON.AbstractMesh) {
                    object = object.material;
                }
                else if (object instanceof BABYLON.SubMesh) {
                    object = object.getMaterial();
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
                    materialFolder.add(this, "_convertToPBR").name("Convert to PBR");
                }
                // Common
                var generalFolder = this._element.addFolder("Common");
                generalFolder.add(object, "name").name("Name");
                // Textures
                var texturesFolder = this._element.addFolder("Textures");
                for (var thing in object) {
                    var value = object[thing];
                    if (value instanceof BABYLON.Texture) {
                        var tex = value;
                        var texFolder = texturesFolder.addFolder(this._beautifyName(thing));
                    }
                }
                // Numbers
                var numbersFolder = this._element.addFolder("Numbers");
                this._addNumberFields(numbersFolder, object);
                // Booleans
                var booleansFolder = this._element.addFolder("Booleans");
                this._addBooleanFields(booleansFolder, object);
                // Colors
                var colorsFolder = this._element.addFolder("Colors");
                this._addColorFields(colorsFolder, object);
                // Vectors
                var vectorsFolder = this._element.addFolder("Vectors");
                this._addVectorFields(vectorsFolder, object);
            };
            // Beautify property name
            MaterialTool.prototype._beautifyName = function (name) {
                var result = name[0].toUpperCase();
                for (var i = 1; i < name.length; i++) {
                    var char = name[i];
                    if (char === char.toUpperCase())
                        result += " ";
                    result += name[i];
                }
                return result;
            };
            // Adds a number
            MaterialTool.prototype._addNumberFields = function (folder, object) {
                for (var thing in object) {
                    var value = object[thing];
                    if (typeof value === "number" && thing[0] !== "_" && this._forbiddenElements.indexOf(thing) === -1) {
                        var item = folder.add(object, thing);
                        this._element.tagObjectIfChanged(item, object, thing);
                        if (thing === "alpha") {
                            item.min(0.0).max(1.0).step(0.01);
                        }
                        item.step(0.01).name(this._beautifyName(thing));
                    }
                }
            };
            // Adds booleans
            MaterialTool.prototype._addBooleanFields = function (folder, object) {
                for (var thing in object) {
                    var value = object[thing];
                    if (typeof value === "boolean" && thing[0] !== "_" && this._forbiddenElements.indexOf(thing) === -1) {
                        var item = folder.add(object, thing).name(this._beautifyName(thing));
                        this._element.tagObjectIfChanged(item, object, thing);
                    }
                }
            };
            // Adds colors
            MaterialTool.prototype._addColorFields = function (folder, object) {
                for (var thing in object) {
                    var value = object[thing];
                    if (value instanceof BABYLON.Color3 && thing[0] !== "_" && this._forbiddenElements.indexOf(thing) === -1) {
                        var colorFolder = this._element.addFolder(this._beautifyName(thing), folder);
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
                        var vectorFolder = this._element.addFolder(this._beautifyName(thing), folder);
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
                var object = null;
                var mesh = this._editionTool.object;
                if (mesh instanceof BABYLON.AbstractMesh) {
                    object = mesh.material;
                }
                else if (mesh instanceof BABYLON.SubMesh) {
                    object = mesh.getMaterial();
                }
                if (!object)
                    return;
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
                if (mesh instanceof BABYLON.AbstractMesh) {
                    mesh.material = pbr;
                }
                else if (mesh instanceof BABYLON.SubMesh) {
                    var subMesh = mesh;
                    var material = subMesh.getMesh().material;
                    if (material instanceof BABYLON.MultiMaterial) {
                        var materialIndex = material.subMaterials.indexOf(subMesh.getMaterial());
                        if (materialIndex !== -1)
                            material.subMaterials[materialIndex] = pbr;
                    }
                }
                this.update();
            };
            return MaterialTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.MaterialTool = MaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.materialTool.js.map