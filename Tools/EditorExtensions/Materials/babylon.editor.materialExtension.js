var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            var MaterialBuilderExtension = (function () {
                /**
                * Constructor
                * @param scene: the babylon.js scene
                */
                function MaterialBuilderExtension(scene, removeOnApply) {
                    if (removeOnApply === void 0) { removeOnApply = true; }
                    // IEditorExtension members
                    this.extensionKey = "MaterialBuilder";
                    this.applyEvenIfDataIsNull = false;
                    this._materials = [];
                    // Initialize
                    this._scene = scene;
                    this.removeOnApply = removeOnApply;
                }
                // Called when extension is serialized
                MaterialBuilderExtension.prototype.onSerialize = function (data) {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].object)
                            delete data[i].object;
                    }
                };
                // Applies the extension
                MaterialBuilderExtension.prototype.apply = function (data) {
                    if (this.removeOnApply) {
                        for (var i = 0; i < this._materials.length; i++) {
                            this._materials[i].dispose(this.removeOnApply);
                        }
                    }
                    this._materials = [];
                    // Apply or create materials
                    for (var i = 0; i < data.length; i++) {
                        var settings = JSON.parse(data[i].config);
                        data[i].object = settings;
                        var material = this._scene.getMaterialByName(data[i].name);
                        if (!material) {
                            BABYLON.Effect.ShadersStore[data[i].name + "VertexShader"] = data[i].vertex;
                            BABYLON.Effect.ShadersStore[data[i].name + "PixelShader"] = data[i].pixel;
                            material = new EXTENSIONS.MaterialBuilder(data[i].name, this._scene, settings);
                        }
                        // Set up textures
                        for (var j = 0; j < settings.samplers.length; j++) {
                            var sampler = settings.samplers[j];
                            sampler.object = this._getTexture(sampler.textureName);
                        }
                        // Set up serialization
                        material.settings = settings;
                        material._data = data[i];
                        // Setup cache
                        material.setupCachedValues();
                        this._materials.push(material);
                    }
                };
                // Returns a texture from its name
                MaterialBuilderExtension.prototype._getTexture = function (name) {
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
                };
                return MaterialBuilderExtension;
            }());
            EXTENSIONS.MaterialBuilderExtension = MaterialBuilderExtension;
            EXTENSIONS.EditorExtension.RegisterExtension(MaterialBuilderExtension);
        })(EXTENSIONS = EDITOR.EXTENSIONS || (EDITOR.EXTENSIONS = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.materialExtension.js.map