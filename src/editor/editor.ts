import {
    Engine, Scene,
    FreeCamera, Camera,
    Vector3,
    FilesInput, FilesInputStore,
    ArcRotateCamera,
    Tags
} from 'babylonjs';

import { IStringDictionary } from './typings/typings';
import { EditorPluginConstructor, IEditorPlugin } from './typings/plugin';

import Extensions from '../extensions/extensions';

import Core, { IUpdatable } from './core';

import Layout from './gui/layout';
import Dialog from './gui/dialog';
import ResizableLayout from './gui/resizable-layout';
import Tree, { TreeNode } from './gui/tree';
import Window from './gui/window';
import CodeEditor from './gui/code';
import ContextMenu from './gui/context-menu';

import EditorToolbar from './components/toolbar';
import EditorGraph from './components/graph';
import EditorPreview from './components/preview';
import EditorInspector from './components/inspector';
import EditorEditPanel from './components/edit-panel';
import EditorStats from './components/stats';
import EditorAssets from './components/assets';
import EditorFiles from './components/files';

import ScenePicker from './scene/scene-picker';
import ScenePreview from './scene/scene-preview';
import SceneIcons from './scene/scene-icons';
import SceneImporter from './scene/scene-importer';
import SceneLoader from './scene/scene-loader';

import ProjectExporter from './project/project-exporter';
import CodeProjectEditorFactory from './project/project-code-editor';

import Tools from './tools/tools';
import DefaultScene from './tools/default-scene';
import UndoRedo from './tools/undo-redo';
import Request from './tools/request';
import ThemeSwitcher, { ThemeType } from './tools/theme';

import VSCodeSocket from './vscode/vscode-socket';

export default class Editor implements IUpdatable {
    // Public members
    public core: Core;
    public camera: FreeCamera | ArcRotateCamera;
    public playCamera: Camera = null;

    public layout: Layout;
    public resizableLayout: ResizableLayout;

    public toolbar: EditorToolbar;
    public graph: EditorGraph;
    public preview: EditorPreview;
    public inspector: EditorInspector;
    public editPanel: EditorEditPanel;
    public stats: EditorStats;
    public assets: EditorAssets;
    public files: EditorFiles;

    public plugins: IStringDictionary<IEditorPlugin> = { };

    public scenePicker: ScenePicker;
    public sceneIcons: SceneIcons;

    public filesInput: FilesInput;
    public sceneFile: File = null;
    public guiFiles: File[] = [];
    public projectFile: File = null;
    public projectFileName: string = 'scene.editorproject';

    public _showReloadDialog: boolean = true;

    // Private members
    private _lastWaitingItems: number = 0;
    private _canvasFocused: boolean = true;

    // Static members
    public static LayoutVersion: string = '2.2.0';
    public static EditorVersion: string = null;

