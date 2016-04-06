declare module BABYLON.EDITOR {
    class EditorCore implements ICustomUpdate, IDisposable {
        engine: Engine;
        canvas: HTMLCanvasElement;
        camera: ArcRotateCamera;
        playCamera: Camera;
        isPlaying: boolean;
        scenes: Array<ICustomScene>;
        currentScene: Scene;
        updates: Array<ICustomUpdate>;
        eventReceivers: Array<IEventReceiver>;
        editor: EditorMain;
        /**
        * Constructor
        */
        constructor();
        /**
        * Removes a scene
        */
        removeScene(scene: Scene): boolean;
        /**
        * Removes an event receiver
        */
        removeEventReceiver(receiver: IEventReceiver): boolean;
        /**
        * On pre update
        */
        onPreUpdate(): void;
        /**
        * On post update
        */
        onPostUpdate(): void;
        /**
        * Send an event to the event receivers
        */
        sendEvent(event: IEvent): void;
        /**
        * IDisposable
        */
        dispose(): void;
    }
}

declare module BABYLON.EDITOR {
    class EditionTool implements ICustomUpdate, IEventReceiver {
        object: any;
        container: string;
        editionTools: Array<ICustomEditionTool>;
        panel: GUI.IGUIPanel;
        core: EditorCore;
        private _editor;
        private _currentTab;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onPreUpdate(): void;
        onPostUpdate(): void;
        onEvent(event: Event): boolean;
        updateEditionTool(): void;
        isObjectSupported(object: any): boolean;
        createUI(): void;
        addTool(tool: ICustomEditionTool): void;
    }
}

declare module BABYLON.EDITOR {
    class EditPanel {
        core: EditorCore;
        editor: EditorMain;
        panel: GUI.GUIPanel;
        onClose: () => void;
        private _containers;
        private _mainPanel;
        /**
        * Constructor
        */
        constructor(core: EditorCore);
        addContainer(container: string, id?: string): boolean;
        close(): void;
        setPanelSize(percents: number): void;
    }
}

declare module BABYLON.EDITOR {
    class EditorMain implements IDisposable, IEventReceiver {
        core: EditorCore;
        editionTool: EditionTool;
        sceneGraphTool: SceneGraphTool;
        mainToolbar: MainToolbar;
        toolsToolbar: ToolsToolbar;
        sceneToolbar: SceneToolbar;
        transformer: Transformer;
        editPanel: EditPanel;
        timeline: Timeline;
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
        static DummyNodeID: string;
        /**
        * Constructor
        */
        constructor(containerID: string, antialias?: boolean, options?: any);
        /**
        * Event receiver
        */
        onEvent(event: Event): boolean;
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
        * Creates the render loop
        */
        createRenderLoop(): void;
        /**
        * Simply update the scenes and updates
        */
        update(): void;
        dispose(): void;
    }
}

declare module BABYLON.EDITOR {
    class MainToolbar implements ICustomUpdate, IEventReceiver {
        container: string;
        toolbar: GUI.GUIToolbar;
        panel: GUI.GUIPanel;
        core: EditorCore;
        particleSystemMenu: GUI.IToolbarMenuElement;
        particleSystemCopyItem: GUI.IToolbarElement;
        particleSystemPasteItem: GUI.IToolbarElement;
        private _editor;
        private _plugins;
        private _mainProject;
        private _mainProjectOpenFiles;
        private _mainProjectReload;
        private _projectExportCode;
        private _projectExportBabylonScene;
        private _projectConnectStorage;
        private _projectTemplateStorage;
        private _mainEdit;
        private _mainEditLaunch;
        private _mainEditTextures;
        private _mainAdd;
        private _addPointLight;
        private _addDirectionalLight;
        private _addSpotLight;
        private _addHemisphericLight;
        private _addParticleSystem;
        private _addSkyMesh;
        private _addWaterMesh;
        private _addLensFlare;
        private _addReflectionProbe;
        private _addRenderTarget;
        private _particlesMain;
        private _particlesCopy;
        private _particlesPaste;
        private _particlesPlay;
        private _particlesStop;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onPreUpdate(): void;
        onPostUpdate(): void;
        onEvent(event: Event): boolean;
        createUI(): void;
    }
}

declare module BABYLON.EDITOR {
    type _EditionToolConstructor = new (editionTool: EditionTool) => ICustomEditionTool;
    type _MainToolbarConstructor = new (mainToolbar: MainToolbar) => ICustomToolbarMenu;
    class PluginManager {
        static EditionToolPlugins: _EditionToolConstructor[];
        static MainToolbarPlugin: _MainToolbarConstructor[];
        static RegisterEditionTool(tool: _EditionToolConstructor): void;
        static RegisterMainToolbarPlugin(plugin: _MainToolbarConstructor): void;
    }
}

declare module BABYLON.EDITOR {
    class SceneGraphTool implements ICustomUpdate, IEventReceiver {
        container: string;
        sidebar: GUI.GUIGraph;
        panel: GUI.IGUIPanel;
        private _core;
        private _editor;
        private _graphRootName;
        private _menuDeleteId;
        private _menuCloneId;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onPreUpdate(): void;
        onPostUpdate(): void;
        onEvent(event: Event): boolean;
        fillGraph(node?: Node, graphNodeID?: string): void;
        createUI(): void;
        private _getRootNodes(result, entities);
        private _getObjectIcon(node);
        private _modifyElement(node, parentNode, id?);
        private _ensureObjectDispose(object);
    }
}

