module BABYLON.EDITOR {
    export class AbstractMaterialTool<T extends Material> extends AbstractDatTool {
        // Public members

        // Private members
        private _tabName: string = "New Tab";

        // Protected members
        protected onObjectSupported: (material: Material) => boolean
        protected material: T = null;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool, containerID: string, tabID: string, tabName: string) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-" + containerID
            ];

            this.tab = "MATERIAL." + tabID;
            this._tabName = tabName;
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof Mesh) {
                if (object.material && !(object.material instanceof MultiMaterial) && this.onObjectSupported(object.material))
                    return true;
            }
            else if (object instanceof SubMesh) {
                var subMesh = <SubMesh>object;
                var multiMaterial = <MultiMaterial>subMesh.getMesh().material;
                if (multiMaterial instanceof MultiMaterial && multiMaterial.subMaterials[subMesh.materialIndex] && this.onObjectSupported(multiMaterial.subMaterials[subMesh.materialIndex]))
                    return true;
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: this._tabName });
        }

        // Update
        public update(): boolean {
            var object: any = this._editionTool.object;
            var scene = this._editionTool.core.currentScene;

            super.update();

            if (object instanceof AbstractMesh) {
                this.material = object.material;
            }
            else if (object instanceof SubMesh) {
                this.material = object.getMaterial();
            }

            if (!this.material)
                return false;

            this.object = object;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            return true;
        }

        // Add a color element
        protected addColorFolder(color: Color3 | Color4, propertyName: string, open: boolean = false, parent?: dat.IFolderElement, callback?: () => void): dat.IFolderElement {
            var properties = ["r", "g", "b"];
            if (color instanceof Color4)
                properties.push("a");

            var folder = this._element.addFolder(propertyName, parent);
            for (var i = 0; i < properties.length; i++) {
                folder.add(color, properties[i]).min(0).max(1).name(properties[i]).onChange((result: any) => {
                    if (callback)
                        callback();
                });
            }

            if (!open)
                folder.close();

            return folder;
        }

        // Add a vector element
        protected addVectorFolder(vector: Vector2 | Vector3, propertyName: string, open: boolean = false, parent?: dat.IFolderElement, callback?: () => void): dat.IFolderElement {
            var properties = ["x", "y"];
            if (vector instanceof Vector3)
                properties.push("z");

            var folder = this._element.addFolder(propertyName, parent);
            for (var i = 0; i < properties.length; i++) {
                folder.add(vector, properties[i]).step(0.01).name(properties[i]).onChange((result: any) => {
                    if (callback)
                        callback();
                });
            }

            if (!open)
                folder.close();

            return folder;
        }

        // Adds a texture element
        protected addTextureButton(name: string, property: string, parentFolder?: dat.IFolderElement, callback?: () => void): dat.IFolderElement {
            var stringName = name.replace(" ", "");
            var functionName = "_set" + stringName;
            var textures = ["None"];
            var scene = this.material.getScene();

            for (var i = 0; i < scene.textures.length; i++) {
                textures.push(scene.textures[i].name);
            }

            this[functionName] = () => {
                var textureEditor = new GUITextureEditor(this._editionTool.core, this.material.name + " - " + name, this.material, property);
            };
            this[stringName] = (this.material[property] && this.material[property] instanceof BaseTexture) ? this.material[property].name : textures[0];

            var folder = this._element.addFolder("Texture", parentFolder);
            folder.close();
            folder.add(this, functionName).name("Browse...");
            folder.add(this, stringName, textures).name("Choose").onChange((result: any) => {
                if (result === "None") {
                    this.material[property] = undefined;
                }
                else {
                    for (var i = 0; i < scene.textures.length; i++) {
                        if (scene.textures[i].name === result) {
                            this.material[property] = scene.textures[i];
                            break;
                        }
                    }
                }

                if (callback)
                    callback();
            });

            return null;
        }
    }
}