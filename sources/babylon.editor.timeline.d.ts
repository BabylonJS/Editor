declare module BABYLON.EDITOR {
    class Timeline implements IEventReceiver, ICustomUpdate, IAnimatable {
        container: string;
        animations: Animation[];
        private _core;
        private _panel;
        private _paper;
        private _rect;
        private _selectorRect;
        private _animatedRect;
        private _overlay;
        private _overlayText;
        private _overlayObj;
        private _mousex;
        private _mousey;
        private _isOver;
        private _maxFrame;
        private _currentTime;
        private _frameRects;
        private _frameTexts;
        private _frameAnimation;
        private _currentAnimationFrame;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onEvent(event: Event): boolean;
        onPreUpdate(): void;
        onPostUpdate(): void;
        play(): void;
        stop(): void;
        currentTime: number;
        reset(): void;
        setFramesOfAnimation(animation: Animation): void;
        createUI(): void;
        private _updateTimeline();
        private _getFrame(pos?);
        private _getPosition(frame);
    }
}
