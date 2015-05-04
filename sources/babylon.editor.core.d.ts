declare module BABYLON.EDITOR {
    class EditorCore implements ICustomUpdate, IDisposable {
        engine: Engine;
        canvas: HTMLCanvasElement;
        scenes: Array<ICustomScene>;
        currentScene: Scene;
        updates: Array<ICustomUpdate>;
        editor: EditorMain;
        /**
        * Constructor
        * @param canvasID: the id of the canvas to render the editor scenes
        */
        constructor();
        /**
        * On pre update
        */
        onPreUpdate(): void;
        /**
        * On post update
        */
        onPostUpdate(): void;
        /**
        * IDisposable
        */
        dispose(): void;
    }
}
