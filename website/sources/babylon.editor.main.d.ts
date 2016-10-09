declare module BABYLON.EDITOR {
    interface IMainPanelTab {
        tab: GUI.IGUITab;
        container: string;
        application?: ITabApplication;
    }
    class EditorMain implements IDisposable, IEventReceiver {
        core: EditorCore;
        editionTool: EditionTool;
        sceneGraphTool: SceneGraphTool;
        mainToolbar: MainToolbar;
        toolsToolbar: ToolsToolbar;
        sceneToolbar: SceneToolbar;
        SceneHelpers: SceneHelpers;
        transformer: ManipulationHelper;
        editPanel: EditPanel;
        timeline: Timeline;
        statusBar: StatusBar;
        container: string;
        mainContainer: string;
        antialias: boolean;
        options: any;
        layouts: GUI.GUILayout;
        playLayouts: GUI.GUILayout;
        filesInput: FilesInput;
        exporter: Exporter;
        renderMainScene: boolean;
        renderHelpers: boolean;
        private _saveCameraState;
        private _mainPanel;
        private _mainPanelSceneTab;
        private _mainPanelTabs;
        private _currentTab;
        private _lastTabUsed;
        private static _PlayLayoutContainerID;
        static PlayLayoutContainerID: string;
        /**
        * Constructor
        */
        constructor(containerID: string, antialias?: boolean, options?: any);
        /**
        * Event receiver
        */
        onEvent(event: Event): boolean;
        /**
        * Creates a new project
        */
        createNewProject(): void;
        /**
        * Creates the render loop
        */
        createRenderLoop(): void;
        /**
        * Simply update the scenes and updates
        */
        update(): void;
        /**
        * Disposes the editor
        */
        dispose(): void;
        /**
        * Reloads the scene
        */
        reloadScene(saveCameraState: boolean, data?: any): void;
        /**
        * Creates a new tab
        */
        createTab(caption: string, container: string, application: ITabApplication, closable?: boolean): GUI.IGUITab;
        /**
        * Removes the given tab
        */
        removeTab(tab: GUI.IGUITab): boolean;
        /**
        * Adds a new container and returns its id
        */
        createContainer(): string;
        /**
        * Removes the given continer
        */
        removeContainer(id: string): void;
        /**
        * Creates the UI
        */
        private _createUI();
        /**
        * Handles just opened scenes
        */
        private _handleSceneLoaded();
        /**
        * Creates the babylon engine
        */
        private _createBabylonEngine();
        /**
        * Creates the editor camera
        */
        private _createBabylonCamera();
        /**
        * Creates the main events (on "document")
        */
        private _createMainEvents();
    }
}
