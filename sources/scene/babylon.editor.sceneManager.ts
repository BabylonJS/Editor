module BABYLON.EDITOR {
    export class SceneManager {
        // Public members

        /**
        * Objects configuration
        */
        private static _alreadyConfiguredObjectsIDs: Object = { };

        // Configures and object
        static configureObject(object: AbstractMesh | Scene, core: EditorCore, parentNode?: Node): void {
            if (object instanceof AbstractMesh) {
                var mesh: AbstractMesh = object;
                var scene = mesh.getScene();

                if (this._alreadyConfiguredObjectsIDs[mesh.id])
                    return;

                if (mesh instanceof Mesh && !mesh.geometry)
                    return;

                if (!mesh.actionManager) {
                    mesh.actionManager = new ActionManager(scene);
                }

                // Configure mesh
                mesh.isPickable = true;

                // Pointer over / out
                mesh.actionManager.registerAction(new SetValueAction(ActionManager.OnPointerOverTrigger, mesh, "showBoundingBox", true));
                mesh.actionManager.registerAction(new SetValueAction(ActionManager.OnPointerOutTrigger, mesh, "showBoundingBox", false));

                // Pointer click
                var mouseX = scene.pointerX;
                var mouseY = scene.pointerY;

                mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, (evt: ActionEvent) => {
                    mouseX = scene.pointerX;
                    mouseY = scene.pointerY;
                }));

                mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickUpTrigger, (evt: ActionEvent) => {
                    if (scene.pointerX === mouseX && scene.pointerY === mouseY) {
                        Event.sendSceneEvent(mesh, SceneEventType.OBJECT_PICKED, core);
                        core.editor.sceneGraphTool.sidebar.setSelected(mesh.id);
                    }
                }));

                if (parentNode && !mesh.parent) {
                    mesh.parent = parentNode;
                }

                // Finish
                this._alreadyConfiguredObjectsIDs[mesh.id] = mesh;
            }

            // Send event configured
            var ev = new Event();
            ev.eventType = EventType.SCENE_EVENT;
            ev.sceneEvent = new SceneEvent(object, BABYLON.EDITOR.SceneEventType.OBJECT_PICKED);
            core.sendEvent(ev);
        }
    }
}