    /**
     * Constructor
     * @param scene: a scene to edit. If undefined, a default scene will be created
     */
    constructor(scene?: Scene) {
        // Misc.
        Tools.IsStandalone = !scene;
    
        // Create editor div
        const mainDiv = Tools.CreateElement('div', 'BABYLON-EDITOR-MAIN', {
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            margin: '0',
            padding: '0',
            touchAction: 'none',
            position: 'fixed'
        });
        document.body.appendChild(mainDiv);

        // Create layout
        this.layout = new Layout('BABYLON-EDITOR-MAIN');
        this.layout.panels = [
            {
                type: 'top',
                size: 55,
                content: '<a class="babylonjs-logo" href="http://babylonjs.com" target="_blank"></a> <div id="MAIN-TOOLBAR" style="width: 100%; height: 50%;"></div><div id="TOOLS-TOOLBAR" style="width: 100%; height: 50%;"></div>',
                resizable: false
            },
            { type: 'main', content: '<div id="MAIN-LAYOUT" style="width: 100%; height: 100%; overflow: hidden;"></div>', resizable: true, tabs: <any>[] },
            { type: 'bottom', size: 0, content: '', resizable: false }
        ];
        this.layout.build('BABYLON-EDITOR-MAIN');

        // Create resizable layout
        const layoutVersion = localStorage.getItem('babylonjs-editor-layout-version');

        const layoutStateItem = (layoutVersion === Editor.LayoutVersion) ? localStorage.getItem('babylonjs-editor-layout-state') || '{ }' : '{ }';
        const layoutState = JSON.parse(layoutStateItem);

        this.resizableLayout = new ResizableLayout('MAIN-LAYOUT');
        this.resizableLayout.panels = layoutState.content || [{
            type: 'row',
            content:[{
                type: 'row', content: [
                    { type: 'component', componentName: 'Inspector', width: 20, isClosable: false, html: '<div id="EDITION" style="width: 100%; height: 100%; overflow: auto;"></div>' },
                    { type: 'column', content: [
                        { type: 'component', componentName: 'Preview', isClosable: false, html: '<div id="PREVIEW" style="width: 100%; height: 100%;"></div>' },
                        { type: 'stack', id: 'edit-panel', componentName: 'Tools', isClosable: false, height: 20, content: [
                            { type: 'component', componentName: 'Stats', width: 20, isClosable: false, html: `
                                <div id="STATS" style="width: 100%; height: 100%"></div>`
                            },
                            { type: 'component', componentName: 'Files', width: 20, isClosable: false, html: `
                                <div id="FILES" style="width: 100%; height: 100%"></div>`
                            }
                        ] },
                    ] },
                    { type: 'component', componentName: 'Assets', width: 20, isClosable: false, html: `
                        <div id="ASSETS" style="width: 100%; height: 100%;"></div>`
                    },
                    { type: 'component', componentName: 'Graph', width: 20, isClosable: false, html: `
                        <input id="SCENE-GRAPH-SEARCH" type="text" placeHolder="Search" style="width: 100%; height: 40px;" />
                        <div id="SCENE-GRAPH" style="width: 100%; height: calc(100% - 40px); overflow: auto;"></div>`
                    }
                ]
            }]
        }];

        this.resizableLayout.build('MAIN-LAYOUT');

        // Events
        this.layout.element.on({ execute: 'after', type: 'resize' }, () => this.resize());
        this.resizableLayout.onPanelResize = () => this.resize();

        window.addEventListener('resize', () => {
            this.layout.element.resize();
            this.resizableLayout.element.updateSize();
            this.resize();
        });

        // Initialize core
        this.core = new Core();
        this.core.updates.push(this);

        // Initialize preview
        this.preview = new EditorPreview(this);

        // Initialize Babylon.js
        if (!scene) {
            const canvas = <HTMLCanvasElement>document.getElementById('renderCanvasEditor');
            canvas.addEventListener('contextmenu', ev => ev.preventDefault());
            
            this.core.engine = new Engine(canvas, true, {
                antialias: true,
                premultipliedAlpha: false
            });
            this.core.scene = new Scene(this.core.engine);
            this.core.scenes.push(this.core.scene);
        } else {
            // On next frame, add canvas etc.
            scene.onAfterRenderObservable.addOnce(() => {
                // Add canvas
                const currentCanvas = <HTMLCanvasElement>document.getElementById('renderCanvasEditor');
                const newCanvas = scene.getEngine().getRenderingCanvas();

                const parent = currentCanvas.parentElement;

                currentCanvas.remove();
                newCanvas.id = currentCanvas.id;

                parent.appendChild(scene.getEngine().getRenderingCanvas());

                // Reset
                this.graph.clear();
                this.graph.fill();

                this.createScenePicker();
                this.stats.updateStats();
                this.assets.refresh();
                this.files.refresh();
            });

            // Configure core
            this.core.engine = scene.getEngine();
            this.core.scenes.push(scene);
            this.core.scene = scene;

            // Configure editor
            this.camera = <any> scene.activeCamera;
        }

        // Create toolbar
        this.toolbar = new EditorToolbar(this);

        // Create edition tools
        this.inspector = new EditorInspector(this);

        // Create graph
        this.graph = new EditorGraph(this);
        this.graph.currentObject = this.core.scene;

        // Edit panel
        this.editPanel = new EditorEditPanel(this);

        // Stats
        this.stats = new EditorStats(this);
        this.stats.updateStats();

        // Assets
        this.assets = new EditorAssets(this);

        // Files
        this.files = new EditorFiles(this);

        if (Tools.IsStandalone) {
            // Create editor camera
            this.createEditorCamera();

            // Create files input
            this._createFilesInput();
        }

        // Create scene icons
        this.sceneIcons = new SceneIcons(this);

        // Create scene picker
        this.createScenePicker();

        // Handle events
        this._handleEvents();

        // Electron
        if (Tools.IsElectron()) {
            // Scene Preview
            ScenePreview.Create(this);

            // Check for updates
            this._checkUpdates();

            // Check opened file from OS file explorer
            this.checkOpenedFile();

            // Connect to VSCode extension
            VSCodeSocket.Create(this);
        }
        else {
            this.createDefaultScene();
        }

        // Apply theme
        if (Tools.IsStandalone) {
            const theme = <ThemeType> localStorage.getItem('babylonjs-editor-theme-name');
            ThemeSwitcher.ThemeName = theme || 'Light';
        }

        // Initialize context menu
        ContextMenu.Init();
    }

