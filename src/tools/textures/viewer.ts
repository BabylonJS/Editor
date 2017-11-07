import {
    FilesInput,
    Engine, Scene, BaseTexture, Texture, CubeTexture, Mesh, PBRMaterial,
    PassPostProcess,
    Camera, ArcRotateCamera,
    Vector3
} from 'babylonjs';

import Editor from '../../editor/editor';
import { EditorPlugin } from '../../editor/typings/plugin';
import Tools from '../../editor/tools/tools';

import Layout from '../../editor/gui/layout';
import Toolbar from '../../editor/gui/toolbar';

export interface PreviewScene {
    engine: Engine;
    scene: Scene;
    camera: ArcRotateCamera;
    sphere: Mesh;
    material: PBRMaterial;
}

export default class AnimationEditor extends EditorPlugin {
    // Public members
    public images: JQuery[] = [];
    public layout: Layout = null;
    public toolbar: Toolbar = null;

    public engine: Engine = null;
    public scene: Scene = null;
    public texture: BaseTexture = null;
    public sphere: Mesh = null;
    public material: PBRMaterial = null;
    public camera: Camera = null;
    public postProcess: PassPostProcess = null;

    // Protected members
    protected engines: Engine[] = [];
    protected onResizePreview = () => this.engine.resize();

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
        this.engines.forEach(e => {
            e.scenes.forEach(s => s.dispose());
            e.dispose();
        });
        this.editor.core.onResize.removeCallback(this.onResizePreview);

        this.postProcess.dispose(this.camera);
        this.scene.dispose();
        this.engine.dispose();

        this.toolbar.element.destroy();
        this.layout.element.destroy();

        await super.close();
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
            { type: 'main', content: '<canvas id="TEXTURE-VIEWER-CANVAS" style="position: absolute; padding: 15px; width: 100%; height: 100%;"></div>', resizable: true }
        ];
        this.layout.build(div.attr('id'));

        // Add toolbar
        this.toolbar = new Toolbar('TextureViewerToolbar');
        this.toolbar.items = [{ id: 'add', text: 'Add...', caption: 'Add...', img: 'icon-add' }];
        this.toolbar.onClick = (target) => this.toolbarClicked(target);
        this.toolbar.build('TEXTURE-VIEWER-TOOLBAR');

        // Add preview
        const preview = this.createPreview(<HTMLCanvasElement> $('#TEXTURE-VIEWER-CANVAS')[0]);
        this.engine = preview.engine;
        this.scene = preview.scene;
        this.camera = preview.camera;
        this.sphere = preview.sphere;
        this.material = preview.material;

        this.postProcess = new PassPostProcess('TextureViewerPostProcess', 1.0, this.camera);
        this.postProcess.onApply = (e) => this.texture && e.setTexture('textureSampler', this.texture);

        this.engine.runRenderLoop(() => this.scene.render());

        // Add existing textures in list
        this.createList();

        // Events
        this.editor.core.onResize.add(this.onResizePreview);
    }

    /**
     * When the user clicks on the toolbar
     * @param target: the target button
     */
    protected toolbarClicked (target: string): void {
        switch (target) {
            case 'add':
                this.createFileDialog();
                break;
            default: break;
        }
    }

    /**
     * Creates the list of textures (on the left)
     * @param div the tool's div element
     */
    protected async createList (): Promise<void> {
        this.engines.forEach(e => e.scenes.forEach(s => s.dispose()) && e.dispose());

        const div = $('#TEXTURE-VIEWER-LIST');
        while (div[0].children.length > 0)
            div[0].children[0].remove();

        // Add HTML nodes
        for (const filename in FilesInput.FilesToLoad) {
            const file = FilesInput.FilesToLoad[filename];
            await this.addPreviewNode(file);
        }
    }

    /**
     * Adds a preview node to the textures list
     * @param texturesList: the textures list node
     * @param file: the file to add
     * @param extension: the extension of the file
     */
    protected async addPreviewNode (file: File): Promise<void> {
        const availableExtensions = ['jpg', 'png', 'jpeg', 'bmp', 'dds'];
        const ext = Tools.GetFileExtension(file.name);

        const texturesList = $('#TEXTURE-VIEWER-LIST');

        if (availableExtensions.indexOf(ext) === -1)
            return;

        if (ext === 'dds') {
            const canvas = Tools.CreateElement<HTMLCanvasElement>('canvas', file.name, {
                width: '100px',
                height: '100px',
                float: 'left',
                margin: '10px'
            });
            canvas.addEventListener('click', (ev) => this.setTexture(file.name, ext));
            texturesList.append(canvas);

            const preview = this.createPreview(canvas, file);
            preview.engine.runRenderLoop(() => preview.scene.render());

            this.engines.push(preview.engine);
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
            img.addEventListener('click', (ev) => this.setTexture(file.name, ext));

            texturesList.append(img);

            // Create texture in editor scene
            if (!this.editor.core.scene.textures.find(t => t.name === file.name)) {
                const texture = new Texture('file:' + file.name, this.editor.core.scene);
                texture.name = texture.url = texture.name.replace('file:', '');
            }
        }
    }

    /**
     * Sets the texture in preview canvas
     * @param name: the name of the texture
     */
    protected setTexture (name: string, extension: string): void {
        this.camera.detachPostProcess(this.postProcess);
        this.sphere.setEnabled(false);

        switch (extension) {
            case 'dds':
                this.texture = this.material.reflectionTexture = CubeTexture.CreateFromPrefilteredData('file:' + name, this.scene);
                this.sphere.setEnabled(true);
                break;
            default:
                this.camera.attachPostProcess(this.postProcess);
                this.texture = new Texture('file:' + name, this.scene);
                break;
        }

        this.engine.resize();
    }

    /**
     * Creates a scene to preview cube textures or just the preview panel
     * @param canvas: the HTML Canvas element
     * @param file: the Cube Texture file to add directly
     */
    protected createPreview (canvas: HTMLCanvasElement, file?: File): PreviewScene {
        const engine = new Engine(canvas);
        const scene = new Scene(engine);
        scene.clearColor.set(0, 0, 0, 1);

        const camera = new ArcRotateCamera('TextureCubeCamera', 1, 1, 15, Vector3.Zero(), scene);
        camera.attachControl(canvas);

        const sphere = Mesh.CreateSphere('TextureCubeSphere', 32, 6, scene);
        const material = new PBRMaterial('TextureCubeMaterial', scene);

        if (file)
            material.reflectionTexture = CubeTexture.CreateFromPrefilteredData('file:' + file.name, scene);
        
        sphere.material = material;

        return {
            engine: engine,
            scene: scene,
            camera: camera,
            sphere: sphere,
            material: material
        };
    }

    /**
     * Creates a file selector dialog
     */
    protected createFileDialog (): void {
        Tools.OpenFileDialog(async (files) => {
            this.layout.lockPanel('top', 'Loading...', true);
            
            for (const f of files) {
                FilesInput.FilesToLoad[f.name.toLowerCase()] = f;
                await this.addPreviewNode(f);
            };

            this.layout.unlockPanel('top');
        });
    }
}
