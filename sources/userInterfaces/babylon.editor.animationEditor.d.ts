declare module BABYLON.EDITOR {
    class GUIAnimationEditor implements IEventReceiver {
        core: EditorCore;
        object: IAnimatable;
        private _animationsList;
        private _keysList;
        private _valuesForm;
        private _currentAnimation;
        private _currentKey;
        private _addAnimationWindow;
        private _addAnimationLayout;
        private _addAnimationGraph;
        private _addAnimationForm;
        private _addAnimationName;
        private _addAnimationFramesPerSecond;
        private _addAnimationType;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore, object: Node);
        onEvent(event: Event): boolean;
        private _createAnimation();
        private _setRecords(frame, value);
        private _setFrameValue();
        private _getFrameValue();
        private _createUI();
    }
}
