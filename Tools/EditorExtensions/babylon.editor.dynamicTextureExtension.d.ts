declare module BABYLON.EDITOR.EXTENSIONS {
    interface IDynamicMaterialTexture {
        materialName: string;
        propertyName: string;
    }
    interface IDynamicTextureExtension {
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
    class DynamicTextureBuilderExtension implements IEditorExtension<IDynamicTextureExtension[]> {
        extensionKey: string;
        applyEvenIfDataIsNull: boolean;
        private _scene;
        /**
        * Constructor
        * @param scene: the babylon.js scene
        */
        constructor(scene: Scene);
        apply(data: IDynamicTextureExtension[]): void;
        onSerialize?(data: IDynamicTextureExtension[]): void;
        onLoad(data: IDynamicTextureExtension[]): void;
        private _processSerialization(data);
        /**
         * Statics
         */
        static SetupDynamicTexture(data: IDynamicTextureExtension, scene: Scene): DynamicTexture;
    }
}
