module BABYLON.EDITOR {
    export class AbstractDatTool extends AbstractTool {
        // Public members

        // Protected members
        protected _element: GUI.GUIEditForm;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            // Initialize
            super(editionTool);
        }

        // Update
        public update(): boolean {
            if (this._element) {
                this._element.remove();
                this._element = null;
            }

            return true;
        }

        // Resize
        public resize(): void {
            if (this._element)
                this._element.width = this._editionTool.panel.width - 15;
        }

        /**
        * Static methods
        */
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
        protected addTextureFolder(object: Object, name: string, property: string, parentFolder?: dat.IFolderElement, callback?: () => void): dat.IFolderElement {
            var stringName = name.replace(" ", "");
            var functionName = "_set" + stringName;
            var textures = ["None"];
            var scene = this._editionTool.core.currentScene;

            for (var i = 0; i < scene.textures.length; i++) {
                textures.push(scene.textures[i].name);
            }

            this[functionName] = () => {
                var textureEditor = new GUITextureEditor(this._editionTool.core, name, object, property);
            };
            this[stringName] = (object[property] && object[property] instanceof BaseTexture) ? object[property].name : textures[0];

            var folder = this._element.addFolder(name, parentFolder);
            folder.close();
            folder.add(this, functionName).name("Browse...");
            folder.add(this, stringName, textures).name("Choose").onChange((result: any) => {
                if (result === "None") {
                    object[property] = undefined;
                }
                else {
                    for (var i = 0; i < scene.textures.length; i++) {
                        if (scene.textures[i].name === result) {
                            object[property] = scene.textures[i];
                            break;
                        }
                    }
                }

                if (callback)
                    callback();
            });

            return folder;
        }
    }
}