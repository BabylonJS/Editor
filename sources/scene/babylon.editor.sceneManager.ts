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

        static configureMesh(mesh: AbstractMesh): void {
            var scene = mesh.getScene();

            if (!mesh.actionManager) {
                mesh.actionManager = new ActionManager(scene);
            }

            mesh.actionManager.registerAction(new SetValueAction(ActionManager.OnPointerOverTrigger, mesh, "showBoundingBox", true));
            mesh.actionManager.registerAction(new SetValueAction(ActionManager.OnPointerOutTrigger, mesh, "showBoundingBox", false));
        }
    }
}