var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneManager = (function () {
            function SceneManager() {
                // Public members
                this.engine = null;
                this.canvas = null;
                this.scenes = new Array();
                this.updates = new Array();
                this.eventReceivers = new Array();
                this.editor = null;
            }
            SceneManager.configureMesh = function (mesh, core) {
                var scene = mesh.getScene();
                if (!mesh.actionManager) {
                    mesh.actionManager = new BABYLON.ActionManager(scene);
                }
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
                    }
                }));
            };
            return SceneManager;
        })();
        EDITOR.SceneManager = SceneManager;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
