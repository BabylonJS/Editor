declare module BABYLON.EDITOR {
    class SceneManager {
        engine: Engine;
        canvas: HTMLCanvasElement;
        scenes: Array<ICustomScene>;
        currentScene: Scene;
        updates: Array<ICustomUpdate>;
        eventReceivers: Array<IEventReceiver>;
        editor: EditorMain;
        /**
        * Objects configuration
        */
        private static _alreadyConfiguredObjectsIDs;
        static configureObject(object: AbstractMesh | Scene, core: EditorCore, parentNode?: Node): void;
    }
}
