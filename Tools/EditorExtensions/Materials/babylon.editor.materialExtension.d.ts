declare module BABYLON.EDITOR.EXTENSIONS {
    interface IMaterialExtensionData {
        name: string;
        config: string;
        vertex: string;
        pixel: string;
        object?: IMaterialBuilderSettings;
    }
    class MaterialBuilderExtension implements IEditorExtension<IMaterialExtensionData[]> {
        extensionKey: string;
        applyEvenIfDataIsNull: boolean;
        removeOnApply: boolean;
        private _scene;
        private _materials;
        /**
        * Constructor
        * @param scene: the babylon.js scene
        */
        constructor(scene: Scene, removeOnApply?: boolean);
        onSerialize(data: IMaterialExtensionData[]): void;
        apply(data: IMaterialExtensionData[]): void;
        private _getTexture(name);
    }
}