    /**
     * Runs the editor and Babylon.js engine
     */
    public run(): void {
        this.core.engine.runRenderLoop(() => {
            this.core.update();
        });
    }

    /**
    * Resizes elements
    */
    public async resize (): Promise<void> {
        // Edition size
        const editionSize = this.resizableLayout.getPanelSize('Inspector');
        this.inspector.resize(editionSize.width);

        // Stats size
        this.stats.layout.element.resize();
        
        // Resize preview
        this.preview.resize();

        // Edit panel
        const tabsCount = this.resizableLayout.getTabsCount('edit-panel');
        if (tabsCount === 0)
            this.resizableLayout.setPanelSize('edit-panel', 0);

        // Assets
        this.assets.layout.element.resize();

        // Files
        this.files.layout.element.resize();

        // Plugins
        for (const p in this.plugins) {
            const plugin = this.plugins[p];
            try {
                plugin.onResize && await plugin.onResize();
            } catch (e) {
                console.info(`Failed to resize plugin "${p}". The extension may be not ready.`);
            }
        }

        // Notify
        this.core.onResize.notifyObservers(null);
    }

    /**
     * On after render the scene
     */
    public onPostUpdate (): void {
        // Waiting files
        const waiting = this.core.scene.getWaitingItemsCount() + Tools.PendingFilesToLoad;
        if (this._lastWaitingItems !== waiting) {
            this._lastWaitingItems = waiting;

            if (waiting === 0)
                this.layout.unlockPanel('bottom');
            else
                this.layout.lockPanel('bottom', `Waiting for ${waiting} item(s)`, true);
        }
    }

    /**
     * Returns the extension instance identified by the given name
     * @param name the name of the extension
     */
    public getExtension<T> (name: string): T {
        return <any> Extensions.Instances[name];
    }

    /**
     * Adds an "edit panel" plugin
     * @param url the URL of the plugin
     * @param restart: if to restart the plugin
     * @param name: the name of the plugin to show
     * @param params: the params to give to the plugin's constructor
     */
    public async addEditPanelPlugin (url: string, restart: boolean = false, name?: string, ...params: any[]): Promise<IEditorPlugin> {
        if (!Tools.IsStandalone) {
            Window.CreateAlert('Cannot run plugins when using the Editor as scene inspector', 'Error');
            return null;
        }

        if (this.plugins[url]) {
            if (restart) {
                try {
                    await this.removePlugin(this.plugins[url]);
                } catch (e) {
                    console.error(`Error while removing plugin "${url}"`, e);
                }
            }
            else {
                if (this.plugins[url].onReload) {
                    try {
                        await this.plugins[url].onReload();
                    } catch (e) {
                        console.error(`Error while calling .onReload on plugin "${url}"`, e);
                    }
                }

                try {
                    await this.editPanel.showPlugin.apply(this.editPanel, [this.plugins[url]].concat(params));
                } catch (e) {
                    console.error(`Error while calling .showPlugin on plugin "${url}"`, e);
                }
                return this.plugins[url];
            }
        }

        // Lock panel and load plugin
        this.layout.lockPanel('main', `Loading ${name || url} ...`, true);

        try {
            const plugin = await this._runPlugin.apply(this, [url].concat(params));
            this.plugins[url] = plugin;

            // Add tab in edit panel and unlock panel
            this.editPanel.addPlugin(url);
            this.layout.unlockPanel('main');

            // Create and store plugin
            await plugin.create();

            // Resize and unlock panel
            this.resize();

            return plugin;
        } catch (e) {
            delete this.plugins[url];
            console.error(`Error while loading plugin "${url}"`, e);
            throw e;
        }
    }

