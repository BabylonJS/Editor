module BABYLON.EDITOR.EXTENSIONS {
    export interface IMaterialExtensionData {
        name: string;
        config: string;

        vertex: string;
        pixel: string;

        object?: IMaterialBuilderSettings;
    }

    export class MaterialBuilderExtension implements IEditorExtension<IMaterialExtensionData[]> {
        // IEditorExtension members
        public extensionKey: string = "MaterialBuilder";
        public applyEvenIfDataIsNull: boolean = false;

        // Public members
        public removeOnApply: boolean;
        
        // Private members
        private _scene: Scene;
        private _materials: MaterialBuilder[] = [];

        /**
        * Constructor
        * @param scene: the babylon.js scene
        */
        constructor(scene: Scene, removeOnApply: boolean = true) {
            // Initialize
            this._scene = scene;
            this.removeOnApply = removeOnApply;
        }

        // Called when extension is serialized
        public onSerialize(data: IMaterialExtensionData[]): void {
            for (var i = 0; i < data.length; i++) {
                if (data[i].object)
                    delete data[i].object;
            }
        }

        // Applies the extension
        public apply(data: IMaterialExtensionData[]): void {
            if (this.removeOnApply) {
                for (var i = 0; i < this._materials.length; i++) {
                    this._materials[i].dispose(this.removeOnApply);
                }
            }

            this._materials = [];

            // Apply or create materials
            for (var i = 0; i < data.length; i++) {
                var settings: IMaterialBuilderSettings = JSON.parse(data[i].config);
                data[i].object = settings;

                var material = <MaterialBuilder> this._scene.getMaterialByName(data[i].name);
                if (!material) {
                    Effect.ShadersStore[data[i].name + "VertexShader"] = data[i].vertex;
                    Effect.ShadersStore[data[i].name + "PixelShader"] = data[i].pixel;

                    material = new MaterialBuilder(data[i].name, this._scene, settings);
                }

                // Set up textures
                for (var j = 0; j < settings.samplers.length; j++) {
                    var sampler = settings.samplers[j];
                    sampler.object = this._getTexture(sampler.textureName);
                }

                // Set up serialization
                material.settings = settings;
                material._data = data[i];

                this._materials.push(material);
            }
        }

        // Returns a texture from its name
        private _getTexture(name: string): BaseTexture {
            for (var i = 0; i < this._scene.textures.length; i++) {
                var texture = this._scene.textures[i];
                var textureName = texture.name.replace("file:", "").replace("data:", "");

                if (textureName === name)
                    return texture;
            }

            for (var i = 0; i < this._scene.customRenderTargets.length; i++) {
                var rt = this._scene.customRenderTargets[i];
                
                if (rt.name === name)
                    return rt;
            }

            return null;
        }
    }

    EditorExtension.RegisterExtension(MaterialBuilderExtension);
}