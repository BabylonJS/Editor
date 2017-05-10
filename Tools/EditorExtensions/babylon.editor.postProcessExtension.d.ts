declare module BABYLON.EDITOR.EXTENSIONS {
    interface IPostProcessExtensionData {
        id: string;
        name: string;
        program: string;
        configuration: string;
        postProcess?: PostProcess;
    }
    class PostProcessBuilderExtension implements IEditorExtension<IPostProcessExtensionData[]> {
        extensionKey: string;
        applyEvenIfDataIsNull: boolean;
        placeHolderTexture: Texture;
        private _scene;
        private _scenePassPostProcess;
        private _postProcesses;
        private _scenePassData;
        /**
        * Constructor
        * @param scene: the babylon.js scene
        */
        constructor(scene: Scene);
        apply(data: IPostProcessExtensionData[]): void;
        removePostProcess(postProcess: PostProcess): void;
        applyPostProcess(data: IPostProcessExtensionData): void;
        private _postProcessCallback(postProcess, config);
    }
}
