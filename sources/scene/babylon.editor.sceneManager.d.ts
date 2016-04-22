declare module BABYLON.EDITOR {
    interface IObjectConfiguration {
        mesh: AbstractMesh;
        actionManager: ActionManager;
    }
    class SceneManager {
        /**
        * Objects configuration
        */
        static _ConfiguredObjectsIDs: Object;
        static ResetConfiguredObjects(): void;
        static SwitchActionManager(): void;
        static ConfigureObject(object: AbstractMesh | Scene, core: EditorCore, parentNode?: Node): void;
    }
}