declare module BABYLON.EDITOR {
    class SceneToolbar implements IEventReceiver {
        container: string;
        toolbar: GUI.GUIToolbar;
        panel: GUI.IGUIPanel;
        private _core;
        private _editor;
        private _fpsInput;
        private _wireframeID;
        private _boundingBoxID;
        private _centerOnObjectID;
        private _renderHelpersID;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onPreUpdate(): void;
        onPostUpdate(): void;
        onEvent(event: Event): boolean;
        createUI(): void;
        setFocusOnObject(object: any): void;
        setFramesPerSecond(fps: number): void;
        private _configureFramesPerSecond();
    }
}

declare module BABYLON.EDITOR {
    class Timeline implements IEventReceiver, ICustomUpdate, IAnimatable {
        container: string;
        animations: Animation[];
        private _core;
        private _panel;
        private _paper;
        private _rect;
        private _selectorRect;
        private _animatedRect;
        private _overlay;
        private _overlayText;
        private _overlayObj;
        private _mousex;
        private _mousey;
        private _isOver;
        private _maxFrame;
        private _currentTime;
        private _frameRects;
        private _frameTexts;
        private _frameAnimation;
        private _currentAnimationFrame;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onEvent(event: Event): boolean;
        onPreUpdate(): void;
        onPostUpdate(): void;
        play(): void;
        stop(): void;
        currentTime: number;
        reset(): void;
        setFramesOfAnimation(animation: Animation): void;
        createUI(): void;
        private _updateTimeline();
        private _getFrame(pos?);
        private _getPosition(frame);
    }
}

declare module BABYLON.EDITOR {
    class ToolsToolbar implements ICustomUpdate, IEventReceiver {
        container: string;
        toolbar: GUI.GUIToolbar;
        panel: GUI.IGUIPanel;
        private _core;
        private _editor;
        private _playGameID;
        private _transformerPositionID;
        private _transformerRotationID;
        private _transformerScalingID;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onPreUpdate(): void;
        onPostUpdate(): void;
        onEvent(event: Event): boolean;
        createUI(): void;
    }
}

declare module BABYLON.EDITOR {
    enum TransformerType {
        POSITION = 0,
        ROTATION = 1,
        SCALING = 2,
        NOTHING = 3,
    }
    class Transformer implements IEventReceiver, ICustomUpdate {
        core: EditorCore;
        private _scene;
        private _node;
        private _helperPlane;
        private _planeMaterial;
        private _subMesh;
        private _batch;
        private _cameraTexture;
        private _soundTexture;
        private _lightTexture;
        private _transformerType;
        private _xTransformers;
        private _yTransformers;
        private _zTransformers;
        private _sharedScale;
        private _pickingPlane;
        private _mousePositionInPlane;
        private _mousePosition;
        private _mouseDown;
        private _pickPosition;
        private _pickingInfo;
        private _vectorToModify;
        private _selectedTransform;
        private _distance;
        private _multiplier;
        private _ctrlIsDown;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        createHelpers(core: EditorCore): void;
        onEvent(event: Event): boolean;
        onPreUpdate(): void;
        onPostUpdate(): void;
        transformerType: TransformerType;
        node: Node;
        getScene(): Scene;
        private _getNodePosition();
        private _renderHelperPlane(array, onConfigure);
        private _updateTransform(distance);
        private _getIntersectionWithLine(linePoint, lineVect);
        private _findMousePositionInPlane(pickingInfos);
        private _createTransformers();
        private _createPositionTransformer(color, id);
        private _createRotationTransformer(color, id);
        private _createScalingTransformer(color, id);
    }
}

declare module BABYLON.EDITOR {
    class Exporter {
        core: EditorCore;
        private _window;
        private _editor;
        private _editorID;
        private _generatedCode;
        /**
        * Constructor
        */
        constructor(core: EditorCore);
        openSceneExporter(babylonScene?: boolean): void;
        generateCode(babylonScene?: boolean): string;
        static ExportCode(core: EditorCore): string;
        _exportSceneValues(): string;
        _exportScene(): string;
        _exportReflectionProbes(): string;
        _exportNodeTransform(node: any): string;
        _getTextureByName(name: string, scene: Scene): BaseTexture;
        _exportPostProcesses(): string;
        _exportAnimations(node: IAnimatable): string;
        _exportNodeMaterial(node: AbstractMesh | SubMesh, subMeshId?: number): string;
        _exportSky(node: Node): string;
        _exportParticleSystem(particleSystem: ParticleSystem): string;
        _exportLight(light: Light): string;
        _exportVector2(vector: Vector2): string;
        _exportVector3(vector: Vector3): string;
        _exportQuaternion(quaternion: Quaternion): string;
        _exportColor3(color: Color3): string;
        _exportColor4(color: Color4): string;
        private _traverseNodes(node?);
        private _fillRootNodes(data, propertyPath);
    }
}

