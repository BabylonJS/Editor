declare module BABYLON.EDITOR {
    class SceneManager {
        /**
        * Objects configuration
        */
        private static _alreadyConfiguredObjectsIDs;
        static configureObject(object: AbstractMesh | Scene, core: EditorCore, parentNode?: Node): void;
    }
}
