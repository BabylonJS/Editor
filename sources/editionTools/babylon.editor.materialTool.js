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
                this.tab = "MATERIAL.TAB";
                // Private members
                this._dummyProperty = "";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-MATERIAL"
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
                var material = null;
                var scene = this._editionTool.core.currentScene;
                _super.prototype.update.call(this);
                if (object instanceof BABYLON.AbstractMesh) {
                    material = object.material;
                }
                else if (object instanceof BABYLON.SubMesh) {
                    material = object.getMaterial();
                }
                if (!material)
                    return false;
                this.object = object;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Material
                var materialFolder = this._element.addFolder("Material");
                var materials = [];
                for (var i = 0; i < scene.materials.length; i++)
                    materials.push(scene.materials[i].name);
                this._dummyProperty = material.name;
                materialFolder.add(this, "_dummyProperty", materials).name("Material :").onFinishChange(function (result) {
                    var newmaterial = scene.getMaterialByName(result);
                    _this._editionTool.object.material = newmaterial;
                    _this.update();
                });
                if (material instanceof BABYLON.StandardMaterial) {
                    materialFolder.add(this, "_convertToPBR").name("Convert to PBR");
                }
                // Common
                var generalFolder = this._element.addFolder("Common");
                generalFolder.add(material, "name").name("Name");
                generalFolder.add(material, "alpha").min(0).max(1).name("Alpha");
                // Options
                var optionsFolder = this._element.addFolder("Options");
                optionsFolder.add(material, "wireframe").name("Wire frame");
                optionsFolder.add(material, "fogEnabled").name("Fog Enabled");
                optionsFolder.add(material, "backFaceCulling").name("Back Face Culling");
                optionsFolder.add(material, "checkReadyOnEveryCall").name("Check Ready On every Call");
                optionsFolder.add(material, "checkReadyOnlyOnce").name("Check Ready Only Once");
                optionsFolder.add(material, "disableDepthWrite").name("Disable Depth Write");
                if (material.disableLighting !== undefined)
                    optionsFolder.add(material, "disableLighting").name("Disable Lighting");
                return true;
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
                pbr.albedoTexture = object.diffuseTexture;
                pbr.bumpTexture = object.bumpTexture;
                pbr.ambientTexture = object.ambientTexture;
                pbr.emissiveTexture = object.emissiveTexture;
                pbr.lightmapTexture = object.lightmapTexture;
                pbr.reflectionTexture = object.reflectionTexture || scene.reflectionProbes[0].cubeTexture;
                pbr.reflectivityTexture = object.specularTexture;
                pbr.useAlphaFromAlbedoTexture = object.useAlphaFromDiffuseTexture;
                // Colors
                pbr.albedoColor = object.diffuseColor;
                pbr.emissiveColor = object.emissiveColor;
                pbr.reflectivityColor = object.specularColor;
                pbr.ambientColor = object.ambientColor;
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