declare module BABYLON.EDITOR {
    class ProjectExporter {
        static ExportProject(core: EditorCore, requestMaterials?: boolean): string;
        private static _SerializeGlobalAnimations();
        private static _SerializeRenderTargets(core);
        private static _SerializeLensFlares(core);
        private static _SerializePostProcesses();
        private static _TraverseNodes(core, node, project);
        private static _RequestMaterial(core, project, material);
        private static _GetSerializedMaterial(project, materialName);
        private static _ConfigureMaterial(material, projectMaterial);
        private static _ConfigureBase64Texture(source, objectToConfigure);
        private static _FillRootNodes(core, data, propertyPath);
    }
}

declare module BABYLON.EDITOR {
    class ProjectImporter {
        static ImportProject(core: EditorCore, data: string): void;
    }
}

declare module BABYLON.EDITOR {
    class StorageExporter implements IEventReceiver {
        core: EditorCore;
        private _storage;
        private _window;
        private _filesList;
        private _currentChildrenFolder;
        private _currentFolder;
        private _previousFolders;
        private _onFolderSelected;
        private static _projectFolder;
        private static _projectFolderChildren;
        static OneDriveStorage: string;
        /**
        * Constructor
        */
        constructor(core: EditorCore, storageType?: string);
        onEvent(event: Event): boolean;
        createTemplate(): void;
        export(): void;
        getFolder(name: string): IStorageFile;
        getFile(name: string): IStorageFile;
        private _createTemplate();
        private _fileExists(files, name, parent?);
        private _processIndexHTML(project, content);
        private _openFolderDialog(success?);
        private _updateFolderDialog(folder?);
        private _updateFileList(onSuccess);
        private _getFileFolder(name, type, files);
        private _lockPanel(message);
        private _unlockPanel();
    }
}

declare module BABYLON.EDITOR {
    /**
    * Event Type
    */
    enum EventType {
        SCENE_EVENT = 0,
        GUI_EVENT = 1,
        UNKNOWN = 2,
    }
    enum GUIEventType {
        FORM_CHANGED = 0,
        FORM_TOOLBAR_CLICKED = 1,
        LAYOUT_CHANGED = 2,
        PANEL_CHANGED = 3,
        GRAPH_SELECTED = 4,
        GRAPH_DOUBLE_SELECTED = 5,
        TAB_CHANGED = 6,
        TOOLBAR_MENU_SELECTED = 7,
        GRAPH_MENU_SELECTED = 8,
        GRID_SELECTED = 9,
        GRID_ROW_REMOVED = 10,
        GRID_ROW_ADDED = 11,
        GRID_ROW_EDITED = 12,
        GRID_ROW_CHANGED = 13,
        GRID_MENU_SELECTED = 14,
        GRID_RELOADED = 15,
        WINDOW_BUTTON_CLICKED = 16,
        OBJECT_PICKED = 17,
        UNKNOWN = 18,
    }
    enum SceneEventType {
        OBJECT_PICKED = 0,
        OBJECT_ADDED = 1,
        OBJECT_REMOVED = 2,
        OBJECT_CHANGED = 3,
        UNKNOWN = 4,
    }
    /**
    * Base Event
    */
    class BaseEvent {
        data: any;
        constructor(data?: Object);
    }
    /**
    * Scene Event
    */
    class SceneEvent extends BaseEvent {
        object: any;
        eventType: SceneEventType;
        /**
        * Constructor
        * @param object: the object generating the event
        */
        constructor(object: any, eventType: number, data?: Object);
    }
    /**
    * GUI Event
    */
    class GUIEvent extends BaseEvent {
        caller: GUI.IGUIElement;
        eventType: GUIEventType;
        /**
        * Constructor
        * @param caller: gui element calling the event
        * @param eventType: the gui event type
        */
        constructor(caller: GUI.GUIElement<W2UI.IElement>, eventType: number, data?: Object);
    }
    /**
    * IEvent implementation
    */
    class Event implements IEvent {
        eventType: EventType;
        sceneEvent: SceneEvent;
        guiEvent: GUIEvent;
        static sendSceneEvent(object: any, type: SceneEventType, core: EditorCore): void;
        static sendGUIEvent(object: any, type: GUIEventType, core: EditorCore): void;
    }
}

declare module BABYLON.EDITOR {
    class Tools {
        /**
        * Returns a vector3 string from a vector3
        */
        static GetStringFromVector3(vector: Vector3): string;
        /**
        * Returns a vector3 from a vector3 string
        */
        static GetVector3FromString(vector: string): Vector3;
        /**
        * Converts a base64 string to array buffer
        * Largely used to convert images, converted into base64 string
        */
        static ConvertBase64StringToArrayBuffer(base64String: string): Uint8Array;
        /**
        * Opens a window popup
        */
        static OpenWindowPopup(url: string, width: number, height: number): any;
        /**
        * Returns the base URL of the window
        */
        static getBaseURL(): string;
        /**
        * Creates an input element
        */
        static CreateFileInpuElement(id: string): JQuery;
        /**
        * Beautify a variable name (escapeds + upper case)
        */
        static BeautifyName(name: string): string;
        /**
        * Cleans an editor project
        */
        static CleanProject(project: INTERNAL.IProjectRoot): void;
        /**
        * Returns the constructor name of an object
        */
        static GetConstructorName(obj: any): string;
        /**
        * Converts a boolean to integer
        */
        static BooleanToInt(value: boolean): number;
        /**
        * Converts a number to boolean
        */
        static IntToBoolean(value: number): boolean;
        /**
        * Returns a particle system by its name
        */
        static GetParticleSystemByName(scene: Scene, name: string): ParticleSystem;
    }
}

