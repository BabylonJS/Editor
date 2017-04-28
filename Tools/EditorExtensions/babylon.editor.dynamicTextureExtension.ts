module BABYLON.EDITOR.EXTENSIONS {
    export interface IDynamicTextureExtension {
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

        textureObject?: DynamicTexture;
    }

    export class DynamicTextureBuilderExtension implements IEditorExtension<IDynamicTextureExtension[]> {
        // IEditorExtension members
        public extensionKey: string = "SoftBodyBuilder";
        public applyEvenIfDataIsNull: boolean = false;

        // Private members
        private _scene: Scene;

        /**
        * Constructor
        * @param scene: the babylon.js scene
        */
        constructor(scene: Scene) {
            // Initialize
            this._scene = scene;
        }

        public apply(data: IDynamicTextureExtension[]): void {

        }
    }
}
