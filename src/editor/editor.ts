import {
    Engine, Scene, SceneLoader,
    FreeCamera, Camera,
    Vector3,
    FilesInput
} from 'babylonjs';

import { IStringDictionary } from './typings/typings';
import { EditorPluginConstructor, IEditorPlugin } from './typings/plugin';

import Core from './core';

import Layout from './gui/layout';
import Dialog from './gui/dialog';

import EditorToolbar from './components/toolbar';
import EditorGraph from './components/graph';
import EditorEditionTools from './components/edition';
import EditorEditPanel from './components/edit-panel';

import ScenePicker from './scene/scene-picker';
import SceneManager from './scene/scene-manager';
import ScenePreview from './scene/scene-preview';
import SceneImporter from './scene/scene-importer';
import SceneIcons from './scene/scene-icons';

import Tools from './tools/tools';
import DefaultScene from './tools/default-scene';
import UndoRedo from './tools/undo-redo';

export default class Editor {
    // Public members
    public core: Core;
    public camera: FreeCamera;
    public playCamera: Camera = null;

    public layout: Layout;

    public toolbar: EditorToolbar;
    public graph: EditorGraph;
    public edition: EditorEditionTools;
    public editPanel: EditorEditPanel;

    public plugins: IStringDictionary<IEditorPlugin> = { };

    public scenePicker: ScenePicker;
    public sceneIcons: SceneIcons;

    public filesInput: FilesInput;
    public sceneFile: File = null;
    public guiFiles: File[] = [];
    public projectFile: File = null;

