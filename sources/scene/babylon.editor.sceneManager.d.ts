declare module BABYLON.EDITOR {
    class SceneManager {
        engine: Engine;
        canvas: HTMLCanvasElement;
        scenes: Array<ICustomScene>;
        currentScene: Scene;
        updates: Array<ICustomUpdate>;
        eventReceivers: Array<IEventReceiver>;
        editor: EditorMain;
        static configureMesh(mesh: AbstractMesh, core: EditorCore): void;
    }
}
