declare module BABYLON.EDITOR {
    class ManipulationHelper implements IEventReceiver, ICustomUpdate {
        private _core;
        private _scene;
        private _currentNode;
        private _cameraAttached;
        private _pointerObserver;
        private _actionStack;
        private _manipulator;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onEvent(event: Event): boolean;
        onPreUpdate(): void;
        onPostUpdate(): void;
        getScene(): Scene;
        setNode(node: Node): void;
        private _pointerCallback(pointer, event);
        private _detectActionChanged(p, s);
        private _getCurrentAction();
    }
}
