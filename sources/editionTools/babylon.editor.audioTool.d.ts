declare module BABYLON.EDITOR {
    class AudioTool extends AbstractDatTool {
        tab: string;
        private _volume;
        private _playbackRate;
        private _position;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _positionCallback(sound);
        private _pauseSound();
        private _playSound();
        private _stopSound();
    }
}
