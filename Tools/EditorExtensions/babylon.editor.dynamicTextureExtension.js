var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            var DynamicTextureBuilderExtension = (function () {
                /**
                * Constructor
                * @param scene: the babylon.js scene
                */
                function DynamicTextureBuilderExtension(scene) {
                    // IEditorExtension members
                    this.extensionKey = "DynamicTextureBuilder";
                    this.applyEvenIfDataIsNull = false;
                    // Initialize
                    this._scene = scene;
                }
                // Applies the extension
                DynamicTextureBuilderExtension.prototype.apply = function (data) {
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
                };
                // On serialize the extension metadatas
                DynamicTextureBuilderExtension.prototype.onSerialize = function (data) {
                    for (var i = 0; i < data.length; i++)
                        this._processSerialization(data[i]);
                };
                // The extension should be called when loading a new scene in the editor
                DynamicTextureBuilderExtension.prototype.onLoad = function (data) {
                    this.apply(data);
                };
                // Processes the serialization
                DynamicTextureBuilderExtension.prototype._processSerialization = function (data) {
                    data.materials = [];
                    for (var i = 0; i < this._scene.materials.length; i++) {
                        var material = this._scene.materials[i];
                        for (var thing in material) {
                            var value = material[thing];
                            if (value instanceof BABYLON.DynamicTexture && value.name === data.name) {
                                data.materials.push({
                                    materialName: material.name,
                                    propertyName: thing
                                });
                            }
                        }
                    }
                };
                /**
                 * Statics
                 */
                // Creates and setups the texture
                DynamicTextureBuilderExtension.SetupDynamicTexture = function (data, scene) {
                    var texture = new BABYLON.DynamicTexture(data.name, { width: data.width, height: data.height }, scene, false);
                    texture.clear();
                    texture.drawText(data.text, data.textx, data.texty, data.textFont, data.textColor, data.clearColor);
                    texture.update(true);
                    texture.hasAlpha = data.hasAlpha;
                    return texture;
                };
                return DynamicTextureBuilderExtension;
            }());
            EXTENSIONS.DynamicTextureBuilderExtension = DynamicTextureBuilderExtension;
            EXTENSIONS.EditorExtension.RegisterExtension(DynamicTextureBuilderExtension);
        })(EXTENSIONS = EDITOR.EXTENSIONS || (EDITOR.EXTENSIONS = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.dynamicTextureExtension.js.map