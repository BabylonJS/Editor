module BABYLON.EDITOR {
    const enum SIHCurrentAction {
        None = 0,
        Selector = 1,
        Camerator = 2
    }

    export class ManipulationHelper implements IEventReceiver, ICustomUpdate {
        // Public members

        // Private members
        private _core: EditorCore;

        private _scene: Scene;
        private _currentNode: Node = null;
        private _cameraAttached: boolean = true;

        private _pointerObserver: Observer<PointerInfo>;
        private _actionStack: SIHCurrentAction[] = [];
        private _manipulator: ManipulationHelpers.ManipulatorInteractionHelper;

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this._core = core;
            core.eventReceivers.push(this);
            core.updates.push(this);

            // Create scene
            this._scene = new Scene(core.engine);
            this._scene.autoClear = false;
            this._scene.postProcessesEnabled = false;

            // Events
            this._pointerObserver = this._scene.onPointerObservable.add((p, s) => this._pointerCallback(p, s), -1, true);

            // Manipulator
            this._manipulator = new ManipulationHelpers.ManipulatorInteractionHelper(this._scene);
        }

        // On event
        public onEvent(event: Event): boolean {
            if (event.eventType === EventType.SCENE_EVENT && event.sceneEvent.eventType === SceneEventType.OBJECT_PICKED) {
                var object = event.sceneEvent.object;

                //if (object && object.position || object.rotation || object.rotationQuaternion || object.scaling)
                    this.setNode(object);
            }

            return false;
        }

        // On pre update
        public onPreUpdate(): void {
            // Update camera
            this._scene.activeCamera = this._core.currentScene.activeCamera;
        }

        // On post update
        public onPostUpdate(): void
        { }

        // Get internal scene
        public getScene(): Scene {
            return this._scene;
        }

        // Sets the node to manupulate
        public setNode(node: Node) {
            if (this._currentNode)
                this._manipulator.detachManipulatedNode(this._currentNode);

            if (node)
                this._manipulator.attachManipulatedNode(node);

            this._currentNode = node;
        }

        // Pointer event callback
        private _pointerCallback(pointer: PointerInfo, event: EventState): void {
            this._detectActionChanged(pointer, event);

            switch (this._getCurrentAction()) {
                case SIHCurrentAction.Selector:
                    event.skipNextObservers = true;
                    break;
                case SIHCurrentAction.Camerator:
                    if (pointer.type & (PointerEventTypes.POINTERUP | PointerEventTypes.POINTERWHEEL)) {
                        this._actionStack.pop();
                    }
                    break;
            }
        }

        // Detect action changed
        private _detectActionChanged(p: PointerInfo, s: EventState) {
            // Detect switch from selection to camerator
            if (this._getCurrentAction() === SIHCurrentAction.Selector) {
                if (p.type === PointerEventTypes.POINTERDOWN) {
                    if (!p.pickInfo.hit)
                        this._actionStack.push(SIHCurrentAction.Camerator);
                }
                else if (p.type === PointerEventTypes.POINTERWHEEL) {
                    this._actionStack.push(SIHCurrentAction.Camerator);
                }
            }
        }

        // Returns the current action
        private _getCurrentAction(): SIHCurrentAction {
            if (this._actionStack.length === 0) {
                return SIHCurrentAction.Selector;
            }

            return this._actionStack[this._actionStack.length - 1];
        }
    }
}