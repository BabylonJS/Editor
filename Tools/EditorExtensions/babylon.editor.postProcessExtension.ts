module BABYLON.EDITOR.EXTENSIONS {
    export interface IPostProcessExtensionData {
        id: string;
        name: string;
        program: string;
        configuration: string;
        postProcess?: PostProcess;
        processedConfiguration?: IPostProcessExtensionConfiguration;
    }

    export interface IPostProcessExtensionSamplerDefinition {
        uniform: string;
        source: string;
        object?: PostProcess | BaseTexture;
    }

    export interface IPostPRocessExtensionUniformDefinition {
        name: string;
        value: number | number[];
    }

    export interface IPostProcessExtensionConfiguration {
        ratio: number;
        defines: string[];
        samplers: IPostProcessExtensionSamplerDefinition[];
        uniforms: IPostPRocessExtensionUniformDefinition[];
    }

    export interface IProcessedPostProcess {
        postProcess: PostProcess;
        config: IPostProcessExtensionConfiguration;
    }

    Effect.ShadersStore["editorTemplatePixelShader"] = [
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

    export class PostProcessBuilderExtension implements IEditorExtension<IPostProcessExtensionData[]> {
        // IEditorExtension members
        public extensionKey: string = "PostProcessBuilder";
        public applyEvenIfDataIsNull: boolean = false;

        // Public members
        public placeHolderTexture: Texture = null;

        // Private members
        private _scene: Scene;
        private _scenePassPostProcess: PostProcess = null;

        private _postProcesses: PostProcess[] = [];

        private _scenePassData: IPostProcessExtensionData = null;
        private _data: IPostProcessExtensionData[] = null;

        /**
        * Constructor
        * @param scene: the babylon.js scene
        */
        constructor(scene: Scene) {
            // Initialize
            this._scene = scene;
        }

        // Applies the extension
        public apply(data: IPostProcessExtensionData[]): void {
            this._data = data;

            // Apply
            for (var i = 0; i < data.length; i++)
                this.applyPostProcess(data[i]);
        }

        // Removes a post-process from the scene
        public removePostProcess(postProcess: PostProcess): void {
            for (var i = 0; i < this._scene.cameras.length; i++)
                this._scene.cameras[i].detachPostProcess(postProcess);

            postProcess.dispose();

            var index = this._postProcesses.lastIndexOf(postProcess);
            if (index !== - 1)
                this._postProcesses.splice(index, 1);
        }

        // When the user applies the post-process chain
        public applyPostProcess(data: IPostProcessExtensionData) {
            // Scene pass post-process
            if (!this._scenePassData) {
                this._scenePassData = {
                    name: "PassPostProcessExtension",
                    id: "PostProcessEditorExtensionPassPostProcess",
                    program: Effect.ShadersStore["editorTemplatePixelShader"],
                    configuration: JSON.stringify(<IPostProcessExtensionConfiguration>{ ratio: 1.0, defines: [], uniforms: [{ name: "exposure", value: 1.0 }], samplers: [] })
                };

                this.applyPostProcess(this._scenePassData);
                this._scenePassPostProcess = this._scenePassData.postProcess;
            }

            // Apply post-process
            var id = data.name + "_" + data.id;
            Effect.ShadersStore[id + "PixelShader"] = data.program;

            var uniforms = ["screenSize"];
            var samplers = ["originalSampler"];

            var config = <IPostProcessExtensionConfiguration>JSON.parse(data.configuration);
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
            var defines: string[] = [];
            for (var i = 0; i < config.defines.length; i++) {
                defines.push("#define " + config.defines[i] + "\n");
            }

            // Create post-process
            data.processedConfiguration = config;
            data.postProcess = new PostProcess(data.name, id, uniforms, samplers, config.ratio / devicePixelRatio, null, Texture.BILINEAR_SAMPLINGMODE, this._scene.getEngine(), false, defines.join());
            data.postProcess.onApply = this._postProcessCallback(data.postProcess, config);

            for (var i = 0; i < this._scene.cameras.length; i++)
                this._scene.cameras[i].attachPostProcess(data.postProcess);

            this._postProcesses.push(data.postProcess);
        }

        // Returns a postprocess
        public getPostProcess(name: string): IProcessedPostProcess {
            for (var i = 0; i < this._data.length; i++) {
                var pp = this._data[i];

                if (pp.name === name) {
                    return {
                        postProcess: pp.postProcess,
                        config: pp.processedConfiguration
                    }
                }
            }

            return null;
        }

        // Callback post-process
        private _postProcessCallback(postProcess: PostProcess, config: IPostProcessExtensionConfiguration): (effect: Effect) => void {
            var screenSize = Vector2.Zero();

            return (effect: Effect) => {
                if (this.placeHolderTexture)
                    effect.setTexture("originalSampler", this.placeHolderTexture);
                else
                    effect.setTextureFromPostProcess("originalSampler", this._scenePassPostProcess);

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

                    if (object instanceof BaseTexture)
                        effect.setTexture(config.samplers[i].uniform, object);
                    else
                        effect.setTextureFromPostProcess(config.samplers[i].uniform, object);
                }
            };
        }
    }

    EditorExtension.RegisterExtension(PostProcessBuilderExtension);
}