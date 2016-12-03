var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ManipulationHelper = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function ManipulationHelper(core) {
                var _this = this;
                this._currentNode = null;
                this._cameraAttached = true;
                this._actionStack = [];
                this._enabled = false;
                // Initialize
                this._core = core;
                core.eventReceivers.push(this);
                core.updates.push(this);
                // Create scene
                this._scene = new BABYLON.Scene(core.engine);
                this._scene.autoClear = false;
                this._scene.postProcessesEnabled = false;
                // Events
                this._pointerObserver = this._scene.onPointerObservable.add(function (p, s) { return _this._pointerCallback(p, s); }, -1, true);
                // Manipulator
                this._manipulator = new ManipulationHelpers.ManipulatorInteractionHelper(this._scene);
                this._manipulator.detachManipulatedNode(null);
                this.enabled = this._enabled;
            }
            // On event
            ManipulationHelper.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.SCENE_EVENT && event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_PICKED) {
                    var object = event.sceneEvent.object;
                    if (!(object instanceof BABYLON.Node))
                        object = null;
                    this.setNode(object);
                }
                return false;
            };
            // On pre update
            ManipulationHelper.prototype.onPreUpdate = function () {
                // Update camera
                this._scene.activeCamera = this._core.currentScene.activeCamera;
            };
            // On post update
            ManipulationHelper.prototype.onPostUpdate = function () { };
            // Get internal scene
            ManipulationHelper.prototype.getScene = function () {
                return this._scene;
            };
            Object.defineProperty(ManipulationHelper.prototype, "enabled", {
                // Returns if the manipulators are enabled
                get: function () {
                    return this._enabled;
                },
                // Sets if the manipulators are enabled
                set: function (enabled) {
                    this._enabled = enabled;
                    if (!enabled) {
                        this.setNode(null);
                    }
                    else if (this._currentNode) {
                        this._manipulator.attachManipulatedNode(this._currentNode);
                    }
                },
                enumerable: true,
                configurable: true
            });
            // Sets the node to manupulate
            ManipulationHelper.prototype.setNode = function (node) {
                if (this._currentNode)
                    this._manipulator.detachManipulatedNode(this._currentNode);
                if (node && this._enabled)
                    this._manipulator.attachManipulatedNode(node);
                this._currentNode = node;
            };
            // Pointer event callback
            ManipulationHelper.prototype._pointerCallback = function (pointer, event) {
                this._detectActionChanged(pointer, event);
                switch (this._getCurrentAction()) {
                    case 1 /* Selector */:
                        //event.skipNextObservers = true;
                        break;
                    case 2 /* Camerator */:
                        if (pointer.type & (BABYLON.PointerEventTypes.POINTERUP | BABYLON.PointerEventTypes.POINTERWHEEL)) {
                            this._actionStack.pop();
                        }
                        break;
                }
            };
            // Detect action changed
            ManipulationHelper.prototype._detectActionChanged = function (p, s) {
                // Detect switch from selection to camerator
                if (this._getCurrentAction() === 1 /* Selector */) {
                    if (p.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                        if (!p.pickInfo.hit)
                            this._actionStack.push(2 /* Camerator */);
                    }
                    else if (p.type === BABYLON.PointerEventTypes.POINTERWHEEL) {
                        this._actionStack.push(2 /* Camerator */);
                    }
                }
            };
            // Returns the current action
            ManipulationHelper.prototype._getCurrentAction = function () {
                if (this._actionStack.length === 0) {
                    return 1 /* Selector */;
                }
                return this._actionStack[this._actionStack.length - 1];
            };
            return ManipulationHelper;
        }());
        EDITOR.ManipulationHelper = ManipulationHelper;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.manipulationHelpers.js.map
