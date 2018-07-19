import {
    Engine, Scene, SceneLoader,
    FreeCamera, Camera,
    Vector3,
    FilesInput
} from 'babylonjs';

import { IStringDictionary } from './typings/typings';
import { EditorPluginConstructor, IEditorPlugin } from './typings/plugin';

import Extensions from '../extensions/extensions';

import Core, { IUpdatable } from './core';

import Layout from './gui/layout';
import Dialog from './gui/dialog';
import ResizableLayout from './gui/resizable-layout';

import EditorToolbar from './components/toolbar';
import EditorGraph from './components/graph';
import EditorInspector from './components/inspector';
import EditorEditPanel from './components/edit-panel';
import Stats from './components/stats';

import ScenePicker from './scene/scene-picker';
import SceneManager from './scene/scene-manager';
import ScenePreview from './scene/scene-preview';
import SceneImporter from './scene/scene-importer';
import SceneIcons from './scene/scene-icons';
import SceneExporter from './scene/scene-exporter';

import Tools from './tools/tools';
import DefaultScene from './tools/default-scene';
import UndoRedo from './tools/undo-redo';

export default class Editor implements IUpdatable {
    // Public members
    public core: Core;
    public camera: FreeCamera;
    public playCamera: Camera = null;

    public layout: Layout;
    public resizableLayout: ResizableLayout;

    public toolbar: EditorToolbar;
    public graph: EditorGraph;
    public edition: EditorInspector;
    public editPanel: EditorEditPanel;
    public stats: Stats;

    public plugins: IStringDictionary<IEditorPlugin> = { };

    public scenePicker: ScenePicker;
    public sceneIcons: SceneIcons;

    public filesInput: FilesInput;
    public sceneFile: File = null;
    public guiFiles: File[] = [];
    public projectFile: File = null;

    public _showReloadDialog: boolean = true;

    // Private members
    private _lastWaitingItems: number = 0;
    private _canvasFocused: boolean = true;

