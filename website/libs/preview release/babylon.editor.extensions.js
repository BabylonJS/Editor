var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            var EditorExtension = (function () {
                function EditorExtension() {
                }
                // Loads the extensions file and parses it
                EditorExtension.LoadExtensionsFile = function (url, callback) {
                    BABYLON.Tools.LoadFile(url, function (data) {
                        EditorExtension._ExtensionsDatas = JSON.parse(data);
                        callback();
                    });
                };
                // Returns the wanted extension of type T
                EditorExtension.GetExtensionData = function (key) {
                    if (!EditorExtension._ExtensionsDatas[key])
                        return null;
                    return EditorExtension._ExtensionsDatas[key];
                };
                // Applies all the extensions
                EditorExtension.ApplyExtensions = function (scene) {
                    for (var i = 0; i < EditorExtension._Extensions.length; i++) {
                        var extension = new EditorExtension._Extensions[i](scene);
                        var data = EditorExtension.GetExtensionData(extension.extensionKey);
                        if (data || (!data && extension.applyEvenIfDataIsNull))
                            extension.apply(data);
                    }
                };
                // Registers extension
                EditorExtension.RegisterExtension = function (extension) {
                    EditorExtension._Extensions.push(extension);
                };
                // The extensions plugins
                EditorExtension._Extensions = [];
                return EditorExtension;
            }());
            EXTENSIONS.EditorExtension = EditorExtension;
        })(EXTENSIONS = EDITOR.EXTENSIONS || (EDITOR.EXTENSIONS = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            BABYLON.Effect.ShadersStore["editorTemplatePixelShader"] = [
                "varying vec2 vUV;",
                "uniform sampler2D textureSampler;",
                "uniform sampler2D originalSampler;",
                "void main(void) ",
                "{",
                "    gl_FragColor=texture2D(originalSampler, vUV);",
                "}"
            ].join("\n");
            var PostProcessBuilderExtension = (function () {
                /**
                * Constructor
                * @param core: the editor core
                */
                function PostProcessBuilderExtension(scene) {
                    // IEditorExtension members
                    this.extensionKey = "PostProcessBuilder";
                    this.applyEvenIfDataIsNull = false;
                    // Public members
                    this.placeHolderTexture = null;
                    this._scenePassPostProcess = null;
                    // Initialize
                    this._scene = scene;
                    // Scene pass post-process
                    var data = {
                        name: "PassPostProcessExtension",
                        id: "PostProcessEditorExtensionPassPostProcess",
                        program: BABYLON.Effect.ShadersStore["editorTemplatePixelShader"],
                        configuration: JSON.stringify({ ratio: 1.0, defines: [] })
                    };
                    this.applyPostProcess(data);
                    this._scenePassPostProcess = data.postProcess;
                }
                // Applies the extension
                PostProcessBuilderExtension.prototype.apply = function (data) {
                    for (var i = 0; i < data.length; i++)
                        this.applyPostProcess(data[i]);
                };
                // Removes a post-process from the scene
                PostProcessBuilderExtension.prototype.removePostProcess = function (postProcess) {
                    for (var i = 0; i < this._scene.cameras.length; i++)
                        this._scene.cameras[i].detachPostProcess(postProcess);
                    postProcess.dispose();
                };
                // When the user applies the post-process chain
                PostProcessBuilderExtension.prototype.applyPostProcess = function (data) {
                    var id = data.name + "_" + data.id;
                    BABYLON.Effect.ShadersStore[id + "PixelShader"] = data.program;
                    var configuration = JSON.parse(data.configuration);
                    var defines = [];
                    for (var i = 0; i < configuration.defines.length; i++) {
                        defines.push("#define " + configuration.defines[i] + "\n");
                    }
                    data.postProcess = new BABYLON.PostProcess(id, id, ["screenSize"], ["originalSampler"], configuration.ratio, null, BABYLON.Texture.BILINEAR_SAMPLINGMODE, this._scene.getEngine(), false, defines.join());
                    data.postProcess.onApply = this._postProcessCallback(data.postProcess);
                    for (var i = 0; i < this._scene.cameras.length; i++)
                        this._scene.cameras[i].attachPostProcess(data.postProcess);
                };
                // Callback post-process
                PostProcessBuilderExtension.prototype._postProcessCallback = function (postProcess) {
                    var _this = this;
                    var screenSize = BABYLON.Vector2.Zero();
                    return function (effect) {
                        if (_this.placeHolderTexture)
                            effect.setTexture("originalSampler", _this.placeHolderTexture);
                        else
                            effect.setTextureFromPostProcess("originalSampler", _this._scenePassPostProcess);
                        screenSize.x = postProcess.width;
                        screenSize.y = postProcess.height;
                        effect.setVector2("screenSize", screenSize);
                    };
                };
                return PostProcessBuilderExtension;
            }());
            EXTENSIONS.PostProcessBuilderExtension = PostProcessBuilderExtension;
            EXTENSIONS.EditorExtension.RegisterExtension(PostProcessBuilderExtension);
        })(EXTENSIONS = EDITOR.EXTENSIONS || (EDITOR.EXTENSIONS = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
