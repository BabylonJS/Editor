module BABYLON.EDITOR.EXTENSIONS {
    export interface IDynamicMaterialTexture {
        materialName: string;
        propertyName: string;
    }

    export interface IDynamicTextureExtension {
        name: string;
        width: number;
        height: number;

        clearColor: string;
        hasAlpha: boolean;

        textx: number;
        texty: number;
        text: string;
        textColor: string;
        textFont: string;

        materials?: IDynamicMaterialTexture[];
    }

    export class DynamicTextureBuilderExtension implements IEditorExtension<IDynamicTextureExtension[]> {
        // IEditorExtension members
        public extensionKey: string = "DynamicTextureBuilder";
        public applyEvenIfDataIsNull: boolean = false;

        // Private members
        private _scene: Scene;

        /**
        * Constructor
        * @param scene: the babylon.js scene
        */
        constructor(scene: Scene) {
            // Initialize
            this._scene = scene;
        }

        // Applies the extension
        public apply(data: IDynamicTextureExtension[]): void {
            for (var i = 0; i < data.length; i++) {
                // Create texture
                var texture = DynamicTextureBuilderExtension.SetupDynamicTexture(data[i], this._scene);

                // Fill materials
                if (!data[i].materials)
                    continue;

                for (var j = 0; j < data[i].materials.length; j++) {
                    var material = this._scene.getMaterialByName(data[i].materials[j].materialName);
                    if (material) {
                        material[data[i].materials[j].propertyName] = texture;
                    }
                }
            }
        }

        // On serialize the extension metadatas
        public onSerialize?(data: IDynamicTextureExtension[]): void {
            for (var i = 0; i < data.length; i++)
                this._processSerialization(data[i]);
        }

        // The extension should be called when loading a new scene in the editor
        public onLoad(data: IDynamicTextureExtension[]): void {
            this.apply(data);
        }

        // Processes the serialization
        private _processSerialization(data: IDynamicTextureExtension): void {
            data.materials = [];

            for (var i = 0; i < this._scene.materials.length; i++) {
                var material = this._scene.materials[i];

                for (var thing in material) {
                    var value = material[thing];

                    if (value instanceof DynamicTexture && value.name === data.name) {
                        data.materials.push({
                            materialName: material.name,
                            propertyName: thing
                        })
                    }
                }
            }
        }

        /**
         * Statics
         */

        // Creates and setups the texture
        public static SetupDynamicTexture(data: IDynamicTextureExtension, scene: Scene): DynamicTexture {
            var texture: DynamicTexture = new DynamicTexture(data.name, { width: data.width, height: data.height }, scene, false);

            texture.clear();
            texture.drawText(data.text, data.textx, data.texty, data.textFont, data.textColor, data.clearColor);
            texture.update(true);

            texture.hasAlpha = data.hasAlpha;

            return texture;
        }
    }

    EditorExtension.RegisterExtension(DynamicTextureBuilderExtension);
}
