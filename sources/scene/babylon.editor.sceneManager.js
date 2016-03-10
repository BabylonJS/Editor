var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneManager = (function () {
            function SceneManager() {
            }
            // Reset configured objects
            SceneManager.ResetConfiguredObjects = function () {
                this._alreadyConfiguredObjectsIDs = {};
            };
            // Switch action manager (editor and scene itself)
            SceneManager.SwitchActionManager = function () {
                for (var thing in this._alreadyConfiguredObjectsIDs) {
                    var obj = this._alreadyConfiguredObjectsIDs[thing];
                    var actionManager = obj.mesh.actionManager;
                    obj.mesh.actionManager = obj.actionManager;
                    obj.actionManager = actionManager;
                }
            };
            // Configures and object
            SceneManager.ConfigureObject = function (object, core, parentNode) {
                if (object instanceof BABYLON.AbstractMesh) {
                    var mesh = object;
                    var scene = mesh.getScene();
                    /*
                    if (this._alreadyConfiguredObjectsIDs[mesh.id])
                        return;
                    */
                    if (mesh instanceof BABYLON.Mesh && !mesh.geometry)
                        return;
                    this._alreadyConfiguredObjectsIDs[mesh.id] = {
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
                            core.editor.sceneToolbar.setFocusOnObject(mesh);
                        }
                    }));
                    if (parentNode && !mesh.parent) {
                        mesh.parent = parentNode;
                    }
                }
                // Send event configured
                var ev = new EDITOR.Event();
                ev.eventType = EDITOR.EventType.SCENE_EVENT;
                ev.sceneEvent = new EDITOR.SceneEvent(object, BABYLON.EDITOR.SceneEventType.OBJECT_PICKED);
                core.sendEvent(ev);
            };
            // Public members
            /**
            * Objects configuration
            */
            SceneManager._alreadyConfiguredObjectsIDs = {};
            return SceneManager;
        })();
        EDITOR.SceneManager = SceneManager;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