    /**
     * Constructor
     * @param scene: a scene to edit. If undefined, a default scene will be created
     */
    constructor(scene?: Scene) {
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
                content: '<div id="MAIN-TOOLBAR" style="width: 100%; height: 50%;"></div><div id="TOOLS-TOOLBAR" style="width: 100%; height: 50%;"></div>',
                resizable: false
            },
            { type: 'main', content: '<div id="MAIN-LAYOUT" style="width: 100%; height: 100%; overflow: hidden;"></div>', resizable: true, tabs: <any>[] },
            { type: 'bottom', size: 0, content: '', resizable: false }
        ];
        this.layout.build('BABYLON-EDITOR-MAIN');

        // Create resizable layout
        const layoutStateItem = /*localStorage.getItem('babylonjs-editor-layout-state') ||*/ '{ }';
        const layoutState = JSON.parse(layoutStateItem)

        this.resizableLayout = new ResizableLayout('MAIN-LAYOUT');
        this.resizableLayout.panels = layoutState.content || [{
            type: 'row',
            content:[{
                type: 'row', content: [
                    { type: 'component', componentName: 'Inspector', width: 20, isClosable: false, html: '<div id="EDITION" style="width: 100%; height: 100%; overflow: auto;"></div>' },
                    { type: 'column', content: [
                        { type: 'component', componentName: 'Preview', isClosable: false, html: '<canvas id="renderCanvas"></canvas>' },
                        { type: 'stack', id: 'edit-panel', componentName: 'Tools', isClosable: false, height: 20, content: [
                            { type: 'component', componentName: 'Stats', width: 20, isClosable: false, html: `
                                <div id="STATS" style="width: 100%; height: 100%"></div>`
                            }
                        ] }
                    ] },
                    { type: 'component', componentName: 'Graph', width: 20, isClosable: false, html: `
                        <input id="SCENE-GRAPH-SEARCH" type="text" placeHolder="Search" style="width: 100%; height: 40px;" />
                        <div id="SCENE-GRAPH" style="width: 100%; height: 100%; overflow: auto;"></div>`
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

        // Initialize Babylon.js
        if (!scene) {
            const canvas = <HTMLCanvasElement>document.getElementById('renderCanvas')
            
            this.core.engine = new Engine(canvas, true, {
                antialias: true
            });
            this.core.scene = new Scene(this.core.engine);
            this.core.scenes.push(this.core.scene);
        } else {
            this.core.engine = scene.getEngine();
            this.core.scenes.push(scene);
            this.core.scene = scene;
        }

        // Create toolbar
        this.toolbar = new EditorToolbar(this);

        // Create edition tools
        this.edition = new EditorInspector(this);

        // Create graph
        this.graph = new EditorGraph(this);
        this.graph.currentObject = this.core.scene;

        // Edit panel
        this.editPanel = new EditorEditPanel(this);

        // Stats
        this.stats = new Stats(this);
        this.stats.updateStats();

        // Create editor camera
        this.createEditorCamera();

        // Create files input
        this._createFilesInput();

        // Create scene icons
        this.sceneIcons = new SceneIcons(this);

        // Create scene picker
        this._createScenePicker();

        // Handle events
        this._handleEvents();

        // Scene Preview
        if (Tools.IsElectron())
            ScenePreview.Create(this);
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
    public resize (): void {
        // Edition size
        const editionSize = this.resizableLayout.getPanelSize('Inspector');
        this.edition.resize(editionSize.width);

        // Stats size
        this.stats.layout.element.resize();
        
        // Engine size
        this.core.engine.resize();

        // Notify
        this.core.onResize.notifyObservers(null);
    }

    /**
     * On after render the scene
     */
    public onPostUpdate (): void {
        // Waiting files
        const waiting = this.core.scene.getWaitingItemsCount();
        if (this._lastWaitingItems !== waiting) {
            this._lastWaitingItems = waiting;

            if (waiting === 0)
                this.layout.unlockPanel('bottom');
            else
                this.layout.lockPanel('bottom', `Waiting for ${waiting} item(s)`, true);
        }
    }

    /**
     * Adds an "edit panel" plugin
     * @param url the URL of the plugin
     * @param restart: if to restart the plugin
     * @param name: the name of the plugin to show
     * @param params: the params to give to the plugin's constructor
     */
    public async addEditPanelPlugin (url: string, restart: boolean = false, name?: string, ...params: any[]): Promise<IEditorPlugin> {
        if (this.plugins[url]) {
            if (restart)
                await this.removePlugin(this.plugins[url]);
            else {
                if (this.plugins[url].onReload)
                    await this.plugins[url].onReload();
                
                await this.editPanel.showPlugin.apply(this.editPanel, [this.plugins[url]].concat(params));
                return this.plugins[url];
            }
        }

        // Lock panel and load plugin
        this.layout.lockPanel('main', `Loading ${name || url} ...`, true);

        const plugin = await this._runPlugin.apply(this, [url].concat(params));
        this.plugins[url] = plugin;

        // Add tab in edit panel and unlock panel
        this.editPanel.addPlugin(url);

        this.layout.unlockPanel('main');

        // Create plugin
        await plugin.create();

        // Resize and unlock panel
        this.resize();

        return plugin;
    }

    /**
     * Removes the given plugin
     * @param plugin: the plugin to remove
     */
    public async removePlugin (plugin: IEditorPlugin): Promise<void> {
        await plugin.close();
        plugin.divElement.remove();

        for (const p in this.plugins) {
            if (this.plugins[p] === plugin) {
                delete this.plugins[p];
                break;
            }
        }

        // Remove panel
        this.resizableLayout.removePanel(plugin.name);
    }

    /**
     * Restarts the plugins already loaded
     */
    public async restartPlugins (): Promise<void> {
        // Restart plugins
        for (const p in this.plugins) {
            const plugin = this.plugins[p];
            await this.removePlugin(plugin);
            await this.addEditPanelPlugin(p, false, plugin.name);
        }
    }

    /**
     * Creates the default scene
     * @param showNewSceneDialog: if to show a dialog to confirm creating default scene
     */
    public async createDefaultScene(showNewSceneDialog: boolean = false): Promise<void> {
        const callback = async () => {
            // Create default scene
            this.layout.lockPanel('main', 'Loading Preview Scene...', true);
            DefaultScene.Create(this).then(() => {
                this.graph.clear();
                this.graph.fill();
                
                this.layout.unlockPanel('main');

                // Restart plugins
                this.core.scene.executeWhenReady(async () => {
                    await this.restartPlugins();

                    if (!showNewSceneDialog) {
                        const pluginsToLoad  = JSON.parse(localStorage.getItem('babylonjs-editor-plugins') || '[]');
                        await Promise.all(pluginsToLoad.map(p => this.addEditPanelPlugin(p, false)));
                    }
                    else {
                        const promises: Promise<any>[] = [
                            // this.addEditPanelPlugin('./build/src/tools/materials/viewer.js', false, 'Material Viewer'),
                            // this.addEditPanelPlugin('./build/src/tools/textures/viewer.js', false, 'Texture Viewer'),
                            // this.addEditPanelPlugin('./build/src/tools/animations/editor.js', false, 'Animations Editor'),
                            // this.addEditPanelPlugin('./build/src/tools/behavior/code.js', false, 'Behavior Code'),
                            // this.addEditPanelPlugin('./build/src/tools/material-creator/index.js', false, 'Material Creator'),
                            // this.addEditPanelPlugin('./build/src/tools/post-process-creator/index.js', false, 'Material Creator')
                        ];

                        await Promise.all(promises);
                    }

                    // Resize
                    this.resize();
                });
            });

            // Fill graph
            this.graph.clear();
            this.graph.fill();

            this.core.onSelectObject.notifyObservers(this.core.scene);

            // List scene preview
            // if (Tools.IsElectron())
            //     ScenePreview.Create();
        }

        if (!showNewSceneDialog)
            return await callback();

        Dialog.Create('Create a new scene?', 'Remove current scene and create a new one?', async (result) => {
            if (result === 'Yes') {
                UndoRedo.Clear();

                this.core.scene.dispose();
                this.core.removeScene(this.core.scene);
                this.core.uiTextures.forEach(ui => ui.dispose());

                const scene = new Scene(this.core.engine);
                this.core.scene = scene;
                this.core.scenes.push(scene);

                this.createEditorCamera();

                // Create default scene
                callback();
            }
        });
    }
    
    /**
     * Creates the editor camera
     */
    protected createEditorCamera (): Camera {
        // Editor camera
        this.camera = new FreeCamera('Editor Camera', this.core.scene.activeCamera ? this.core.scene.activeCamera.position : new Vector3(0, 5, 25), this.core.scene);
        this.camera.speed = 0.5;
        this.camera.angularSensibility = 3000;
        this.camera.setTarget(new Vector3(0, 5, 24));
        this.camera.maxZ = 10000;
        this.camera.attachControl(this.core.engine.getRenderingCanvas(), true);

        // Traditional WASD controls
        this.camera.keysUp.push(87); // "W"
        this.camera.keysUp.push(90); // "Z"

        this.camera.keysLeft.push(65); //"A"
        this.camera.keysLeft.push(81); // "Q"
        
        this.camera.keysDown.push(83); //"S"
        this.camera.keysRight.push(68) //"D"

        // Define target property on FreeCamera
        Object.defineProperty(this.camera, 'target', {
            get: () => { return this.camera.getTarget() },
            set: (v: Vector3) => this.camera.setTarget(v)
        });

        // Set as active camera
        this.core.scene.activeCamera = this.camera;

        return this.camera;
    }

    // Handles the events of the editor
    private _handleEvents (): void {
        // Undo
        UndoRedo.onUndo = (e) => this.core.onGlobalPropertyChange.notifyObservers({ baseObject: e.baseObject, object: e.object, property: e.property, value: e.to, initialValue: e.from });
        document.addEventListener('keyup', (ev) => {
            if (this._canvasFocused && ev.ctrlKey && ev.key === 'z') {
                UndoRedo.Undo();
                this.edition.updateDisplay();
            }
        });

        // Redo
        UndoRedo.onRedo = (e) => this.core.onGlobalPropertyChange.notifyObservers({ baseObject: e.baseObject, object: e.object, property: e.property, value: e.to, initialValue: e.from });
        document.addEventListener('keyup', (ev) => {
            if (this._canvasFocused && ev.ctrlKey && ev.key === 'y') {
                UndoRedo.Redo();
                this.edition.updateDisplay();
            }
        });

        // Focus / Blur
        window.addEventListener('blur', () => this.core.renderScenes = false);
        window.addEventListener('focus', () => this.core.renderScenes = true);

        this.core.engine.getRenderingCanvas().addEventListener('focus', () => this._canvasFocused = true);
        this.core.engine.getRenderingCanvas().addEventListener('blur', () => this._canvasFocused = false);

        // Shotcuts
        document.addEventListener('keyup', ev => this._canvasFocused && ev.key === 't' && this.toolbar.setToolClicked('position'));
        document.addEventListener('keyup', ev => this._canvasFocused && ev.key === 'r' && this.toolbar.setToolClicked('rotation'));

        document.addEventListener('keyup', ev => ev.ctrlKey && ev.key === 's' && SceneExporter.ExportProject(this));

        // Save state
        window.addEventListener('beforeunload', () => {
            const state = JSON.stringify(this.resizableLayout.element.toConfig());
            localStorage.setItem('babylonjs-editor-layout-state', state);

            localStorage.setItem('babylonjs-editor-plugins', JSON.stringify(Object.keys(this.plugins)));
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
        instance.divElement = <HTMLDivElement> Tools.CreateElement('div', instance.name.replace(/ /, ''), {
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
        () => {

        },
        null,
        (remaining: number) => {
            // Loading textures
        },
        () => {
            // Starting process
        },
        (file) => {
            // Callback
            const callback = async (scene: Scene, disposePreviousScene: boolean) => {
                // Configure editor
                this.core.removeScene(this.core.scene, disposePreviousScene);

                this.core.uiTextures.forEach(ui => ui.dispose());
                this.core.uiTextures = [];

                this.core.scene = scene;
                this.core.scenes.push(scene);

                this.playCamera = scene.activeCamera;

                this.createEditorCamera();

                this.core.onSelectObject.notifyObservers(this.core.scene);

                // Clear scene manager
                SceneManager.Clear();

                // Editor project
                if (disposePreviousScene)
                    Extensions.ClearExtensions();
                
                for (const f in FilesInput.FilesToLoad) {
                    const file = FilesInput.FilesToLoad[f];
                    if (Tools.GetFileExtension(file.name) === 'editorproject') {
                        const content = await Tools.ReadFileAsText(file);
                        await SceneImporter.Import(this, JSON.parse(content));
                        break;
                    }
                }

                // Default light
                if (scene.lights.length === 0)
                    scene.createDefaultCameraOrLight(false, false, false);

                // Graph
                this.graph.clear();
                this.graph.fill(scene);

                // Restart plugins
                this.restartPlugins();

                // Create scene picker
                this._createScenePicker();

                // Update stats
                this.stats.updateStats();

                // Toggle interactions (action manager, etc.)
                SceneManager.Toggle(this.core.scene);

                // Run scene
                this.run();

                // Unlock main panel
                this.layout.unlockPanel('main');
            };

            const dialogCallback = async (doNotAppend: boolean) => {
                // Clear undo / redo
                UndoRedo.Clear();

                // Load dependencies
                const extension = Tools.GetFileExtension(file.name);
                if (extension !== 'babylon') {
                    this.layout.lockPanel('main', 'Importing Loaders...', true);
                    await Tools.ImportScript('babylonjs-loaders');
                }

                this.layout.lockPanel('main', 'Importing Physics...', true);
                await Tools.ImportScript('cannon');

                this.layout.lockPanel('main', 'Importing Materials...', true);
                await Tools.ImportScript('babylonjs-materials');

                this.layout.lockPanel('main', 'Importing Procedural Textures...', true);
                await Tools.ImportScript('babylonjs-procedural-textures');

                // Import extensions
                this.layout.lockPanel('main', 'Importing Extensions...', true);
                await Promise.all([
                    Tools.ImportScript('behavior-editor'),
                    Tools.ImportScript('material-creator'),
                    Tools.ImportScript('post-process-creator'),
                    Tools.ImportScript('post-processes'),
                    Tools.ImportScript('path-finder')
                ]);

                this.layout.unlockPanel('main');

                // Stop render loop
                this.core.engine.stopRenderLoop();

                // Clear last path
                SceneExporter.ProjectPath = null;
                
                // Load scene
                if (doNotAppend)
                    SceneLoader.Load('file:', file, this.core.engine, (scene) => callback(scene, true));
                else
                    SceneLoader.Append('file:', file, this.core.scene, (scene) => callback(scene, false));

                // Lock panel and hide loading UI
                this.core.engine.hideLoadingUI();
                this.layout.lockPanel('main', 'Loading Scene...', true);

                // Delete start scene (when starting the editor) and add new scene
                delete FilesInput.FilesToLoad['scene.babylon'];
                FilesInput.FilesToLoad[file.name] = file;
            };

            if (this._showReloadDialog)
                Dialog.Create('Load scene', 'Append to existing one?', (result) => dialogCallback(result === 'No'));
            else
                dialogCallback(true);

            this._showReloadDialog = true;

        }, (file, scene, message) => {
            // Error callback
            Dialog.Create('Error when loading scene', message, null);
        });

        this.filesInput.monitorElementForDragNDrop(document.getElementById('renderCanvas'));
    }

    // Creates the scene picker
    private _createScenePicker (): void {
        if (this.scenePicker)
            this.scenePicker.removeEvents();
        
        this.scenePicker = new ScenePicker(this, this.core.scene, this.core.engine.getRenderingCanvas());
        this.scenePicker.onPickedMesh = (m) => this.core.onSelectObject.notifyObservers(m);
        this.scenePicker.onUpdateMesh = (m) => this.edition.updateDisplay();
    }
}
