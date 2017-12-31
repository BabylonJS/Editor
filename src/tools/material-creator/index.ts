import { Engine, Scene, ArcRotateCamera, Mesh, Vector3 } from 'babylonjs';

import Editor, {
    IDisposable, Tools,
    Layout, Toolbar,
    CodeEditor,
    EditorPlugin
} from 'babylonjs-editor';

import Extensions from '../../extensions/extensions';

export default class MaterialCreator extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;

    public engine: Engine = null;
    public scene: Scene = null;
    public camera: ArcRotateCamera = null;
    public mesh: Mesh = null;

    // Protected members
    protected currentTab: string = 'MATERIAL-CREATOR-EDITOR-CODE';

    protected code: CodeEditor = null;
    protected vertex: CodeEditor = null;
    protected pixel: CodeEditor = null;

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Material Creator');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.layout.element.destroy();
        this.code.editor.dispose();
        this.vertex.editor.dispose();
        this.pixel.editor.dispose();

        this.engine.dispose();

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Create layout
        this.layout = new Layout('MaterialCreatorCode');
        this.layout.panels = [
            { type: 'top', content: '<div id="MATERIAL-CREATOR-TOOLBAR" style="width: 100%; height: 100%;"></div>', size: 30, resizable: false },
            { type: 'left', content: '<canvas id="MATERIAL-CREATOR-CANVAS" style="width: 100%; height: 100%;"></canvas>', size: 300, overflow: 'auto', resizable: true },
            { 
                type: 'main',
                content: `
                    <div id="MATERIAL-CREATOR-EDITOR-CODE" style="width: 100%; height: 100%;"></div>
                    <div id="MATERIAL-CREATOR-EDITOR-VERTEX" style="width: 100%; height: 100%; display: none;"></div>
                    <div id="MATERIAL-CREATOR-EDITOR-PIXEL" style="width: 100%; height: 100%; display: none;"></div>
                `,
                resizable: true,
                tabs: <any>[
                    { id: 'code', caption: 'Code' },
                    { id: 'vertex', caption: 'Vertex' },
                    { id: 'pixel', caption: 'Pixel' }
                ]
            }
        ];
        this.layout.build(this.divElement.id);

        // Create toolbar
        this.toolbar = new Toolbar('MaterialCreatorToolbar');
        this.toolbar.items = [
            
        ];
        this.toolbar.build('MATERIAL-CREATOR-TOOLBAR');

        // Add code editors
        await this.createEditors();

        // Add scene
        this.createScene();
    }

    /**
     * Creates the code editor
     */
    protected async createEditors (): Promise<void> {
        // Create editors
        this.code = new CodeEditor('javascript', await Tools.LoadFile<string>('./assets/templates/material-creator/class.js'));
        await this.code.build('MATERIAL-CREATOR-EDITOR-CODE');

        this.vertex = new CodeEditor('glsl', await Tools.LoadFile<string>('./assets/templates/material-creator/vertex.fx'));
        await this.vertex.build('MATERIAL-CREATOR-EDITOR-VERTEX');

        this.pixel = new CodeEditor('glsl', await Tools.LoadFile<string>('./assets/templates/material-creator/pixel.fx'));
        await this.pixel.build('MATERIAL-CREATOR-EDITOR-PIXEL');

        // Events
        this.layout.getPanelFromType('main').tabs.on('click', (ev) => {
            $('#' + this.currentTab).hide();
            this.currentTab = 'MATERIAL-CREATOR-EDITOR-' + ev.target.toUpperCase();
            $('#' + this.currentTab).show();
        });
    }

    /**
     * Creates the Babylon.js preview scene
     */
    protected createScene (): void {
        this.engine = new Engine(<HTMLCanvasElement>$('#MATERIAL-CREATOR-CANVAS')[0]);
        this.scene = new Scene(this.engine);
        this.camera = new ArcRotateCamera('camera', Math.PI / 4, Math.PI / 4, 25, Vector3.Zero(), this.scene);

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }
}
