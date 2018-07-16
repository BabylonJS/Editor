import {
    FilesInput,
    Engine, Scene, BaseTexture, Texture, CubeTexture, Mesh, PBRMaterial,
    PassPostProcess,
    Camera, ArcRotateCamera,
    Vector3,
    Tools as BabylonTools, Tags,
    ProceduralTexture,
    RenderTargetTexture,
    Observer,
    DynamicTexture,
    MirrorTexture
} from 'babylonjs';
import 'babylonjs-procedural-textures';

import Editor, {
    Tools,

    Layout,
    Toolbar,
    Picker,

    EditorPlugin
} from 'babylonjs-editor';

export interface PreviewScene {
    engine: Engine;
    scene: Scene;
    camera: ArcRotateCamera;
    sphere: Mesh;
    material: PBRMaterial;
}

export default class TextureViewer extends EditorPlugin {
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
    protected onResizePreview = () => this.resize();

    protected object: any;
    protected property: string;
    protected allowCubes: boolean;

    // Private members
    private _renderTargetObservers: Observer<any>[] = [];
    private _lastRenderTargetObserver: Observer<any> = null;

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor, object?: any, property?: string, allowCubes?: boolean) {
        super('Texture Viewer');

        this.object = object;
        this.property = property;
        this.allowCubes = allowCubes;
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

        // Render targets
        this.clearRenderTargetObservers();

        // Dispose
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
        const panelSize = this.editor.resizableLayout.getPanelSize(this.name);
        const div = $(this.divElement);

        // Create layout
        this.layout = new Layout('TextureViewer');
        this.layout.panels = [
            { type: 'top', content: '<div id="TEXTURE-VIEWER-TOOLBAR"></div>', size: 30, resizable: false },
            { type: 'left', content: '<div id="TEXTURE-VIEWER-LIST"></div>', size: panelSize.width / 2, overflow: 'auto', resizable: true },
            { type: 'main', content: '<canvas id="TEXTURE-VIEWER-CANVAS" style="position: absolute; padding: 15px; width: 100%; height: 100%;"></canvas>', resizable: true }
        ];
        this.layout.build(div.attr('id'));

        // Add toolbar
        this.toolbar = new Toolbar('TextureViewerToolbar');
        this.toolbar.items = [
            { id: 'add', text: 'Add...', caption: 'Add...', img: 'icon-add' },
            { id: 'add-procedural', text: 'Add Procedural...', img: 'icon-add' },
            { id: 'add-render-target', text: 'Add Render Target...', img: 'icon-add' },
            { id: 'add-mirror', text: 'Add Mirror...', img: 'icon-add' },
            { type: 'break' },
            { id: 'refresh', text: 'Refresh', caption: 'Refresh', img: 'w2ui-icon-reload' }
        ];
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
     * On the user shows the plugin
     */
    public async onShow (object?: any, property?: string, allowCubes?: boolean): Promise<void> {
        this.object = object;
        this.property = property;
        this.allowCubes = allowCubes;

        this.resize();
    }

    /**
     * Resizes the plugin
     */
    protected resize (): void {
        this.layout.element.resize();
        this.engine.resize();

        // Responsive
        super.resizeLayout(this.layout, ['left'], ['main']);
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
            case 'add-procedural':
                this.addProceduralTexture();
                break;
            case 'add-render-target':
                this.addRenderTargetTexture();
                break;
            case 'add-mirror':
                this.addMirrorTexture();
                break;

            case 'refresh':
                this.createList();
                break;
            default: break;
        }
    }

    /**
     * Clears all the observers
     */
    protected clearRenderTargetObservers (): void {
        this._renderTargetObservers.forEach(r => this.editor.core.scene.onAfterRenderObservable.remove(r));
        
        if (this._lastRenderTargetObserver) {
            this.editor.core.scene.onAfterRenderObservable.remove(this._lastRenderTargetObserver);
            this._lastRenderTargetObserver = null;
        }
    }

    /**
     * Creates the list of textures (on the left)
     * @param div the tool's div element
     */
    protected async createList (): Promise<void> {
        // Clear
        this.engines.forEach(e => e.scenes.forEach(s => s.dispose()) && e.dispose());

        const div = $('#TEXTURE-VIEWER-LIST');
        while (div[0].children.length > 0)
            div[0].children[0].remove();

        this.clearRenderTargetObservers();

        // Add HTML nodes for textures
        for (const tex of this.editor.core.scene.textures) {
            if (this.allowCubes !== undefined && tex.isCube && !this.allowCubes)
                continue;

            if (tex instanceof ProceduralTexture) {
                this.addProceduralTexturePreviewNode(tex);
                continue;
            }
            
            let url = <string> tex['url'];
            if (!url)
                continue;

            if (url.indexOf('file:') === 0)
                url = url.replace('file:', '').toLowerCase();
            
            let file = FilesInput.FilesToLoad[url];

            if (!file)
                file = FilesInput.FilesToLoad[url.toLowerCase()];
            
            if (file)
                this.addPreviewNode(file, tex);
        }

        // Add render targets
        for (const tex of this.editor.core.scene.customRenderTargets) {
            this.addRenderTargetTexturePreviewNode(tex);
        }
    }

    /**
     * Adds a preview node to the textures list
     * @param texturesList: the textures list node
     * @param file: the file to add
     * @param extension: the extension of the file
     */
    protected async addPreviewNode (file: File, originalTexture: BaseTexture): Promise<void> {
        const availableExtensions = ['jpg', 'png', 'jpeg', 'bmp', 'dds'];
        const ext = Tools.GetFileExtension(file.name).toLowerCase();

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
            canvas.addEventListener('click', (ev) => this.setTexture(file.name, ext, originalTexture));
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
            img.addEventListener('click', (ev) => this.setTexture(file.name, ext, originalTexture));

            texturesList.append(img);

            // Create texture in editor scene
            if (!this.editor.core.scene.textures.find(t => t.name === file.name)) {
                const texture = new Texture('file:' + file.name, this.editor.core.scene);
                texture.name = texture.url = texture.name.replace('file:', '');
            }
        }
    }

    /**
     * Add a procedural texture preview
     * @param texture the texture to add
     */
    protected addProceduralTexturePreviewNode (texture: ProceduralTexture): void {
        const canvas = Tools.CreateElement<HTMLCanvasElement>('canvas', texture.name, {
            width: '100px',
            height: '100px',
            float: 'left',
            margin: '10px'
        });
        canvas.addEventListener('click', (ev) => this.setTexture(texture.name, 'procedural', texture));

        const pixels = texture.readPixels();
        const context = canvas.getContext('2d');

        const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer), texture.getSize().width, texture.getSize().height);
        context.putImageData(imageData, 0, 0);

        const texturesList = $('#TEXTURE-VIEWER-LIST');
        texturesList.append(canvas);
    }

    /**
     * Adds a render target texture preview
     * @param texture: the render target texture to preview
     */
    protected addRenderTargetTexturePreviewNode (texture: RenderTargetTexture): void {
        // Create canvas
        const canvas = Tools.CreateElement<HTMLCanvasElement>('canvas', texture.name, {
            width: '100px',
            height: '100px',
            float: 'left',
            margin: '10px'
        });
        canvas.addEventListener('click', (ev) => this.setTexture(texture.name, 'rendertarget', texture));

        const context = canvas.getContext('2d');

        // Add to DOM
        const texturesList = $('#TEXTURE-VIEWER-LIST');
        texturesList.append(canvas);

        // Register render
        let renderId = 0;
        this._renderTargetObservers.push(this.editor.core.scene.onAfterRenderObservable.add(() => {
            if (renderId < 10) {
                renderId++;
                return;
            }

            renderId = 0;

            // Resize canvas
            canvas.width = texture.getSize().width;
            canvas.height = texture.getSize().height;

            const pixels = texture.readPixels();
            const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer), canvas.width, canvas.height);

            context.putImageData(imageData, 0, 0);
            context.rotate(Math.PI);
        }));
    }
    
    /**
     * Sets the texture in preview canvas
     * @param name: the name of the texture
     */
    protected setTexture (name: string, extension: string, originalTexture: BaseTexture): void {
        this.camera.detachPostProcess(this.postProcess);
        this.sphere.setEnabled(false);

        // Remove last render target observer
        if (this._lastRenderTargetObserver) {
            this.editor.core.scene.onAfterRenderObservable.remove(this._lastRenderTargetObserver);
            this._lastRenderTargetObserver = null;
        }

        // Switch extension and draw result in the right canvas
        switch (extension) {
            case 'dds':
                this.texture = this.material.reflectionTexture = CubeTexture.CreateFromPrefilteredData('file:' + name, this.scene);
                this.sphere.setEnabled(true);
                break;
            case 'procedural':
                this.camera.attachPostProcess(this.postProcess);
                this.texture = ProceduralTexture.Parse(originalTexture.serialize(), this.scene, '');
                (<ProceduralTexture> this.texture).refreshRate = 1;
                break;
            case 'rendertarget':
                this.camera.attachPostProcess(this.postProcess);
                this.texture = new DynamicTexture(name, { width: originalTexture.getSize().width, height: originalTexture.getSize().height }, this.scene, false);

                this._lastRenderTargetObserver = this.editor.core.scene.onAfterRenderObservable.add(() => {
                    const pixels = originalTexture.readPixels();
                    const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer), originalTexture.getSize().width, originalTexture.getSize().height);

                    (<DynamicTexture> this.texture).getContext().putImageData(imageData, 0, 0);
                    (<DynamicTexture> this.texture).update(false);
                });
                break;
            default:
                this.camera.attachPostProcess(this.postProcess);
                this.texture = new Texture('file:' + name, this.scene);
                break;
        }

        this.engine.resize();

        if (this.object && this.property) {
            this.object[this.property] = originalTexture;
        }
        else {
            // Send object selected
            this.editor.core.onSelectObject.notifyObservers(originalTexture);
        }
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

                // Create texture
                const ext = Tools.GetFileExtension(f.name).toLowerCase();
                let texture: BaseTexture = null;

                switch (ext) {
                    case 'dds':
                        texture = CubeTexture.CreateFromPrefilteredData('file:' + f.name, this.editor.core.scene);
                        break;
                    default:
                        texture = new Texture('file:' + f.name, this.editor.core.scene);
                        break;
                }

                texture.name = texture['url'] = f.name;

                // Add preview node
                await this.addPreviewNode(f, texture);
            };

            this.layout.unlockPanel('top');
        });
    }

    /**
     * Add a new render target texture
     */
    protected addRenderTargetTexture (): void {
        const rt = new RenderTargetTexture('New Render Target', 512, this.editor.core.scene, true, true);
        this.editor.core.scene.customRenderTargets.push(rt);

        this.addRenderTargetTexturePreviewNode(rt);

        // Tags
        Tags.AddTagsTo(rt, 'added');
    }

    /**
     * Add a new mirror texture
     */
    protected addMirrorTexture (): void {
        const rt = new MirrorTexture('New Mirror Texture', 512, this.editor.core.scene, true);
        this.addRenderTargetTexturePreviewNode(rt);
    }

    /**
     * Opens the procedural textures picker
     */
    protected addProceduralTexture (): void {
        const textures: string[] = [
            'BrickProceduralTexture',
            'CloudProceduralTexture',
            'FireProceduralTexture',
            'GrassProceduralTexture',
            'MarbleProceduralTexture',
            'NormalMapProceduralTexture',
            'PerlinNoiseProceduralTexture',
            'RoadProceduralTexture',
            'StarfieldProceduralTexture',
            'WoodProceduralTexture'
        ];

        const picker = new Picker('Procedural Texture Picker');
        picker.addItems(textures.map(t => { return { name: t } }));
        picker.open(items => {
            items.forEach(i => {
                const ctor = BabylonTools.Instantiate('BABYLON.' + i.name);
                const texture = <ProceduralTexture> new ctor(i.name + BabylonTools.RandomId().substr(0, 5), 512, this.editor.core.scene);
                texture.refreshRate = -1;

                texture.onGenerated = () => {
                    texture.onGenerated = undefined;
                    this.addProceduralTexturePreviewNode(texture);
                };
            });
        });
    }
}
