var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneManager = (function () {
            function SceneManager() {
            }
            // Reset configured objects
            SceneManager.ResetConfiguredObjects = function () {
                this._ConfiguredObjectsIDs = {};
            };
            // Switch action manager (editor and scene itself)
            SceneManager.SwitchActionManager = function () {
                var actionManager = this._SceneConfiguration.actionManager;
                this._SceneConfiguration.actionManager = this._SceneConfiguration.scene.actionManager;
                this._SceneConfiguration.scene.actionManager = actionManager;
                // Meshes configuration
                for (var thing in this._ConfiguredObjectsIDs) {
                    var obj = this._ConfiguredObjectsIDs[thing];
                    actionManager = obj.mesh.actionManager;
                    obj.mesh.actionManager = obj.actionManager;
                    obj.actionManager = actionManager;
                }
            };
            // Configures and object
            SceneManager.ConfigureObject = function (object, core, parentNode, sendEventSelected) {
                if (sendEventSelected === void 0) { sendEventSelected = true; }
                if (object instanceof BABYLON.AbstractMesh) {
                    var mesh = object;
                    var scene = mesh.getScene();
                    /*
                    if (this._alreadyConfiguredObjectsIDs[mesh.id])
                        return;
                    */
                    if (mesh instanceof BABYLON.Mesh && !mesh.geometry)
                        return;
                    this._ConfiguredObjectsIDs[mesh.id] = {
                        mesh: mesh,
                        actionManager: mesh.actionManager
                    };
                    // Configure mesh
                    mesh.actionManager = new BABYLON.ActionManager(scene);
                    mesh.isPickable = true;
                    // Pointer over / out
                    mesh.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, mesh, "showBoundingBox", true));
                    mesh.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, mesh, "showBoundingBox", false));
                    // Pointer click
                    var mouseX = scene.pointerX;
                    var mouseY = scene.pointerY;
                    mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, function (evt) {
                        mouseX = scene.pointerX;
                        mouseY = scene.pointerY;
                    }));
                    mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickUpTrigger, function (evt) {
                        if (scene.pointerX === mouseX && scene.pointerY === mouseY) {
                            EDITOR.Event.sendSceneEvent(mesh, EDITOR.SceneEventType.OBJECT_PICKED, core);
                            core.editor.sceneGraphTool.sidebar.setSelected(mesh.id);
                        }
                    }));
                    if (parentNode && !mesh.parent) {
                        mesh.parent = parentNode;
                    }
                }
                if (sendEventSelected) {
                    // Send event configured
                    var ev = new EDITOR.Event();
                    ev.eventType = EDITOR.EventType.SCENE_EVENT;
                    ev.sceneEvent = new EDITOR.SceneEvent(object, BABYLON.EDITOR.SceneEventType.OBJECT_PICKED);
                    core.sendEvent(ev);
                }
            };
            // Save objects states
            SceneManager.SaveObjectStates = function (scene) {
                var _this = this;
                this._ObjectsStatesConfiguration = {};
                var recursivelySaveStates = function (object, statesObject) {
                    for (var thing in object) {
                        if (thing[0] == "_")
                            continue;
                        var value = object[thing];
                        if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
                            statesObject[thing] = value;
                        }
                        else if (value instanceof BABYLON.Vector2 || value instanceof BABYLON.Vector3 || value instanceof BABYLON.Vector4) {
                            statesObject[thing] = value;
                        }
                        else if (value instanceof BABYLON.Color3 || value instanceof BABYLON.Color4) {
                            statesObject[thing] = value;
                        }
                        else if (value instanceof BABYLON.Material) {
                            statesObject[thing] = {};
                            recursivelySaveStates(value, statesObject[thing]);
                        }
                    }
                };
                var saveObjects = function (objects) {
                    for (var i = 0; i < objects.length; i++) {
                        var id = "Scene";
                        if (!(objects[i] instanceof BABYLON.Scene))
                            id = objects[i].id;
                        _this._ObjectsStatesConfiguration[id] = {};
                        recursivelySaveStates(objects[i], _this._ObjectsStatesConfiguration[id]);
                    }
                };
                saveObjects(scene.meshes);
                saveObjects(scene.cameras);
                saveObjects(scene.lights);
                saveObjects([scene]);
            };
            // Restore object states
            SceneManager.RestoreObjectsStates = function (scene) {
                var _this = this;
                var recursivelyRestoreStates = function (object, statesObject) {
                    for (var thing in statesObject) {
                        var value = statesObject[thing];
                        if (thing === "material") {
                            recursivelyRestoreStates(object[thing], statesObject[thing]);
                        }
                        else {
                            object[thing] = statesObject[thing];
                        }
                    }
                };
                var restoreObjects = function (objects) {
                    for (var i = 0; i < objects.length; i++) {
                        var id = "Scene";
                        if (!(objects[i] instanceof BABYLON.Scene))
                            id = objects[i].id;
                        var statesObject = _this._ObjectsStatesConfiguration[id];
                        if (statesObject)
                            recursivelyRestoreStates(objects[i], statesObject);
                    }
                };
                restoreObjects(scene.meshes);
                restoreObjects(scene.cameras);
                restoreObjects(scene.lights);
                restoreObjects([scene]);
            };
            // Adds a custom meta data
            SceneManager.AddCustomMetadata = function (key, data) {
                this._CustomMetadatas[key] = data;
            };
            // Removes a custom meta data
            SceneManager.RemoveCustomMetadata = function (key) {
                if (!this._CustomMetadatas[key])
                    return false;
                delete this._CustomMetadatas[key];
                return true;
            };
            // Returns the custom metadata
            SceneManager.GetCustomMetadata = function (key) {
                if (!this._CustomMetadatas[key])
                    return null;
                return this._CustomMetadatas[key];
            };
            // Public members
            /**
            * Objects configuration
            */
            SceneManager._ConfiguredObjectsIDs = {};
            /**
            * Custom meta datas
            */
            SceneManager._CustomMetadatas = {};
            return SceneManager;
        }());
        EDITOR.SceneManager = SceneManager;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.sceneManager.js.map
