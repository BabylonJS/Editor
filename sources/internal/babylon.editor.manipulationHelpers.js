var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ManipulationHelper = (function () {
            function ManipulationHelper(core) {
                var _this = this;
                this._currentNode = null;
                this._cameraAttached = true;
                this._actionStack = [];
                this._enabled = false;
                this._core = core;
                core.eventReceivers.push(this);
                core.updates.push(this);
                this._scene = new BABYLON.Scene(core.engine);
                this._scene.autoClear = false;
                this._scene.postProcessesEnabled = false;
                this._pointerObserver = this._scene.onPointerObservable.add(function (p, s) { return _this._pointerCallback(p, s); }, -1, true);
                this._manipulator = new ManipulationHelpers.ManipulatorInteractionHelper(this._scene);
                this._manipulator.detachManipulatedNode(null);
                this.enabled = this._enabled;
            }
            ManipulationHelper.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.SCENE_EVENT && event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_PICKED) {
                    var object = event.sceneEvent.object;
                    if (!(object instanceof BABYLON.Node))
                        object = null;
                    this.setNode(object);
                }
                return false;
            };
            ManipulationHelper.prototype.onPreUpdate = function () {
                this._scene.activeCamera = this._core.currentScene.activeCamera;
            };
            ManipulationHelper.prototype.onPostUpdate = function () { };
            ManipulationHelper.prototype.getScene = function () {
                return this._scene;
            };
            Object.defineProperty(ManipulationHelper.prototype, "enabled", {
                get: function () {
                    return this._enabled;
                },
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
            ManipulationHelper.prototype.setNode = function (node) {
                if (this._currentNode)
                    this._manipulator.detachManipulatedNode(this._currentNode);
                if (node && this._enabled)
                    this._manipulator.attachManipulatedNode(node);
                this._currentNode = node;
            };
            ManipulationHelper.prototype._pointerCallback = function (pointer, event) {
                this._detectActionChanged(pointer, event);
                switch (this._getCurrentAction()) {
                    case 1:
                        break;
                    case 2:
                        if (pointer.type & (BABYLON.PointerEventTypes.POINTERUP | BABYLON.PointerEventTypes.POINTERWHEEL)) {
                            this._actionStack.pop();
                        }
                        break;
                }
            };
            ManipulationHelper.prototype._detectActionChanged = function (p, s) {
                if (this._getCurrentAction() === 1) {
                    if (p.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                        if (!p.pickInfo.hit)
                            this._actionStack.push(2);
                    }
                    else if (p.type === BABYLON.PointerEventTypes.POINTERWHEEL) {
                        this._actionStack.push(2);
                    }
                }
            };
            ManipulationHelper.prototype._getCurrentAction = function () {
                if (this._actionStack.length === 0) {
                    return 1;
                }
                return this._actionStack[this._actionStack.length - 1];
            };
            return ManipulationHelper;
        }());
        EDITOR.ManipulationHelper = ManipulationHelper;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