declare module BABYLON.EDITOR {
    class GeometriesMenuPlugin implements ICustomToolbarMenu {
        menuID: string;
        private _core;
        private _createCubeID;
        private _createSphereID;
        private _createGroundID;
        private _createHeightMap;
        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar);
        /**
        * Called when a menu item is selected by the user
        * Returns true if a menu of the plugin was selected, false if no one selected
        */
        onMenuItemSelected(selected: string): void;
    }
}

declare module BABYLON.EDITOR {
    class SimpleMaterialTool extends AbstractMaterialTool<SimpleMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}

declare module BABYLON.EDITOR {
    class FilesInput extends BABYLON.FilesInput {
        constructor(core: EditorCore, sceneLoadedCallback: any, progressCallback: any, additionnalRenderLoopLogicCallback: any, textureLoadingCallback: any, startingProcessingFilesCallback: any);
        private static _callbackStart(core);
        private static _callback(callback, core, filesInput);
    }
}

declare module BABYLON.EDITOR {
    interface IEnabledPostProcesses {
        hdr: boolean;
        attachHDR: boolean;
        ssao: boolean;
        ssaoOnly: boolean;
        attachSSAO: boolean;
        vls: boolean;
    }
    class SceneFactory {
        static GenerateUUID(): string;
        static ConfigureObject(object: any, core: EditorCore): void;
        static HDRPipeline: HDRRenderingPipeline;
        static SSAOPipeline: SSAORenderingPipeline;
        static VLSPostProcess: VolumetricLightScatteringPostProcess;
        static EnabledPostProcesses: IEnabledPostProcesses;
        static NodesToStart: IAnimatable[];
        static AnimationSpeed: number;
        /**
        * Post-Processes
        */
        static CreateHDRPipeline(core: EditorCore, serializationObject?: any): HDRRenderingPipeline;
        static CreateSSAOPipeline(core: EditorCore, serializationObject?: any): SSAORenderingPipeline;
        static CreateVLSPostProcess(core: EditorCore, mesh?: Mesh, serializationObject?: any): VolumetricLightScatteringPostProcess;
        /**
        * Nodes
        */
        static AddPointLight(core: EditorCore): PointLight;
        static AddDirectionalLight(core: EditorCore): DirectionalLight;
        static AddSpotLight(core: EditorCore): SpotLight;
        static AddHemisphericLight(core: EditorCore): HemisphericLight;
        static AddBoxMesh(core: EditorCore): Mesh;
        static AddSphereMesh(core: EditorCore): Mesh;
        static AddPlaneMesh(core: EditorCore): Mesh;
        static AddGroundMesh(core: EditorCore): Mesh;
        static AddHeightMap(core: EditorCore): Mesh;
        static AddParticleSystem(core: EditorCore, chooseEmitter?: boolean): void;
        static AddLensFlareSystem(core: EditorCore, chooseEmitter?: boolean, emitter?: any): void;
        static AddLensFlare(core: EditorCore, system: LensFlareSystem, size: number, position: number, color: any): LensFlare;
        static AddReflectionProbe(core: EditorCore): ReflectionProbe;
        static AddRenderTargetTexture(core: EditorCore): RenderTargetTexture;
        static AddSkyMesh(core: EditorCore): Mesh;
        static AddWaterMesh(core: EditorCore): Mesh;
    }
}

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

declare module BABYLON.EDITOR {
    class OneDriveStorage extends Storage {
        private _editor;
        private static _ClientID;
        private static _TOKEN;
        private static _TOKEN_EXPIRES_IN;
        private static _TOKEN_EXPIRES_NOW;
        private static _POPUP;
        private static _OnAuthentificated();
        private static _ClosePopup(token, expires, window);
        private static _Login(core, success);
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        createFolders(folders: string[], parentFolder: IStorageFile, success?: () => void, failed?: (message: string) => void): void;
        createFiles(files: IStorageUploadFile[], folder: IStorageFile, success?: () => void, failed?: (message: string) => void): void;
        getFiles(folder: IStorageFile, success?: (children: IStorageFile[]) => void, failed?: (message: string) => void): void;
    }
}

