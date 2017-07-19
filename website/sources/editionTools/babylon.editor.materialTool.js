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
                var _this = _super.call(this, editionTool) || this;
                // Public members
                _this.tab = "MATERIAL.TAB";
                // Private members
                _this._dummyProperty = "";
                _this._libraryDummyProperty = "";
                // Initialize
                _this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-MATERIAL"
                ];
                return _this;
            }
            // Object supported
            MaterialTool.prototype.isObjectSupported = function (object) {
                /*
                if (object instanceof Mesh) {
                    if (object.material && !(object.material instanceof MultiMaterial))
                        return true;
                }
                else if (object instanceof SubMesh) {
                    var subMesh = <SubMesh>object;
                    var multiMaterial = <MultiMaterial>subMesh.getMesh().material;
                    if (multiMaterial instanceof MultiMaterial && multiMaterial.subMaterials[subMesh.materialIndex])
                        return true;
                }
                */
                if (object instanceof BABYLON.AbstractMesh) {
                    if (object.material && (object.material instanceof BABYLON.MultiMaterial))
                        return false;
                    return true;
                }
                else if (object instanceof BABYLON.SubMesh)
                    return true;
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
                if (object instanceof BABYLON.InstancedMesh)
                    object = object.sourceMesh;
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
                this._material = material;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Material
                var materialFolder = this._element.addFolder("Material");
                var materials = ["None"];
                for (var i = 0; i < scene.materials.length; i++)
                    materials.push(scene.materials[i].name);
                this._dummyProperty = material && material.name ? material.name : materials[0];
                materialFolder.add(this, "_dummyProperty", materials).name("Material :").onFinishChange(function (result) {
                    if (result === "None") {
                        _this._removeMaterial();
                    }
                    else {
                        var newmaterial = scene.getMaterialByName(result);
                        if (_this._editionTool.object instanceof BABYLON.SubMesh) {
                            var index = _this._editionTool.object.materialIndex;
                            var multiMaterial = object.getMesh().material;
                            if (multiMaterial instanceof BABYLON.MultiMaterial)
                                multiMaterial.subMaterials[index] = newmaterial;
                        }
                        else
                            object.material = newmaterial;
                    }
                    _this._editionTool.updateEditionTool();
                });
                materialFolder.add(this, "_removeMaterial").name("Remove Material");
                if (material)
                    materialFolder.add(this, "_applyMultiple").name("Apply Same Material On...");
                // Common
                if (material) {
                    material.alpha = typeof material.alpha === "string" ? parseFloat(material.alpha) : material.alpha;
                    var generalFolder = this._element.addFolder("Common");
                    generalFolder.add(material, "id").name("Id");
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
                }
                // Materials Library
                var materialsLibraryFolder = this._element.addFolder("Materials Library");
                this._configureMaterialsLibrary(materialsLibraryFolder);
                return true;
            };
            // Configure materials library
            MaterialTool.prototype._configureMaterialsLibrary = function (folder) {
                var items = [
                    "None",
                    "StandardMaterial",
                    "PBRMaterial",
                    "PBRMetallicRoughnessMaterial",
                    "PBRSpecularGlossinessMaterial",
                    "LegacyPBRMaterial",
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
                    "CellMaterial",
                    "SimpleMaterial"
                ];
                var ctr = EDITOR.Tools.GetConstructorName(this.object.material);
                this._libraryDummyProperty = ctr === "undefined" ? items[0] : ctr;
                folder.add(this, "_libraryDummyProperty", items).name("Material");
                folder.add(this, "_applyMaterial").name("Apply Material");
            };
            // Apply the selected material
            MaterialTool.prototype._applyMaterial = function () {
                var material = new BABYLON[this._libraryDummyProperty]("New Material " + EDITOR.SceneFactory.GenerateUUID(), this._editionTool.core.currentScene);
                BABYLON.Tags.AddTagsTo(material, "added");
                if (this.object instanceof BABYLON.AbstractMesh)
                    this.object.material = material;
                else if (this.object instanceof BABYLON.SubMesh) {
                    var subMesh = this.object;
                    var subMeshMaterial = subMesh.getMesh().material;
                    if (!(subMeshMaterial instanceof BABYLON.MultiMaterial))
                        return;
                    subMeshMaterial.subMaterials[subMesh.materialIndex] = material;
                }
                if (material instanceof BABYLON.FurMaterial && this.object instanceof BABYLON.Mesh) {
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
            // Removes the current material
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
            // Apply the current material to...
            MaterialTool.prototype._applyMultiple = function () {
                var _this = this;
                var picker = new EDITOR.ObjectPicker(this._core);
                picker.objectLists.push(this._core.currentScene.meshes);
                picker.selectedObjects = [this.object];
                picker.minSelectCount = 0;
                picker.windowName = "Select the meshes to apply the current material";
                picker.open();
                picker.onObjectPicked = function (names) {
                    debugger;
                    for (var i = 0; i < names.length; i++) {
                        var mesh = _this._core.currentScene.getMeshByName(names[i]);
                        if (!mesh)
                            continue;
                        if (mesh.getDescendants().length > 0)
                            debugger;
                        if (!mesh.material && mesh.subMeshes.length > 1) {
                            var multiMat = new BABYLON.MultiMaterial("MultiMat" + EDITOR.SceneFactory.GenerateUUID(), _this._core.currentScene);
                            multiMat.subMaterials = new Array(mesh.subMeshes.length);
                            mesh.material = multiMat;
                        }
                        if (mesh.subMeshes.length > 1) {
                            for (var j = 0; j < mesh.subMeshes.length; j++)
                                mesh.material.subMaterials[j] = _this._material;
                        }
                        else
                            mesh.material = _this._material;
                    }
                };
            };
            // Set material from materials library
            MaterialTool.prototype._setMaterialsLibrary = function () {
                // Body
                var windowBody = EDITOR.GUI.GUIElement.CreateElement("div", "BABYLON-EDITOR-MATERIALS-LIBRARY");
                var window = new EDITOR.GUI.GUIWindow("MaterialsLibraryWindow", this._editionTool.core, "Materials Library", windowBody, new BABYLON.Vector2(800, 600), ["Select", "Cancel"]);
                window.modal = true;
                window.buildElement(null);
                // Layout
            };
            return MaterialTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.MaterialTool = MaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.materialTool.js.map
