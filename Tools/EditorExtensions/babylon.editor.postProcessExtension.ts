module BABYLON.EDITOR.EXTENSIONS {
    export interface IPostProcessExtensionData {
        id: string;
        name: string;
        program: string;
        configuration: string;
        postProcess?: PostProcess;
    }

    export interface IPostProcessExtensionConfiguration {
        ratio: number;
        defines: string[];
    }

    Effect.ShadersStore["editorTemplatePixelShader"] = [
        "varying vec2 vUV;",
        "uniform sampler2D textureSampler;",
        "uniform sampler2D originalSampler;",
        "void main(void) ",
        "{",
        "    gl_FragColor=texture2D(originalSampler, vUV);",
        "}"
    ].join("\n");

    export class PostProcessBuilderExtension implements IEditorExtension<IPostProcessExtensionData[]> {
        // IEditorExtension members
        extensionKey: string = "PostProcessBuilder";
        applyEvenIfDataIsNull: boolean = false;

        // Public members
        public placeHolderTexture: Texture = null;

        // Private members
        private _scene: Scene;
        private _scenePassPostProcess: PostProcess = null;

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(scene: Scene) {
            // Initialize
            this._scene = scene;

            // Scene pass post-process
            var data: IPostProcessExtensionData = {
                name: "PassPostProcessExtension",
                id: "PostProcessEditorExtensionPassPostProcess",
                program: Effect.ShadersStore["editorTemplatePixelShader"],
                configuration: JSON.stringify(<IPostProcessExtensionConfiguration>{ ratio: 1.0, defines: [] })
            };

            this.applyPostProcess(data);
            this._scenePassPostProcess = data.postProcess;
        }

        // Applies the extension
        public apply(data: IPostProcessExtensionData[]): void {
            for (var i = 0; i < data.length; i++)
                this.applyPostProcess(data[i]);
        }

        // Removes a post-process from the scene
        public removePostProcess(postProcess: PostProcess): void {
            for (var i = 0; i < this._scene.cameras.length; i++)
                this._scene.cameras[i].detachPostProcess(postProcess);

            postProcess.dispose();
        }

        // When the user applies the post-process chain
        public applyPostProcess(data: IPostProcessExtensionData) {
            var id = data.name + "_" + data.id;
            Effect.ShadersStore[id + "PixelShader"] = data.program;

            var configuration = <IPostProcessExtensionConfiguration>JSON.parse(data.configuration);

            var defines: string[] = [];
            for (var i = 0; i < configuration.defines.length; i++) {
                defines.push("#define " + configuration.defines[i] + "\n");
            }

            data.postProcess = new PostProcess(id, id, ["screenSize"], ["originalSampler"], configuration.ratio, null, Texture.BILINEAR_SAMPLINGMODE, this._scene.getEngine(), false, defines.join());
            data.postProcess.onApply = this._postProcessCallback(data.postProcess);

            for (var i = 0; i < this._scene.cameras.length; i++)
                this._scene.cameras[i].attachPostProcess(data.postProcess);
        }

        // Callback post-process
        private _postProcessCallback(postProcess: PostProcess): (effect: Effect) => void {
            var screenSize = Vector2.Zero();

            return (effect: Effect) => {
                if (this.placeHolderTexture)
                    effect.setTexture("originalSampler", this.placeHolderTexture);
                else
                    effect.setTextureFromPostProcess("originalSampler", this._scenePassPostProcess);

                screenSize.x = postProcess.width;
                screenSize.y = postProcess.height;
                effect.setVector2("screenSize", screenSize);
            };
        }
    }

    EXTENSIONS.EditorExtension.RegisterExtension(PostProcessBuilderExtension);
}