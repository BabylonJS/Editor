module BABYLON.EDITOR {
    export class MaterialTool extends AbstractDatTool {
        // Public members
        public tab: string = "MATERIAL.TAB";

        // Private members
        private _dummyProperty: string = "";
        private _libraryDummyProperty: string = "";

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-MATERIAL"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
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
            if (object instanceof Mesh) {
                if (object.material && (object.material instanceof MultiMaterial))
                    return false;

                return true;
            }
            else if (object instanceof SubMesh)
                return true;

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Material" });
        }

        // Update
        public update(): boolean {
            var object: any = this._editionTool.object;
            var material: Material = null;
            var scene = this._editionTool.core.currentScene;

            super.update();

            if (object instanceof AbstractMesh) {
                material = object.material;
            }
            else if (object instanceof SubMesh) {
                material = object.getMaterial();
            }

            this.object = object;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // Material
            var materialFolder = this._element.addFolder("Material");

            var materials: string[] = ["None"];
            for (var i = 0; i < scene.materials.length; i++)
                materials.push(scene.materials[i].name);

            this._dummyProperty = material ? material.name : materials[0];
            materialFolder.add(this, "_dummyProperty", materials).name("Material :").onFinishChange((result: any) => {
                if (result === "None") {
                    this._removeMaterial();
                }
                else {
                    var newmaterial = scene.getMaterialByName(result);
                    this._editionTool.object.material = newmaterial;
                }
                this._editionTool.updateEditionTool();
            });

            materialFolder.add(this, "_removeMaterial").name("Remove Material");

            // Common
            if (material) {
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

                if ((<any>material).disableLighting !== undefined)
                    optionsFolder.add(material, "disableLighting").name("Disable Lighting");
            }

            // Materials Library
            var materialsLibraryFolder = this._element.addFolder("Materials Library");
            this._configureMaterialsLibrary(materialsLibraryFolder);

            return true;
        }

        // Configure materials library
        private _configureMaterialsLibrary(folder: dat.IFolderElement): void {
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

            var ctr = Tools.GetConstructorName(this.object.material);
            this._libraryDummyProperty = ctr === "undefined" ? items[0] : ctr;

            folder.add(this, "_libraryDummyProperty", items).name("Material");
            folder.add(this, "_applyMaterial").name("Apply Material");
        }

        // Apply the selected material
        private _applyMaterial(): void {
            var material = new BABYLON[this._libraryDummyProperty]("New Material " + SceneFactory.GenerateUUID(), this._editionTool.core.currentScene);
            this.object.material = material;

            if (material instanceof FurMaterial) {
                var furTexture = FurMaterial.GenerateTexture("furTexture", this._editionTool.core.currentScene);
                (<FurMaterial>material).furTexture = furTexture;
                
                var meshes = FurMaterial.FurifyMesh(this.object, 30);
                for (var i = 0; i < meshes.length; i++) {
                    meshes[i].material;
                }
            }

            this._editionTool.updateEditionTool();
        }

        // Removes the current material
        private _removeMaterial(): void {
            if (this.object instanceof AbstractMesh) {
                this.object.material = undefined;
            }
            else if (this.object instanceof SubMesh) {
                var subMesh = <SubMesh>this.object;
                var material = <MultiMaterial>subMesh.getMesh().material;

                if (!(material instanceof MultiMaterial))
                    return;

                material.subMaterials[subMesh.materialIndex] = undefined;
            }

            this._editionTool.updateEditionTool();
        }

        // Set material from materials library
        private _setMaterialsLibrary(): void {
            // Body
            var windowBody = GUI.GUIElement.CreateElement("div", "BABYLON-EDITOR-MATERIALS-LIBRARY");
            var window = new GUI.GUIWindow("MaterialsLibraryWindow", this._editionTool.core, "Materials Library", windowBody, new Vector2(800, 600), ["Select", "Cancel"]);
            window.modal = true;
            window.buildElement(null);

            // Layout

        }
    }
}