import {
    FilesInput,
    Engine, Scene, Texture, CubeTexture, Mesh, PBRMaterial,
    Camera, ArcRotateCamera,
    Vector3
} from 'babylonjs';

import Editor from '../../editor/editor';
import { EditorPlugin } from '../../editor/typings/plugin';
import Tools from '../../editor/tools/tools';

import Layout from '../../editor/gui/layout';
import Toolbar from '../../editor/gui/toolbar';

export default class AnimationEditor extends EditorPlugin {
    // Public members
    public images: JQuery[] = [];
    public layout: Layout = null;
    public toolbar: Toolbar = null;

    public engine: Engine = null;
    public scene: Scene = null;
    public texture: Texture = null;
    public camera: Camera = null;

    // Protected members
    protected engines: Engine[] = [];

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Texture Viewer');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.toolbar.element.destroy();
        this.layout.element.destroy();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        const panelSize = this.editor.layout.getPanelSize('preview');
        const div = $(this.divElement);

        // Create layout
        this.layout = new Layout('TextureViewer');
        this.layout.panels = [
            { type: 'top', content: '<div id="TEXTURE-VIEWER-TOOLBAR"></div>', size: 30, resizable: false },
            { type: 'left', content: '<div id="TEXTURE-VIEWER-LIST"></div>', size: panelSize.width / 2, overflow: 'auto', resizable: true },
            { type: 'main', content: '<canvas id="TEXTURE-VIEWER-CANVAS" style="width: 100%; height: 100%;"></div>', resizable: true }
        ];
        this.layout.build(div.attr('id'));

        // Add toolbar
        this.toolbar = new Toolbar('TextureViewerToolbar');
        this.toolbar.items = [{ id: 'add', text: 'Add...', caption: 'Add...', img: 'icon-add' }];
        this.toolbar.build('TEXTURE-VIEWER-TOOLBAR');

        // Add preview
        this.engine = new Engine(<HTMLCanvasElement> $('#TEXTURE-VIEWER-CANVAS')[0]);
        
        this.scene = new Scene(this.engine);
        this.scene.clearColor.set(0, 0, 0, 1);

        this.camera = new Camera('TextureViewerCamera', Vector3.Zero(), this.scene);

        this.engine.runRenderLoop(() => this.scene.render());

        // Add existing textures in list
        await this.createList(div);
    }

    /**
     * Creates the list of textures (on the left)
     * @param div the tool's div element
     */
    protected async createList (div: JQuery): Promise<void> {
        this.engines.forEach(e => e.scenes.forEach(s => s.dispose()) && e.dispose());

        while (div.children.length > 0)
            div.first().remove();

        // Add HTML nodes
        const availableExtensions = ['jpg', 'png', 'jpeg', 'bmp', 'dds'];
        const texturesList = $('#TEXTURE-VIEWER-LIST');

        for (const filename in FilesInput.FilesToLoad) {
            const file = FilesInput.FilesToLoad[filename];
            const ext = Tools.GetFileExtension(file.name);

            if (availableExtensions.indexOf(ext) === -1)
                continue;

            if (ext === 'dds') {
                const canvas = Tools.CreateElement<HTMLCanvasElement>('canvas', file.name, {
                    width: '100px',
                    height: '100px',
                    float: 'left',
                    margin: '10px'
                });
                texturesList.append(canvas);

                const engine = new Engine(canvas);
                const scene = new Scene(engine);
                scene.clearColor.set(0, 0, 0, 1);

                const camera = new ArcRotateCamera('TextureCubeCamera', 1, 1, 15, Vector3.Zero(), scene);
                camera.attachControl(canvas);

                const sphere = Mesh.CreateSphere('TextureCubeSphere', 32, 6, scene);
                const material = new PBRMaterial('TextureCubeMaterial', scene);
                material.reflectionTexture = CubeTexture.CreateFromPrefilteredData('file:' + file.name, scene);
                sphere.material = material;

                engine.runRenderLoop(() => scene.render());

                this.engines.push(engine);
            }
            else {
                const data = await Tools.ReadFileAsBase64(file);
                const img = Tools.CreateElement<HTMLImageElement>('img', file.name, {
                    width: '100px',
                    height: '100px',
                    float: 'left',
                    margin: '10px'
                });
                img.src = data;

                texturesList.append(img);
            }
        }
    }
}