    /**
     * Removes the given plugin
     * @param plugin: the plugin to remove
     */
    public async removePlugin (plugin: IEditorPlugin, removePanel: boolean = true): Promise<void> {
        try {
            await plugin.close();
        } catch (e) {
            /* Catch silently */
        }

        if (removePanel)
            plugin.divElement.remove();

        for (const p in this.plugins) {
            if (this.plugins[p] === plugin) {
                delete this.plugins[p];
                break;
            }
        }

        // Remove panel
        if (removePanel)
            this.resizableLayout.removePanel(plugin.name);
    }

    /**
     * Restarts the plugins already loaded
     */
    public async restartPlugins (removePanels: boolean = false): Promise<void> {
        // Restart plugins
        for (const p in this.plugins) {
            const plugin = this.plugins[p];
            if (plugin)
                await this.removePlugin(plugin, removePanels);

            await this.addEditPanelPlugin(p, false, plugin ? plugin.name : p);
        }
    }

    /**
	 * Notifies a message at the bottom of the editor
	 * @param message the message to show in notification
	 * @param spinner if the notification should have a spinner
	 * @param timeout time in ms to wait before hidding the message
	 */
	public notifyMessage (message: string, spinner?: boolean, timeout?: number): void {
		if (!message)
			return this.layout.unlockPanel('bottom');

		this.layout.lockPanel('bottom', message, spinner);
		if (timeout)
			setTimeout(() => this.layout.unlockPanel('bottom'), timeout);
    }
    
    /**
     * Checks if the user opened a file
     * @param fullLoad sets if the loader should load newly added files in the scene folder
     */
    public async checkOpenedFile (): Promise<void> {
        const hasOpenedFile = await SceneImporter.CheckOpenedFile(this);

        if (!hasOpenedFile)
            return await this.createDefaultScene();

        const pluginsToLoad = <string[]> JSON.parse(localStorage.getItem('babylonjs-editor-plugins') || '[]');
        pluginsToLoad.forEach(p => this.plugins[p] = null);
    }

    /**
     * Returns the project file looking from the files input store
     */
    public getProjectFileFromFilesInputStore (): File {
        for (const f in FilesInputStore.FilesToLoad) {
            const file = FilesInputStore.FilesToLoad[f];
            if (Tools.GetFileExtension(file.name) === 'editorproject')
                return file;
        }

        return null;
    }

    /**
     * Creates the scene picker
     */
    public createScenePicker (): void {
        if (this.scenePicker)
            this.scenePicker.remove();
        
        this.scenePicker = new ScenePicker(this, this.core.scene, this.core.engine.getRenderingCanvas());
        this.scenePicker.onUpdateMesh = (m) => {
            this.inspector.updateDisplay();
            Tags.AddTagsTo(m, 'modified');
            this.graph.updateObjectMark(m);
        };
        this.scenePicker.onPickedMesh = (m) => {
            if (!this.core.disableObjectSelection)
                this.core.onSelectObject.notifyObservers(m);
        };
    }

