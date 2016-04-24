declare module BABYLON.EDITOR {
    interface IObjectConfiguration {
        mesh: AbstractMesh;
        actionManager: ActionManager;
    }
    interface ISceneConfiguration {
        scene: Scene;
        actionManager: ActionManager;
    }
    interface IObjectConfigurationDefinition {
        [index: string]: IObjectConfiguration;
    }
    class SceneManager {
        /**
        * Objects configuration
        */
        static _ConfiguredObjectsIDs: IObjectConfigurationDefinition;
        static _SceneConfiguration: ISceneConfiguration;
        static ResetConfiguredObjects(): void;
        static SwitchActionManager(): void;
        static ConfigureObject(object: AbstractMesh | Scene, core: EditorCore, parentNode?: Node): void;
    }
}
