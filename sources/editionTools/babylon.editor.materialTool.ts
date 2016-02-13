module BABYLON.EDITOR {
    export class MaterialTool extends AbstractDatTool {
        // Public members
        public tab: string = "MATERIAL.TAB";

        // Private members
        private _dummyProperty: string = "";

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

            if (!material)
                return false;

            this.object = object;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // Material
            var materialFolder = this._element.addFolder("Material");

            var materials: string[] = [];
            for (var i = 0; i < scene.materials.length; i++)
                materials.push(scene.materials[i].name);

            this._dummyProperty = material.name;
            materialFolder.add(this, "_dummyProperty", materials).name("Material :").onFinishChange((result: any) => {
                var newmaterial = scene.getMaterialByName(result);
                this._editionTool.object.material = newmaterial;
                this.update();
            });

            if (material instanceof StandardMaterial) {
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

            if ((<any>material).disableLighting !== undefined)
                optionsFolder.add(material, "disableLighting").name("Disable Lighting");

            return true;
        }

        // Converts a standard material to PBR
        private _convertToPBR(): void {
            var object: StandardMaterial = null;
            var mesh = this._editionTool.object;

            if (mesh instanceof AbstractMesh) {
                object = mesh.material;
            }
            else if (mesh instanceof SubMesh) {
                object = mesh.getMaterial();
            }

            if (!object)
                return;

            var scene = this._editionTool.core.currentScene;
            var pbr: PBRMaterial = new PBRMaterial("New PBR Material", scene);

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
            if (mesh instanceof AbstractMesh) {
                mesh.material = pbr;
            }
            else if (mesh instanceof SubMesh) {
                var subMesh = <SubMesh>mesh;
                var material = subMesh.getMesh().material;

                if (material instanceof MultiMaterial) {
                    var materialIndex = material.subMaterials.indexOf(subMesh.getMaterial());

                    if (materialIndex !== -1)
                        material.subMaterials[materialIndex] = pbr;
                }
            }

            this.update();
        }
    }
}