    public _showReloadDialog: boolean = true;

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
            { type: 'right', size: 350, content: '<div id="SCENE-GRAPH" style="width: 100%; height: 100%;"></div>', resizable: true },
            { type: 'main', content: '<div id="MAIN-LAYOUT" style="width: 100%; height: 100%; overflow: hidden;"><canvas id="renderCanvas"></canvas></div>', resizable: true, tabs: <any>[] },
            { type: 'preview', size: 200, content: '<div id="EDIT-PANEL-TOOLS" style="width: 100%; height: 100%; overflow: hidden;"></div>', resizable: true, tabs: <any>[] },
            { type: 'left', size: 380, content: '<div id="EDITION" style="width: 100%; height: 100%;"></div>', resizable: true, tabs: <any>[] },
            { type: 'bottom', size: 0, content: '', resizable: false }
        ];
        this.layout.build('BABYLON-EDITOR-MAIN');
        this.layout.element.on({ execute: 'after', type: 'resize' }, () => this.resize());
        window.addEventListener('resize', () => {
            this.layout.element.resize();
            this.resize();
        });

        // Initialize core
        this.core = new Core();

        // Create toolbar
        this.toolbar = new EditorToolbar(this);

        // Create edition tools
        this.edition = new EditorEditionTools(this);

        // Create graph
        this.graph = new EditorGraph(this);

        // Edit panel
        this.editPanel = new EditorEditPanel(this);

        // Initialize Babylon.js
        if (!scene) {
            const canvas = <HTMLCanvasElement>document.getElementById('renderCanvas')
            
            this.core.engine = new Engine(canvas, true);
            this.core.scene = new Scene(this.core.engine);
            this.core.scenes.push(this.core.scene);
        } else {
            this.core.engine = scene.getEngine();
            this.core.scenes.push(scene);
            this.core.scene = scene;
        }

        this.graph.currentObject = this.core.scene;

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
    public resize(): void {
        const editionSize = this.layout.getPanelSize('left');
        this.edition.resize(editionSize.width);
        this.core.engine.resize();

        // Notify
        this.core.onResize.notifyObservers(null);
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
                this.removePlugin(this.plugins[url]);
            else {
                this.editPanel.showPlugin.apply(this.editPanel, [this.plugins[url]].concat(params));
                return this.plugins[url];
            }
        }

        this.layout.lockPanel('preview', `Loading ${name || url} ...`, true);

        const plugin = await this._runPlugin.apply(this, [url].concat(params));
        this.plugins[url] = plugin;

        // Add tab in edit panel
        this.editPanel.addPlugin(plugin);

        // Create plugin
        await plugin.create();

        this.layout.unlockPanel('preview');

        return plugin;
    }

    /**
     * Removes the given plugin
     * @param plugin: the plugin to remove
     */
    public async removePlugin (plugin: IEditorPlugin): Promise<void> {
        await plugin.close();
        plugin.divElement.remove();

        this.editPanel.panel.tabs.remove(plugin.name);

        for (const p in this.plugins) {
            if (this.plugins[p] === plugin) {
                delete this.plugins[p];
                break;
            }
        }
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
            });

            // Fill graph
            this.graph.clear();
            this.graph.fill();

            this.core.onSelectObject.notifyObservers(this.core.scene);

            // List scene preview
            if (Tools.IsElectron())
                ScenePreview.Create();

            // Restart plugins
            await this.restartPlugins();

            const promises: Promise<any>[] = [
                // this.addEditPanelPlugin('./.build/src/tools/materials/viewer.js', false, 'Material Viewer'),
                // this.addEditPanelPlugin('./.build/src/tools/textures/viewer.js', false, 'Texture Viewer'),
                // this.addEditPanelPlugin('./.build/src/tools/animations/editor.js', false, 'Animations Editor'),
                // this.addEditPanelPlugin('./.build/src/tools/behavior/code.js', false, 'Behavior Code'),
                // this.addEditPanelPlugin('./.build/src/tools/material-creator/index.js', false, 'Material Creator'),
                // this.addEditPanelPlugin('./.build/src/tools/post-process-creator/index.js', false, 'Material Creator')
            ];

            await Promise.all(promises);
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
        UndoRedo.onUndo = (e) => this.core.onGlobalPropertyChange.notifyObservers({ object: e.object, property: e.property, value: e.to, initialValue: e.from });
        document.addEventListener('keyup', (ev) => {
            if (ev.ctrlKey && ev.key === 'z') {
                UndoRedo.Undo();
                this.edition.updateDisplay();
            }
        });

        // Redo
        UndoRedo.onRedo = (e) => this.core.onGlobalPropertyChange.notifyObservers({ object: e.object, property: e.property, value: e.to, initialValue: e.from });
        document.addEventListener('keyup', (ev) => {
            if (ev.ctrlKey && ev.key === 'y') {
                UndoRedo.Redo();
                this.edition.updateDisplay();
            }
        });

        // Focus / Blur
        window.addEventListener('blur', () => this.core.renderScenes = false);
        window.addEventListener('focus', () => this.core.renderScenes = true);
    }

    // Runs the given plugin URL
    private async _runPlugin (url: string, ...params: any[]): Promise<IEditorPlugin> {
        const plugin = await Tools.ImportScript<EditorPluginConstructor>(url);
        const args = [plugin.default, this].concat(params);
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
            const callback = async (scene: Scene) => {
                // Configure editor
                this.core.removeScene(this.core.scene);

                this.core.uiTextures.forEach(ui => ui.dispose());
                this.core.uiTextures = [];

                this.core.scene = scene;
                this.core.scenes.push(scene);

                this.playCamera = scene.activeCamera;

                this.createEditorCamera();

                this.core.onSelectObject.notifyObservers(this.core.scene);

                // Editor project
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

                // Toggle interactions (action manager, etc.)
                SceneManager.Clear();
                SceneManager.Toggle(this.core.scene);

                // Run scene
                this.run();
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
                await Tools.ImportScript('cannonjs');

                this.layout.lockPanel('main', 'Importing Materials...', true);
                await Tools.ImportScript('babylonjs-materials');

                // Import extensions
                this.layout.lockPanel('main', 'Importing Extensions...', true);
                await Promise.all([
                    Tools.ImportScript('behavior-editor'),
                    Tools.ImportScript('material-creator'),
                    Tools.ImportScript('post-process-creator'),
                    Tools.ImportScript('post-processes')
                ]);

                this.layout.unlockPanel('main');

                // Stop render loop
                this.core.engine.stopRenderLoop();

                // Load scene
                if (doNotAppend)
                    SceneLoader.Load('file:', file, this.core.engine, (scene) => callback(scene));
                else
                    SceneLoader.Append('file:', file, this.core.scene, (scene) => callback(scene));

                // Delete start scene (when starting the editor) and add new scene
                delete FilesInput.FilesToLoad['scene.babylon'];
                FilesInput.FilesToLoad[file.name] = file;
            };

            if (this._showReloadDialog)
                Dialog.Create('Load scene', 'Append to existing one?', (result) => dialogCallback(result === 'No'));
            else
                dialogCallback(false);

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
            this.scenePicker.remove();
        
        this.scenePicker = new ScenePicker(this, this.core.scene, this.core.engine.getRenderingCanvas());
        this.scenePicker.onPickedMesh = (m) => this.core.onSelectObject.notifyObservers(m);
    }
}
