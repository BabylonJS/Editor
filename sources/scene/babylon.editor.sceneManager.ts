module BABYLON.EDITOR {
    export class SceneManager {
        // Public members
        public engine: Engine = null;
        public canvas: HTMLCanvasElement = null;

        public scenes: Array<ICustomScene> = new Array<ICustomScene>();
        public currentScene: Scene;

        public updates: Array<ICustomUpdate> = new Array<ICustomUpdate>();
        public eventReceivers: Array<IEventReceiver> = new Array<IEventReceiver>();

        public editor: EditorMain = null;

        static configureObject(object: AbstractMesh | Scene, core: EditorCore): void {
            if (object instanceof Mesh) {
                var mesh: AbstractMesh = object;
                var scene = mesh.getScene();

                if (!mesh.actionManager) {
                    mesh.actionManager = new ActionManager(scene);
                }

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
                    }
                }));
            }

            // Send event configured
            var ev = new Event();
            ev.eventType = EventType.SCENE_EVENT;
            ev.sceneEvent = new SceneEvent(object, BABYLON.EDITOR.SceneEventType.OBJECT_PICKED);
            core.sendEvent(ev);
        }
    }
}