declare module BABYLON.EDITOR {
    class Timeline implements IEventReceiver, ICustomUpdate {
        container: string;
        canvasContainer: string;
        private _core;
        private _panel;
        private _paper;
        private _rect;
        private _selectorRect;
        private _mousex;
        private _mousey;
        private _isOver;
        private _maxFrame;
        private _currentTime;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onEvent(event: Event): boolean;
        onPreUpdate(): void;
        onPostUpdate(): void;
        currentTime: number;
        reset(): void;
        createUI(): void;
        private _getFrame();
    }
}