declare module BABYLON.EDITOR {
    interface IStorageFile {
        file: OneDrive.IChildResult;
        name: string;
    }
    interface IStorageUploadFile {
        content: string | Uint8Array;
        name: string;
        parentFolder?: OneDrive.IChildResult;
        type?: string;
        url?: string;
    }
    interface IStorage {
        createFolders(folders: string[], parentFolder: IStorageFile, success?: () => void, failed?: () => void): void;
        getFiles(folder: IStorageFile, success: (children: IStorageFile[]) => void, failed?: (message: string) => void): void;
        createFiles(files: IStorageUploadFile[], folder: IStorageFile, success?: () => void, failed?: (message: string) => void): void;
    }
    class Storage implements IStorage {
        core: EditorCore;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        createFolders(folders: string[], parentFolder: IStorageFile, success?: () => void, failed?: (message: string) => void): void;
        getFiles(folder: IStorageFile, success: (children: IStorageFile[]) => void, failed?: (message: string) => void): void;
        createFiles(files: IStorageUploadFile[], folder: IStorageFile, success?: () => void, failed?: (message: string) => void): void;
        selectFolder(success: (folder: IStorageFile) => void): void;
    }
}

declare module BABYLON.EDITOR {
    class AbstractDatTool extends AbstractTool {
        protected _element: GUI.GUIEditForm;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
        resize(): void;
        /**
        * Static methods
        */
        protected addColorFolder(color: Color3 | Color4, propertyName: string, open?: boolean, parent?: dat.IFolderElement, callback?: () => void): dat.IFolderElement;
        protected addVectorFolder(vector: Vector2 | Vector3, propertyName: string, open?: boolean, parent?: dat.IFolderElement, callback?: () => void): dat.IFolderElement;
        protected addTextureFolder(object: Object, name: string, property: string, parentFolder?: dat.IFolderElement, callback?: () => void): dat.IFolderElement;
    }
}

declare module BABYLON.EDITOR {
    class AbstractTool implements ICustomEditionTool {
        object: any;
        containers: Array<string>;
        tab: string;
        protected _editionTool: EditionTool;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        apply(): void;
        resize(): void;
    }
}

declare module BABYLON.EDITOR {
    class AnimationTool extends AbstractDatTool {
        tab: string;
        private _animationSpeed;
        private _loopAnimation;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _editAnimations();
        private _playAnimations();
        private _playSkeletonAnimations();
    }
}

declare module BABYLON.EDITOR {
    class AudioTool extends AbstractDatTool {
        tab: string;
        private _volume;
        private _playbackRate;
        private _position;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _positionCallback(sound);
        private _pauseSound();
        private _playSound();
        private _stopSound();
    }
}

declare module BABYLON.EDITOR {
    class GeneralTool extends AbstractDatTool {
        object: Node;
        tab: string;
        private _isActiveCamera;
        private _isActivePlayCamera;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _castShadows;
        private _setChildrenCastingShadows(node);
    }
}

declare module BABYLON.EDITOR {
    class LensFlareTool extends AbstractDatTool {
        tab: string;
        private _dummyProperty;
        private _currentLensFlareId;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _addLensFlare();
        private _reset();
        private _setupRemove(indice);
        private _setupChangeTexture(indice);
    }
}

declare module BABYLON.EDITOR {
    class LightTool extends AbstractDatTool {
        tab: string;
        private _customShadowsGeneratorSize;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _createShadowsGenerator();
        private _removeShadowGenerator();
    }
}

declare module BABYLON.EDITOR {
    class MaterialTool extends AbstractDatTool {
        tab: string;
        private _dummyProperty;
        private _libraryDummyProperty;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _configureMaterialsLibrary(folder);
        private _applyMaterial();
        private _removeMaterial();
        private _setMaterialsLibrary();
    }
}

declare module BABYLON.EDITOR {
    class ParticleSystemTool extends AbstractDatTool {
        tab: string;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
    }
}

declare module BABYLON.EDITOR {
    class PostProcessesTool extends AbstractDatTool {
        tab: string;
        private _renderEffects;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _setVLSAttachedNode();
        private _setupDebugPipeline(folder, pipeline);
        private _attachDetachPipeline(attach, pipeline);
        private _getPipelineCameras();
        private _loadHDRLensDirtTexture();
    }
}

declare module BABYLON.EDITOR {
    class ReflectionProbeTool extends AbstractDatTool implements IEventReceiver {
        tab: string;
        private _window;
        private _excludedMeshesList;
        private _includedMeshesList;
        private _layouts;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        onEvent(event: Event): boolean;
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _exportRenderTarget();
        private _attachToMesh();
        private _setIncludedMeshes();
    }
}

declare module BABYLON.EDITOR {
    class SceneTool extends AbstractDatTool {
        tab: string;
        private _fogType;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
    }
}

