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
        private _addAnimationType;
        private _addAnimationTypeName;
        private _editedAnimation;
        private _graphPaper;
        private _graphLines;
        private _graphValueTexts;
        private _graphMiddleLine;
        private _graphTimeLines;
        private _graphTimeTexts;
        static FramesPerSecond: number;
        private static _CopiedAnimations;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore, object: Node);
        onEvent(event: Event): boolean;
        private _createAnimation();
        _getEffectiveTarget(value?: any): any;
        private _getFrameTime(frame);
        private _setRecords(frame, value);
        private _setFrameValue();
        private _getFrameValue();
        private _configureGraph();
        private _onSelectedAnimation();
        private _onAddAnimation();
        private _onModifyKey();
        private _onAnimationMenuSelected(id);
        private _onDeleteAnimations();
        private _onKeySelected();
        private _onAddKey();
        private _onRemoveKeys();
        private _createUI();
        static GetEndFrameOfObject(object: IAnimatable): number;
        static GetSceneFrameCount(scene: Scene): number;
        static SetCurrentFrame(core: EditorCore, objs: IAnimatable[], frame: number): void;
    }
}