    /**
     * Creates the default scene
     * @param showNewSceneDialog if to show a dialog to confirm creating default scene
     * @param emptyScene sets wether or not the default scene would be empty or not
     */
    public async createDefaultScene(showNewSceneDialog: boolean = false, emptyScene: boolean = false): Promise<void> {
        const callback = async () => {
            // Create default scene
            this.layout.lockPanel('main', 'Loading Preview Scene...', true);

            await DefaultScene.Create(this);

            this.graph.clear();
            this.graph.fill();
            
            this.layout.unlockPanel('main');

            // Restart plugins
            this.core.scene.executeWhenReady(async () => {
                if (showNewSceneDialog) {
                    // Create scene picker
                    this.createScenePicker();

                    // Update stats
                    this.stats.updateStats();

                    // Assets and files
                    this.assets.refresh();
                    this.files.refresh();
                }

                // Resize
                this.resize();
            });

            // Fill graph
            this.graph.clear();
            this.graph.fill();

            // Reload plugins
            const pluginsToLoad = <string[]> JSON.parse(localStorage.getItem('babylonjs-editor-plugins') || '[]');
            pluginsToLoad.forEach(p => this.plugins[p] = null);
        }

        if (!showNewSceneDialog)
            return await callback();

        Dialog.Create('Create a new scene?', 'Remove current scene and create a new one?', async (result) => {
            if (result === 'Yes') {
                UndoRedo.Clear();
                CodeProjectEditorFactory.CloseAll();

                this.core.scene.dispose();
                this.core.removeScene(this.core.scene);
                this.core.uiTextures.forEach(ui => ui.dispose());

                const scene = new Scene(this.core.engine);
                this.core.scene = scene;
                this.core.scenes.push(scene);

                this.createEditorCamera();

                // Stats
                this.stats.updateStats();

                // Assets
                this.assets.clear();

                if (emptyScene)
                    await DefaultScene.CreateEmpty(this);
                
                // Create default scene?
                if (!showNewSceneDialog)
                    callback();
                else {
                    this.graph.clear();
                    this.graph.fill();

                    this.assets.refresh();
                    this.files.refresh();

                    this.createScenePicker();
                }

                this.core.onSelectObject.notifyObservers(this.core.scene);
            }
        });
    }
    
    /**
     * Creates the editor camera
     */
    public createEditorCamera (type: 'arc' | 'free' | any = 'free'): Camera {
        // Graph node
        let graphNode: TreeNode = null;
        if (this.camera)
            graphNode = this.graph.getByData(this.camera);

        // Values
        const position = this.core.scene.activeCamera ? this.core.scene.activeCamera.position : new Vector3(0, 5, 25);
        const target = this.core.scene.activeCamera ? this.core.scene.activeCamera['_currentTarget'] || new Vector3(0, 5, 24) : new Vector3(0, 5, 24);

        // Dispose existing camera
        if (this.camera)
            this.camera.dispose();

        // Editor camera
        if (type === 'free') {
            this.camera = new FreeCamera('Editor Camera', position, this.core.scene);
            this.camera.speed = 0.5;
            this.camera.angularSensibility = 3000;
            this.camera.setTarget(target);
            this.camera.attachControl(this.core.engine.getRenderingCanvas(), true);

            // Define target property on FreeCamera
            Object.defineProperty(this.camera, 'target', {
                get: () => { return this.camera.getTarget() },
                set: (v: Vector3) => (<FreeCamera> this.camera).setTarget(v)
            });

            // Traditional WASD controls
            this.camera.keysUp.push(87); // "W"
            this.camera.keysUp.push(90); // "Z"

            this.camera.keysLeft.push(65); //"A"
            this.camera.keysLeft.push(81); // "Q"
            
            this.camera.keysDown.push(83); //"S"
            this.camera.keysRight.push(68); //"D"
        }
        else if (type === 'arc') {
            this.camera = new ArcRotateCamera('Editor Camera', Math.PI / 2, Math.PI / 2, 15, target, this.core.scene);
            this.camera.panningSensibility = 500;
            this.camera.attachControl(this.core.engine.getRenderingCanvas(), true, false);
        }
        else {
            this.camera = <FreeCamera | ArcRotateCamera> Camera.Parse(type, this.core.scene);
        }

        // Configure
        this.camera.maxZ = 10000;

        if (this.core.scene.cameras.length > 1)
            this.camera.doNotSerialize = true;

        // Tags
        Tags.AddTagsTo(this.camera, 'added');

        // Update graph node
        if (graphNode)
            graphNode.data = this.camera;

        // Set as active camera
        this.core.scene.activeCamera = this.camera;

        return this.camera;
    }