declare module BABYLON.EDITOR {
    class GUIAnimationEditor implements IEventReceiver {
        core: EditorCore;
        object: IAnimatable;
        private _animationsList;
        private _keysList;
        private _valuesForm;
        private _currentAnimation;
        private _currentKey;
        private _addAnimationWindow;
        private _addAnimationLayout;
        private _addAnimationGraph;
        private _addAnimationForm;
        private _addAnimationName;
        private _addAnimationType;
        private _addAnimationTypeName;
        private _editedAnimation;
        private _graphPaper;
        private _graphLines;
        private _graphValueTexts;
        private _graphMiddleLine;
        private _graphTimeLines;
        private _graphTimeTexts;
        static FramesPerSecond: number;
        private static _CopiedAnimations;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore, object: Node);
        onEvent(event: Event): boolean;
        private _createAnimation();
        _getEffectiveTarget(value?: any): any;
        private _getFrameTime(frame);
        private _setRecords(frame, value);
        private _setFrameValue();
        private _getFrameValue();
        private _configureGraph();
        private _onSelectedAnimation();
        private _onAddAnimation();
        private _onModifyKey();
        private _onAnimationMenuSelected(id);
        private _onDeleteAnimations();
        private _onKeySelected();
        private _onAddKey();
        private _onRemoveKeys();
        private _createUI();
        static GetEndFrameOfObject(object: IAnimatable): number;
        static GetSceneFrameCount(scene: Scene): number;
        static SetCurrentFrame(core: EditorCore, objs: IAnimatable[], frame: number): void;
    }
}

declare module BABYLON.EDITOR {
    class BabylonExporter implements IEventReceiver {
        private _core;
        private _window;
        private _layout;
        private _editor;
        private _configForm;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore);
        onEvent(event: Event): boolean;
        createUI(): void;
        static GenerateFinalBabylonFile(core: EditorCore): any;
    }
}

declare module BABYLON.EDITOR {
    class LaunchEditor {
        core: EditorCore;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore);
    }
}

declare module BABYLON.EDITOR {
    class ObjectPicker implements IEventReceiver {
        core: EditorCore;
        objectLists: Array<any[]>;
        selectedObjects: Array<any>;
        onObjectPicked: (names: string[]) => void;
        onClosedPicker: () => void;
        minSelectCount: number;
        windowName: string;
        selectButtonName: string;
        closeButtonName: string;
        private _window;
        private _list;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore);
        onEvent(event: Event): boolean;
        open(): void;
    }
}

declare module BABYLON.EDITOR {
    class GUIParticleSystemEditor implements IEventReceiver {
        core: EditorCore;
        private _window;
        private _layouts;
        private _leftPanel;
        private _layoutID;
        private _formTabID;
        private _editorTabID;
        private _editElement;
        private _editElementID;
        private _inputElementID;
        private _editor;
        private _editorElementID;
        private _engine;
        private _scene;
        private _camera;
        private _particleSystem;
        private _particleSystemToEdit;
        private _uiCreated;
        private _particleSystemCapacity;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore, particleSystem?: ParticleSystem, createUI?: boolean);
        onEvent(event: Event): boolean;
        private _createUI();
        _createEditor(container?: string): GUI.GUIEditForm;
        private _setParticleSystem();
        private _editParticleSystem();
        private _startParticleSystem();
        private _stopParticleSystem();
        private _updateGraphNode(result, data?);
        static _CurrentParticleSystem: ParticleSystem;
        static _CopiedParticleSystem: ParticleSystem;
        private _setParticleTexture();
        static PlayStopAllParticleSystems(scene: Scene, play: boolean): void;
        static CreateParticleSystem(scene: Scene, capacity: number, particleSystem?: ParticleSystem, emitter?: Node): ParticleSystem;
    }
}

declare module BABYLON.EDITOR {
    class GUITextureEditor implements IEventReceiver {
        object: Object;
        propertyPath: string;
        private _core;
        private _targetObject;
        private _targetTexture;
        private _objectName;
        private _currentRenderTarget;
        private _currentPixels;
        private _currentOnAfterRender;
        private _dynamicTexture;
        private _texturesList;
        private _engine;
        private _scene;
        /**
        * Constructor
        * @param core: the editor core
        * @param object: the object to edit
        * @param propertyPath: the path to the texture property of the object
        */
        constructor(core: EditorCore, objectName?: string, object?: Object, propertyPath?: string);
        onEvent(ev: Event): boolean;
        private _createUI();
        private _configureRenderTarget();
        private _restorRenderTarget();
        private _fillTextureList();
        private _onReadFileCallback(name);
    }
}

declare module BABYLON.EDITOR.GUI {
    class GUIDialog extends GUIElement<W2UI.IWindowConfirmDialog> {
        title: string;
        body: string;
        callback: (data: string) => void;
        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore, title: string, body: string);
        buildElement(parent: string): void;
        static CreateDialog(body: string, title?: string, yesCallback?: () => void, noCallback?: () => void): void;
    }
}

declare module BABYLON.EDITOR.GUI {
    class GUIEditForm extends GUIElement<W2UI.IElement> {
        private _datElement;
        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore);
        remove(): void;
        addFolder(name: any, parent?: dat.IFolderElement): dat.IFolderElement;
        add(object: Object, propertyPath: string, items?: Array<string>, name?: string): dat.IGUIElement;
        tagObjectIfChanged(element: dat.IGUIElement, object: any, property: string): void;
        width: number;
        height: number;
        remember(object: any): void;
        buildElement(parent: string): void;
    }
}

declare module BABYLON.EDITOR.GUI {
    class GUIElement<T extends W2UI.IElement> implements IGUIElement {
        element: T;
        name: string;
        core: EditorCore;
        /**
        * Constructor
        * @param name: the gui element name
        * @param core: the editor core
        */
        constructor(name: string, core: EditorCore);
        destroy(): void;
        refresh(): void;
        resize(): void;
        on(event: W2UI.IEvent, callback: (target: any, eventData: any) => void): void;
        buildElement(parent: string): void;
        /**
        * Static methods
        */
        static CreateDivElement(id: string, style?: string): string;
        static CreateElement(type: string, id: string, style?: string): string;
    }
}

