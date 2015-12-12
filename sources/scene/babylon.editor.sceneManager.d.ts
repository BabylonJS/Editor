declare module BABYLON.EDITOR {
    class SceneManager {
        /**
        * Objects configuration
        */
        private static _alreadyConfiguredObjectsIDs;
        static ResetConfiguredObjects(): void;
        static SwitchActionManager(): void;
        static ConfigureObject(object: AbstractMesh | Scene, core: EditorCore, parentNode?: Node): void;
    }
}