    // Handles the events of the editor
    private _handleEvents (): void {
        // Prevent drag'n'drop on document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer && e.dataTransfer.files)
                this.core.onDropFiles.notifyObservers({ target: <HTMLElement> e.target, files: e.dataTransfer.files });
        });
        document.addEventListener('contextmenu', (e) => e.preventDefault());

        // Undo
        UndoRedo.onUndo = (e) => Tools.SetWindowTitle(this.projectFileName + ' *');
        document.addEventListener('keyup', (ev) => {
            if (!CodeEditor.HasOneFocused() && ev.ctrlKey && ev.key === 'z') {
                UndoRedo.Undo();
                this.inspector.updateDisplay();
                ev.preventDefault();
                ev.stopPropagation();
            }
        });

        // Redo
        UndoRedo.onRedo = (e) => Tools.SetWindowTitle(this.projectFileName + ' *');
        document.addEventListener('keyup', (ev) => {
            if (!CodeEditor.HasOneFocused() && ev.ctrlKey && ev.key === 'y') {
                UndoRedo.Redo();
                this.inspector.updateDisplay();
                ev.preventDefault();
                ev.stopPropagation();
            }
        });

        // Focus / Blur
        window.addEventListener('blur', () => this.core.renderScenes = false);
        window.addEventListener('focus', () => this.core.renderScenes = true);

        this.core.engine.getRenderingCanvas().addEventListener('focus', () => this._canvasFocused = true);
        this.core.engine.getRenderingCanvas().addEventListener('blur', () => this._canvasFocused = false);
        this.core.engine.getRenderingCanvas().addEventListener('mousemove', () => this._canvasFocused = true);
        this.core.engine.getRenderingCanvas().addEventListener('mouseleave', () => this._canvasFocused = false);

        // Shift key
        let shiftDown = false;
        document.addEventListener('keydown', ev => !shiftDown && (shiftDown = ev.key === 'Shift'));
        document.addEventListener('keyup', ev => ev.key === 'Shift' && (shiftDown = false));

        // Shotcuts
        document.addEventListener('keyup', ev => this._canvasFocused && !CodeEditor.HasOneFocused() && ev.key === 'b' && this.preview.setToolClicked('bounding-box'));
        document.addEventListener('keyup', ev => this._canvasFocused && !CodeEditor.HasOneFocused() && ev.key === 't' && this.preview.setToolClicked('position'));
        document.addEventListener('keyup', ev => this._canvasFocused && !CodeEditor.HasOneFocused() && ev.key === 'r' && this.preview.setToolClicked('rotation'));

        document.addEventListener('keyup', ev => {
            if (this._canvasFocused && ev.key === 'f') {
                const node = this.core.currentSelectedObject;
                if (!node)
                    return;
                
                ScenePicker.CreateAndPlayFocusAnimation(this.camera.getTarget(), node.globalPosition || node.getAbsolutePosition(), this.camera);
            }
        });

        document.addEventListener('keydown', ev => (ev.ctrlKey || ev.metaKey) && ev.key === 's' && ev.preventDefault());
        document.addEventListener('keyup', ev => (ev.ctrlKey || ev.metaKey) && !shiftDown && ev.key === 's' && ProjectExporter.ExportProject(this));
        document.addEventListener('keyup', ev => (ev.ctrlKey || ev.metaKey) && shiftDown && ev.key === 'S' && ProjectExporter.ExportProject(this, true));

        document.addEventListener('keyup', ev => {
            if (Tools.IsFocusingInputElement() || (!Tree.HasOneFocused() && !this._canvasFocused))
                return;

            switch (ev.keyCode) {
				case 46: // Del.
                    const selected = this.graph.getAllSelected();
                    selected.forEach(s => {
                        if (!s)
                            return;
                        
                        this.graph.onMenuClick('remove', s);
                    });
					break;
                default: break;
            }
        });

        // Save state
        window.addEventListener('beforeunload', () => {
            CodeProjectEditorFactory.CloseAll();

            if (Tools.IsStandalone) {
                const state = JSON.stringify(this.resizableLayout.element.toConfig());
                localStorage.setItem('babylonjs-editor-layout-state', state);

                localStorage.setItem('babylonjs-editor-plugins', JSON.stringify(Object.keys(this.plugins)));
                localStorage.setItem('babylonjs-editor-theme-name', ThemeSwitcher.ThemeName);
                localStorage.setItem('babylonjs-editor-layout-version', Editor.LayoutVersion);
            }
        });
    }

    // Runs the given plugin URL
    private async _runPlugin (url: string, ...params: any[]): Promise<IEditorPlugin> {
        const plugin = await Tools.ImportScript<EditorPluginConstructor>(url);
        const args = [plugin.default, this].concat(params);

        // Check first load
        if (!plugin.default['_Loaded']) {
            plugin.default['OnLoaded'](this);
            plugin.default['_Loaded'] = true;
        }

        const instance = new (Function.prototype.bind.apply(plugin.default, args));

        // Create DOM elements
        const id = instance.name.replace(/ /g, '');
        instance.divElement = <HTMLDivElement> document.getElementById(id) || Tools.CreateElement('div', id, {
            width: '100%',
            height: '100%'
        });

        return instance;
    }

    // Creates the files input class and handlers
    private _createFilesInput (): void {
        // Add files input
        this.filesInput = new FilesInput(this.core.engine, null,
        null,
        (p) => {
            
        },
        null,
        (remaining: number) => {
            // Loading textures
        },
        (files: File[]) => SceneLoader.OnStartingProcessingFiles(this, files),
        (sceneFile) => SceneLoader.OnReloadingScene(this, sceneFile),
        (file, scene, message) => Dialog.Create('Error when loading scene', message, null));

        this.filesInput.monitorElementForDragNDrop(document.getElementById('renderCanvasEditor'));
    }

    // Checks for updates if electron
    private async _checkUpdates (): Promise<void> {
        // Get versions
        Editor.EditorVersion = await Request.Get<string>('/version');

        Tools.Version = Editor.EditorVersion;
        Tools.SetWindowTitle('Untitled');

        const packageJson = await Tools.LoadFile<string>('http://editor.babylonjs.com/package.json?' + Date.now());
        const newVersion = JSON.parse(packageJson).version;

        if (Editor.EditorVersion < newVersion) {
            const answer = await Dialog.Create('Update available!', `An update is available! (v${newVersion}). Would you like to download it?`);
            if (answer === 'No')
                return;

            // Select path to save
            const saveDirectory = await Request.Get<string[]>(`/files:/paths?type=openDirectory`);
            
            // Download!
            const list = await Request.Get<string>('http://editor.babylonjs.com/assets/update/versions.json?' + Date.now());
            const platform = await Request.Get<string>('/osplatform');
            const path = list[newVersion][platform];

            let lastProgress = '';
            const data = await Tools.LoadFile<ArrayBuffer>('http://editor.babylonjs.com/' + path, true, data => {
                const progress = ((data.loaded * 100) / data.total).toFixed(1);

                if (progress !== lastProgress) {
                    this.toolbar.notifyRightMessage(`Downloading update... ${progress}%`);
                    lastProgress = progress;
                }
            });

            // Reset toolbar message
            this.toolbar.notifyRightMessage('');

            // Save!
            await Request.Put('/files:/write?name=' + Tools.GetFilename(path) + '&folder=' + saveDirectory[0], Tools.CreateFile(new Uint8Array(data), path), {
                'Content-Type': 'application/octet-stream'
            });
            
            // Notify
            Window.CreateAlert(`Update has been downloaded and available at: <h3>${saveDirectory[0]}</h3>`, 'Update downloaded!');
        }
    }
}