declare module BABYLON.EDITOR.GUI {
    class GUIForm extends GUIElement<W2UI.IFormElement> {
        header: string;
        fields: Array<GUI.IGUIFormField>;
        toolbarFields: Array<GUI.IToolbarElement>;
        onFormChanged: () => void;
        onToolbarClicked: (id: string) => void;
        /**
        * Constructor
        * @param name: the form name
        * @param header: form's header text
        */
        constructor(name: string, header: string, core: EditorCore);
        createField(name: string, type: string, caption: string, span?: number, text?: string, options?: any): IGUIForm;
        createToolbarField(id: string, type: string, caption: string, img: string): IToolbarElement;
        setRecord(name: string, value: any): void;
        getRecord(name: string): any;
        buildElement(parent: string): void;
    }
}

declare module BABYLON.EDITOR.GUI {
    class GUIGraph extends GUIElement<W2UI.IGraphElement> {
        menus: Array<IGraphMenuElement>;
        onGraphClick: (data: any) => void;
        onGraphDblClick: (data: any) => void;
        onMenuClick: (id: string) => void;
        /**
        * Constructor
        * @param name: the form name
        * @param header: form's header text
        */
        constructor(name: string, core: EditorCore);
        addMenu(id: string, text: string, img?: string): void;
        createNode(id: string, text: string, img?: string, data?: any): IGraphNodeElement;
        addNodes(nodes: IGraphNodeElement[] | IGraphNodeElement, parent?: string): void;
        removeNode(node: IGraphNodeElement | string): void;
        setNodeExpanded(node: string, expanded: boolean): void;
        setSelected(node: string): void;
        getSelected(): string;
        getSelectedNode(): IGraphNodeElement;
        getNode(id: string): IGraphNodeElement;
        getSelectedData(): Object;
        clear(): void;
        buildElement(parent: string): void;
    }
}

declare module BABYLON.EDITOR.GUI {
    class GUIGrid<T extends IGridRowData> extends GUIElement<W2UI.IGridElement<T>> {
        columns: W2UI.IGridColumnData[];
        records: T[];
        header: string;
        fixedBody: boolean;
        showToolbar: boolean;
        showFooter: boolean;
        showDelete: boolean;
        showAdd: boolean;
        showEdit: boolean;
        showOptions: boolean;
        showSearch: boolean;
        showColumnHeaders: boolean;
        menus: W2UI.IGridMenu[];
        autoMergeChanges: boolean;
        onClick: (selected: number[]) => void;
        onMenuClick: (id: number) => void;
        onDelete: (selected: number[]) => void;
        onAdd: () => void;
        onEdit: (selected: number[]) => void;
        onReload: () => void;
        onEditField: (recid: number, value: any) => void;
        hasSubGrid: boolean;
        subGridHeight: number;
        onExpand: (id: string, recid: number) => GUIGrid<IGridRowData>;
        /**
        * Constructor
        * @param name: the form name
        * @param core: the editor core
        */
        constructor(name: string, core: EditorCore);
        addMenu(id: number, text: string, icon: string): void;
        createColumn(id: string, text: string, size?: string, style?: string): void;
        createEditableColumn(id: string, text: string, editable: IGridColumnEditable, size?: string, style?: string): void;
        addRow(data: T): void;
        addRecord(data: T): void;
        removeRow(recid: number): void;
        removeRecord(recid: number): void;
        refresh(): void;
        getRowCount(): number;
        clear(): void;
        lock(message: string, spinner?: boolean): void;
        unlock(): void;
        getSelectedRows(): number[];
        setSelected(selected: number[]): void;
        getRow(indice: number): T;
        modifyRow(indice: number, data: T): void;
        getChanges(recid?: number): T[];
        scrollIntoView(indice: number): void;
        mergeChanges(): void;
        buildElement(parent: string): void;
    }
}

declare module BABYLON.EDITOR.GUI {
    class GUILayout extends GUIElement<W2UI.ILayoutsElement> {
        panels: Array<GUIPanel>;
        /**
        * Constructor
        * @param name: layouts name
        */
        constructor(name: string, core: EditorCore);
        createPanel(name: string, type: string, size: number, resizable?: boolean): GUIPanel;
        lockPanel(type: string, message?: string, spinner?: boolean): void;
        unlockPanel(type: string): void;
        getPanelFromType(type: string): GUIPanel;
        getPanelFromName(name: string): GUIPanel;
        setPanelSize(panelType: string, size: number): void;
        buildElement(parent: string): void;
    }
}

declare module BABYLON.EDITOR.GUI {
    class GUIList extends GUIElement<W2UI.IListElement> {
        items: Array<string>;
        /**
        * Constructor
        * @param name: the form name
        * @param core: the editor core
        */
        constructor(name: string, core: EditorCore);
        addItem(name: string): IGUIListElement;
        getSelected(): number;
        buildElement(parent: string): void;
    }
}

