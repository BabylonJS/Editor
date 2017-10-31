import {
    Engine, Scene, SceneLoader,
    FreeCamera, Camera,
    Vector3,
    FilesInput
} from 'babylonjs';

import { IStringDictionary } from './typings/typings';
import { EditorPluginConstructor, IEditorPlugin } from './typings/plugin';

import Dialog from './gui/dialog';

import Core from './core';
import Tools from './tools/tools';
import Layout from './gui/layout';

import EditorToolbar from './components/toolbar';
import EditorGraph from './components/graph';
import EditorEditionTools from './components/edition';
import EditorEditPanel from './components/edit-panel';

import ScenePicker from './scene/scene-picker';
import SceneManager from './scene/scene-manager';

import CreateDefaultScene from './tools/default-scene';

export default class Editor {
    // Public members
    public core: Core;
    public camera: FreeCamera;

    public layout: Layout;

    public toolbar: EditorToolbar;
    public graph: EditorGraph;
    public edition: EditorEditionTools;
    public editPanel: EditorEditPanel;

    public plugins: IStringDictionary<IEditorPlugin> = { };

    public scenePicker: ScenePicker;
    public filesInput: FilesInput;

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
            { type: 'left', size: 350, content: '<div id="EDITION" style="width: 100%; height: 100%; overflow: hidden;"></div>', resizable: true, tabs: <any>[] }
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

        // Create scene picker
        this._createScenePicker();
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
     */
    public async addEditPanelPlugin (url: string, name?: string): Promise<IEditorPlugin> {
        this.layout.lockPanel('preview', `Loading ${name || url} ...`, true);

        if (this.plugins[url]) {
            this.editPanel.showPlugin(this.plugins[url]);
            return this.plugins[url];
        }

        const plugin = await this._runPlugin(url);
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
     * Creates the editor camera
     */
    protected createEditorCamera (): Camera {
        this.camera = new FreeCamera("Editor Camera", this.core.scene.activeCamera ? this.core.scene.activeCamera.position : new Vector3(50, 50, 50), this.core.scene);
        this.camera.setTarget(Vector3.Zero());
        this.camera.attachControl(this.core.engine.getRenderingCanvas(), true);

        this.core.scene.activeCamera = this.camera;

        return this.camera;
    }

    // Runs the given plugin URL
    private async _runPlugin (url: string): Promise<IEditorPlugin> {
        const plugin = await Tools.ImportScript<EditorPluginConstructor>(url);
        const instance = new plugin.default(this);

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
            this.scenePicker.remove();
        },
        (file) => {
            Dialog.Create('Load scene', 'Append to existing one?', (result) => {
                const callback = async (scene: Scene) => {
                    // Configure editor
                    this.core.removeScene(this.core.scene);
                    this.core.scene = scene;
                    this.core.scenes.push(scene);

                    // Graph
                    this.graph.clear();
                    this.graph.fill(scene);

                    this.createEditorCamera();

                    // Restart plugins
                    for (const p in this.plugins) {
                        const plugin = this.plugins[p];
                        await this.removePlugin(plugin);
                        await this.addEditPanelPlugin(p, plugin.name);
                    }

                    // Create scene picker
                    this._createScenePicker();

                    // Toggle interactions (action manager, etc.)
                    SceneManager.Clear();
                    SceneManager.Toggle(this.core.scene);

                    // Run scene
                    this.run();
                };

                // Stop render loop
                this.core.engine.stopRenderLoop();

                // Load scene
                if (result === 'No')
                    SceneLoader.Load('file:', file, this.core.engine, (scene) => callback(scene));
                else
                    SceneLoader.Append('file:', file, this.core.scene, (scene) => callback(scene));
            });
        }, () => {

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

    // Creates a default scene
    private async _createDefaultScene(): Promise<void> {
        // Create default scene
        await CreateDefaultScene(this.core.scene);

        // Toggle interactions (action manager, etc.)
        SceneManager.Toggle(this.core.scene);

        // Fill graph
        this.graph.fill();

        //await this.addEditPanelPlugin('./.build/tools/materials/viewer.js', 'Material Viewer');
        //await this.addEditPanelPlugin('./.build/tools/textures/viewer.js', 'Texture Viewer');
        //await this.addEditPanelPlugin('./.build/tools/animations/editor.js', 'Animations Editor');
        this.core.onSelectObject.notifyObservers(this.graph.currentObject);
    }
}
