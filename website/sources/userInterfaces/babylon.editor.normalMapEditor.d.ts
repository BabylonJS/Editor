declare module BABYLON.EDITOR {
    class NormalMapEditor {
        onApply: (texture: Texture) => void;
        constructor(core: EditorCore, baseTexture: Texture);
        private _buildViewport(canvas);
        private _getTexture(scene, texture);
        private _apply(scene, texture);
    }
}
