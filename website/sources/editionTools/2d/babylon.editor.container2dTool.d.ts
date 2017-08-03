declare module BABYLON.EDITOR {
    class Container2DTool extends AbstractDatTool {
        object: Container2D;
        tab: string;
        private _currentDockX;
        private _currentDockY;
        private _resizeType;
        private _currentTexture;
        private _clipPlayDelay;
        private _clipCount;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _playClip();
        private _pauseClip();
        private _stopClip();
        private _postClipAnimation();
    }
}
