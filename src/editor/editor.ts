import {
    Engine, Scene, FreeCamera,
    Vector3
} from 'babylonjs';

import { EditorPluginConstructor } from './typings/plugin';

import Core from './core';
import Tools from './tools/tools';
import Layout from './gui/layout';

import EditorToolbar from './components/toolbar';
import EditorGraph from './components/graph';
import EditorEditionTools from './components/edition';

import CreateDefaultScene from './tools/default-scene';

export default class Editor {
    // Public members
    public core: Core;
    public camera: FreeCamera;

    public layout: Layout;

    public toolbar: EditorToolbar;
    public graph: EditorGraph;
    public edition: EditorEditionTools;

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
            { type: 'preview', size: 200, content: '<div id="TOOLS" style="width: 100%; height: 100%; overflow: hidden;"></div>', resizable: true },
            { type: 'left', size: 350, content: '<div id="EDITION" style="width: 100%; height: 100%; overflow: hidden;"></div>', resizable: true, tabs: <any>[] }
        ];
        this.layout.build('BABYLON-EDITOR-MAIN');
        this.layout.element.on({ execute: 'after', type: 'resize' }, () => this.resize());
        window.addEventListener('resize', () => {
            this.layout.element.resize();
            this.resize();
        });

        // Create toolbar
        this.toolbar = new EditorToolbar(this);

        // Create edition tools
        this.edition = new EditorEditionTools(this);

        // Create graph
        this.graph = new EditorGraph(this);

        // Initialize core and Babylon.js
        this.core = new Core();

        if (!scene) {
            this.core.engine = new Engine(<HTMLCanvasElement>document.getElementById('renderCanvas'));
            this.core.scene = new Scene(this.core.engine);
            this.core.scenes.push(this.core.scene);
        } else {
            this.core.engine = scene.getEngine();
            this.core.scenes.push(scene);
            this.core.scene = scene;
        }

        // Create editor camera
        this.camera = new FreeCamera("Editor Camera", this.core.scene.activeCamera ? this.core.scene.activeCamera.position : Vector3.Zero(), this.core.scene);
        this.camera.attachControl(this.core.engine.getRenderingCanvas());
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
    }

    /**
     * Runs the given plugin URL
     * @param url: the url of the plugin
     */
    public async runPlugin (url: string): Promise<void> {
        const plugin = await Tools.ImportScript<EditorPluginConstructor>(url);
        const instance = new plugin.default(this);

        // Create DOM elements
        instance.divElement = <HTMLDivElement> Tools.CreateElement('div', instance.name, {
            width: '100%',
            height: '100%'
        });
        $('#MAIN-LAYOUT').append(instance.divElement);

        // Create plugin
        await instance.create();
    }

    // Creates a default scene
    private async _createDefaultScene(): Promise<void> {
        await CreateDefaultScene(this.core.scene);
        this.graph.fill();

        // await this.runPlugin('./.build/tools/animations/editor.js');
    }
}
