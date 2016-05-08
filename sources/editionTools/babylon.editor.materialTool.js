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
            function MaterialTool(editionTool) {
                _super.call(this, editionTool);
                this.tab = "MATERIAL.TAB";
                this._dummyProperty = "";
                this._libraryDummyProperty = "";
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-MATERIAL"
                ];
            }
            MaterialTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.AbstractMesh) {
                    if (object.material && (object.material instanceof BABYLON.MultiMaterial))
                        return false;
                    return true;
                }
                else if (object instanceof BABYLON.SubMesh)
                    return true;
                return false;
            };
            MaterialTool.prototype.createUI = function () {
                this._editionTool.panel.createTab({ id: this.tab, caption: "Material" });
            };
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
                this.object = object;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                var materialFolder = this._element.addFolder("Material");
                var materials = ["None"];
                for (var i = 0; i < scene.materials.length; i++)
                    materials.push(scene.materials[i].name);
                this._dummyProperty = material ? material.id : materials[0];
                materialFolder.add(this, "_dummyProperty", materials).name("Material :").onFinishChange(function (result) {
                    if (result === "None") {
                        _this._removeMaterial();
                    }
                    else {
                        var newmaterial = scene.getMaterialByID(result);
                        _this._editionTool.object.material = newmaterial;
                    }
                    _this._editionTool.updateEditionTool();
                });
                materialFolder.add(this, "_removeMaterial").name("Remove Material");
                if (material) {
                    var generalFolder = this._element.addFolder("Common");
                    generalFolder.add(material, "id").name("Id");
                    generalFolder.add(material, "alpha").min(0).max(1).name("Alpha");
                    var optionsFolder = this._element.addFolder("Options");
                    optionsFolder.add(material, "wireframe").name("Wire frame");
                    optionsFolder.add(material, "fogEnabled").name("Fog Enabled");
                    optionsFolder.add(material, "backFaceCulling").name("Back Face Culling");
                    optionsFolder.add(material, "checkReadyOnEveryCall").name("Check Ready On every Call");
                    optionsFolder.add(material, "checkReadyOnlyOnce").name("Check Ready Only Once");
                    optionsFolder.add(material, "disableDepthWrite").name("Disable Depth Write");
                    if (material.disableLighting !== undefined)
                        optionsFolder.add(material, "disableLighting").name("Disable Lighting");
                }
                var materialsLibraryFolder = this._element.addFolder("Materials Library");
                this._configureMaterialsLibrary(materialsLibraryFolder);
                return true;
            };
            MaterialTool.prototype._configureMaterialsLibrary = function (folder) {
                var items = [
                    "None",
                    "StandardMaterial",
                    "PBRMaterial",
                    "FireMaterial",
                    "GradientMaterial",
                    "FurMaterial",
                    "GridMaterial",
                    "LavaMaterial",
                    "NormalMaterial",
                    "SkyMaterial",
                    "TerrainMaterial",
                    "TriPlanarMaterial",
                    "WaterMaterial",
                    "SimpleMaterial"
                ];
                var ctr = EDITOR.Tools.GetConstructorName(this.object.material);
                this._libraryDummyProperty = ctr === "undefined" ? items[0] : ctr;
                folder.add(this, "_libraryDummyProperty", items).name("Material");
                folder.add(this, "_applyMaterial").name("Apply Material");
            };
            MaterialTool.prototype._applyMaterial = function () {
                var material = new BABYLON[this._libraryDummyProperty]("New Material " + EDITOR.SceneFactory.GenerateUUID(), this._editionTool.core.currentScene);
                this.object.material = material;
                if (material instanceof BABYLON.FurMaterial) {
                    var furTexture = BABYLON.FurMaterial.GenerateTexture("furTexture", this._editionTool.core.currentScene);
                    material.furTexture = furTexture;
                    var meshes = BABYLON.FurMaterial.FurifyMesh(this.object, 30);
                    for (var i = 0; i < meshes.length; i++) {
                        BABYLON.Tags.EnableFor(meshes[i]);
                        BABYLON.Tags.AddTagsTo(meshes[i], "FurAdded");
                    }
                }
                this._editionTool.updateEditionTool();
            };
            MaterialTool.prototype._removeMaterial = function () {
                if (this.object instanceof BABYLON.AbstractMesh) {
                    this.object.material = undefined;
                }
                else if (this.object instanceof BABYLON.SubMesh) {
                    var subMesh = this.object;
                    var material = subMesh.getMesh().material;
                    if (!(material instanceof BABYLON.MultiMaterial))
                        return;
                    material.subMaterials[subMesh.materialIndex] = undefined;
                }
                this._editionTool.updateEditionTool();
            };
            MaterialTool.prototype._setMaterialsLibrary = function () {
                var windowBody = EDITOR.GUI.GUIElement.CreateElement("div", "BABYLON-EDITOR-MATERIALS-LIBRARY");
                var window = new EDITOR.GUI.GUIWindow("MaterialsLibraryWindow", this._editionTool.core, "Materials Library", windowBody, new BABYLON.Vector2(800, 600), ["Select", "Cancel"]);
                window.modal = true;
                window.buildElement(null);
            };
            return MaterialTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.MaterialTool = MaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
