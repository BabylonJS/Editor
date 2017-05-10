var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            BABYLON.Effect.ShadersStore["editorTemplatePixelShader"] = [
                "varying vec2 vUV;",
                "uniform sampler2D textureSampler; // Previous post-process",
                "uniform sampler2D originalSampler; // Original scene color",
                "",
                "// uniform sampler2D mySampler; // From JSON configuration",
                "",
                "uniform vec2 screenSize; // Automatic",
                "uniform float exposure; // From JSON configuration",
                "",
                "void main(void) ",
                "{",
                "    gl_FragColor=texture2D(originalSampler, vUV) * exposure;",
                "}"
            ].join("\n");
            var PostProcessBuilderExtension = (function () {
                /**
                * Constructor
                * @param scene: the babylon.js scene
                */
                function PostProcessBuilderExtension(scene) {
                    // IEditorExtension members
                    this.extensionKey = "PostProcessBuilder";
                    this.applyEvenIfDataIsNull = false;
                    // Public members
                    this.placeHolderTexture = null;
                    this._scenePassPostProcess = null;
                    this._postProcesses = [];
                    this._scenePassData = null;
                    // Initialize
                    this._scene = scene;
                }
                // Applies the extension
                PostProcessBuilderExtension.prototype.apply = function (data) {
                    // Apply
                    for (var i = 0; i < data.length; i++)
                        this.applyPostProcess(data[i]);
                };
                // Removes a post-process from the scene
                PostProcessBuilderExtension.prototype.removePostProcess = function (postProcess) {
                    for (var i = 0; i < this._scene.cameras.length; i++)
                        this._scene.cameras[i].detachPostProcess(postProcess);
                    postProcess.dispose();
                    var index = this._postProcesses.lastIndexOf(postProcess);
                    if (index !== -1)
                        this._postProcesses.splice(index, 1);
                };
                // When the user applies the post-process chain
                PostProcessBuilderExtension.prototype.applyPostProcess = function (data) {
                    // Scene pass post-process
                    if (!this._scenePassData) {
                        this._scenePassData = {
                            name: "PassPostProcessExtension",
                            id: "PostProcessEditorExtensionPassPostProcess",
                            program: BABYLON.Effect.ShadersStore["editorTemplatePixelShader"],
                            configuration: JSON.stringify({ ratio: 1.0, defines: [], uniforms: [{ name: "exposure", value: 1.0 }], samplers: [] })
                        };
                        this.applyPostProcess(this._scenePassData);
                        this._scenePassPostProcess = this._scenePassData.postProcess;
                    }
                    // Apply post-process
                    var id = data.name + "_" + data.id;
                    BABYLON.Effect.ShadersStore[id + "PixelShader"] = data.program;
                    var uniforms = ["screenSize"];
                    var samplers = ["originalSampler"];
                    var config = JSON.parse(data.configuration);
                    config.ratio = config.ratio || 1.0;
                    config.defines = config.defines || [];
                    config.uniforms = config.uniforms || [];
                    config.samplers = config.samplers || [];
                    // Configure uniforms
                    for (var i = 0; i < config.uniforms.length; i++) {
                        var uniform = config.uniforms[i];
                        var value = config.uniforms[i].value;
                        if (!(value instanceof Array) && typeof value !== "number") {
                            BABYLON.Tools.Warn("PostProcessExtension -- Uniform named " + uniform.name + " has an unknown value type of post-process " + data.name);
                            config.uniforms.splice(i, 1);
                            i--;
                            continue;
                        }
                        uniforms.push(uniform.name);
                    }
                    // Configure samplers
                    for (var i = 0; i < config.samplers.length; i++) {
                        var sampler = config.samplers[i];
                        for (var j = 0; j < this._scene.textures.length; j++) {
                            if (this._scene.textures[j].name === sampler.source) {
                                sampler.object = this._scene.textures[j];
                                break;
                            }
                        }
                        for (var j = 0; j < this._postProcesses.length; j++) {
                            if (this._postProcesses[j].name === sampler.source) {
                                sampler.object = this._postProcesses[j];
                                break;
                            }
                        }
                        if (!sampler.object) {
                            BABYLON.Tools.Warn("PostProcessExtension -- Sampler named " + sampler.uniform + " hasn't been found in textures and post-processes in the post-process " + data.name);
                            config.samplers.splice(i, 1);
                            i--;
                        }
                        else
                            samplers.push(sampler.uniform);
                    }
                    // Defines
                    var defines = [];
                    for (var i = 0; i < config.defines.length; i++) {
                        defines.push("#define " + config.defines[i] + "\n");
                    }
                    // Create post-process
                    data.postProcess = new BABYLON.PostProcess(data.name, id, uniforms, samplers, config.ratio / devicePixelRatio, null, BABYLON.Texture.BILINEAR_SAMPLINGMODE, this._scene.getEngine(), false, defines.join());
                    data.postProcess.onApply = this._postProcessCallback(data.postProcess, config);
                    for (var i = 0; i < this._scene.cameras.length; i++)
                        this._scene.cameras[i].attachPostProcess(data.postProcess);
                    this._postProcesses.push(data.postProcess);
                };
                // Callback post-process
                PostProcessBuilderExtension.prototype._postProcessCallback = function (postProcess, config) {
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
                        // Set uniforms
                        for (var i = 0; i < config.uniforms.length; i++) {
                            var value = config.uniforms[i].value;
                            if (value instanceof Array)
                                effect.setArray(config.uniforms[i].name, value);
                            else
                                effect.setFloat(config.uniforms[i].name, value);
                        }
                        // Set samplers
                        for (var i = 0; i < config.samplers.length; i++) {
                            var object = config.samplers[i].object;
                            if (object instanceof BABYLON.BaseTexture)
                                effect.setTexture(config.samplers[i].uniform, object);
                            else
                                effect.setTextureFromPostProcess(config.samplers[i].uniform, object);
                        }
                    };
                };
                return PostProcessBuilderExtension;
            }());
            EXTENSIONS.PostProcessBuilderExtension = PostProcessBuilderExtension;
            EXTENSIONS.EditorExtension.RegisterExtension(PostProcessBuilderExtension);
        })(EXTENSIONS = EDITOR.EXTENSIONS || (EDITOR.EXTENSIONS = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.postProcessExtension.js.map