declare module BABYLON.EDITOR.GUI {
    class GUIPanel extends GUIElement<W2UI.IElement> {
        tabs: Array<IGUITab>;
        type: string;
        size: number;
        minSize: number;
        maxSize: any;
        content: string;
        resizable: boolean;
        style: string;
        toolbar: any;
        _panelElement: W2UI.IPanelElement;
        /**
        * Constructor
        * @param name: panel name
        * @param type: panel type (left, right, etc.)
        * @param size: panel size
        * @param resizable: if the panel is resizable
        * @param core: the editor core
        */
        constructor(name: string, type: string, size: number, resizable: boolean, core: EditorCore);
        createTab(tab: IGUITab): GUIPanel;
        removeTab(id: string): boolean;
        width: number;
        height: number;
        getTabCount(): number;
        setTabEnabled(id: string, enable: boolean): GUIPanel;
        getTabIDFromIndex(index: number): string;
        setContent(content: string): GUIPanel;
        hideTab(id: string): boolean;
        showTab(id: string): boolean;
    }
}

declare module BABYLON.EDITOR.GUI {
    class GUIToolbar extends GUIElement<W2UI.IToolbarElement> {
        menus: IToolbarMenuElement[];
        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore);
        createMenu(type: string, id: string, text: string, icon: string, checked?: boolean, tooltip?: string): IToolbarMenuElement;
        createMenuItem(menu: IToolbarMenuElement, type: string, id: string, text: string, icon: string, checked?: boolean, disabled?: boolean): IToolbarElement;
        createInput(id: string, inputId: string, text: string, size?: number): IToolbarMenuElement;
        addBreak(menu?: IToolbarMenuElement): IToolbarMenuElement;
        addSpacer(): IToolbarMenuElement;
        setItemChecked(item: string, checked: boolean, menu?: string): void;
        setItemAutoChecked(item: string, menu?: string): void;
        isItemChecked(item: string, menu?: string): boolean;
        setItemEnabled(item: string, enabled: boolean, menu?: string): boolean;
        getItemByID(id: string): IToolbarBaseElement;
        decomposeSelectedMenu(id: string): {
            hasParent: boolean;
            parent: string;
            selected: string;
        };
        buildElement(parent: string): void;
    }
}

declare module BABYLON.EDITOR.GUI {
    class GUIWindow extends GUIElement<W2UI.IWindowElement> {
        title: string;
        body: string;
        size: Vector2;
        buttons: Array<string>;
        modal: boolean;
        showClose: boolean;
        showMax: boolean;
        onButtonClicked: (buttonId: string) => void;
        private _onCloseCallbacks;
        private _onCloseCallback;
        private _onToggle;
        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore, title: string, body: string, size?: Vector2, buttons?: Array<string>);
        destroy(): void;
        setOnCloseCallback(callback: () => void): void;
        close(): void;
        maximize(): void;
        lock(message?: string): void;
        unlock(): void;
        onToggle: (maximized: boolean, width: number, height: number) => void;
        notify(message: string): void;
        buildElement(parent: string): void;
        static CreateAlert(message: string, title?: string, callback?: () => void): void;
    }
}

declare module BABYLON.EDITOR {
    class AbstractMaterialTool<T extends Material> extends AbstractDatTool {
        private _tabName;
        protected onObjectSupported: (material: Material) => boolean;
        protected material: T;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool, containerID: string, tabID: string, tabName: string);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        protected addTextureButton(name: string, property: string, parentFolder?: dat.IFolderElement, callback?: () => void): dat.IFolderElement;
    }
}

declare module BABYLON.EDITOR {
    class FireMaterialTool extends AbstractMaterialTool<FireMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}

declare module BABYLON.EDITOR {
    class FurMaterialTool extends AbstractMaterialTool<FurMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}

declare module BABYLON.EDITOR {
    class GradientMaterialTool extends AbstractMaterialTool<GradientMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}

declare module BABYLON.EDITOR {
    class GridMaterialTool extends AbstractMaterialTool<GridMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}

declare module BABYLON.EDITOR {
    class LavaMaterialTool extends AbstractMaterialTool<LavaMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}

declare module BABYLON.EDITOR {
    class PBRMaterialTool extends AbstractMaterialTool<PBRMaterial> {
        private _dummyPreset;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
        private _createPresetGlass();
        private _createPresetMetal();
        private _createPresetPlastic();
        private _createPresetWood();
    }
}

declare module BABYLON.EDITOR {
    class SkyMaterialTool extends AbstractMaterialTool<SkyMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}

declare module BABYLON.EDITOR {
    class StandardMaterialTool extends AbstractMaterialTool<StandardMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}

declare module BABYLON.EDITOR {
    class TerrainMaterialTool extends AbstractMaterialTool<TerrainMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}

declare module BABYLON.EDITOR {
    class TriPlanarMaterialTool extends AbstractMaterialTool<TriPlanarMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}

declare module BABYLON.EDITOR {
    class WaterMaterialTool extends AbstractMaterialTool<WaterMaterial> {
        private _rtsEnabled;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
        private _configureReflection();
    }
}
