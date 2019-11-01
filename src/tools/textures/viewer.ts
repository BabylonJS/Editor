import {
    Engine, Scene, BaseTexture, Texture, CubeTexture, Mesh, PBRMaterial,
    PassPostProcess,
    Camera, ArcRotateCamera,
    Vector3,
    Tools as BabylonTools, Tags,
    ProceduralTexture,
    RenderTargetTexture,
    Observer,
    DynamicTexture,
    MirrorTexture,
    EnvironmentTextureTools,
    ReflectionProbe,
    FilesInputStore,
    StandardMaterial
} from 'babylonjs';
import { AdvancedDynamicTexture } from 'babylonjs-gui';
import 'babylonjs-procedural-textures';

import Editor, {
    Tools,

    Layout,
    Toolbar,
    Picker,
    Dialog,
    ContextMenu,

    EditorPlugin,
    UndoRedo,
    IStringDictionary,
    ContextMenuItem
} from 'babylonjs-editor';

import AddPureCubeTexture from './add-pure-cube';

export interface PreviewScene {
    engine: Engine;
    scene: Scene;
    camera: ArcRotateCamera;
    sphere: Mesh;
    material: StandardMaterial;
}

export interface TexturePreview {
    texture: BaseTexture;
    text: HTMLElement;
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
    public material: StandardMaterial = null;
    public camera: Camera = null;
    public postProcess: PassPostProcess = null;

    public previewItems: TexturePreview[] = [];

    // Protected members
    protected tempPreview: PreviewScene = null;
    protected tempPreviewCanvas: HTMLCanvasElement = null;

    protected objectModifiedObserver: Observer<any> = null;
    protected objectAddedObserver: Observer<any> = null;

    protected object: any;
    protected property: string;
    protected allowCubes: boolean;

    // Private members
    private _renderTargetObservers: Observer<any>[] = [];
    private _lastRenderTargetObserver: Observer<any> = null;
    private _dropFilesObserver: Observer<any> = null;
    private _refreshing: boolean = false;

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
        if (this.tempPreview) {
            this.tempPreview.scene.dispose();
            this.tempPreview.engine.dispose();
        }

        // Render targets
        this.clearRenderTargetObservers();

        // Events
        this.editor.core.onDropFiles.remove(this._dropFilesObserver);
        this.editor.core.onModifiedObject.remove(this.objectModifiedObserver);
        this.editor.core.onAddObject.remove(this.objectAddedObserver);

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
            { id: 'add', type: 'menu', text: 'Add', caption: 'Add', img: 'icon-add', items: [
                { id: 'from-file', text: 'Add From File...', img: 'icon-add' },
                { id: 'procedural', text: 'Add Procedural...', img: 'icon-shaders' },
                { id: 'render-target', text: 'Add Render Target', img: 'icon-add' },
                { id: 'mirror', text: 'Add Mirror', img: 'icon-reflection' },
                { id: 'reflection-probe', text: 'Reflection Probe', img: 'icon-reflection' },
                { id: 'pure-cube-texture', text: 'Pure Cube Texture...', img: 'icon-dynamic-texture' }
            ] },
            { type: 'break' },
            { id: 'convert-cube-texture', text: 'Convert .dds to .env...', img: 'icon-export' },
            { type: 'break' },
            { id: 'refresh', text: 'Refresh', caption: 'Refresh', img: 'w2ui-icon-reload' }
        ];
        this.toolbar.helpUrl = 'http://doc.babylonjs.com/resources/adding_textures';
        this.toolbar.onClick = (target) => this.toolbarClicked(target);
        this.toolbar.build('TEXTURE-VIEWER-TOOLBAR');

        // Temp preview
        this.tempPreviewCanvas = Tools.CreateElement<HTMLCanvasElement>('canvas', 'TexturesViewerTempCanvas', {
            width: '100px',
            height: '100px',
            visibility: 'hidden'
        });
        div.append(this.tempPreviewCanvas);

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

        // Drop files
        this._dropFilesObserver = this.editor.core.onDropFiles.add(d => {
            if (Tools.IsElementChildOf(d.target, div[0]))
                this.addFromFiles(<any> d.files);
        });

        // Modified object
        this.objectModifiedObserver = this.editor.core.onModifiedObject.add(o => {
            if (!(o instanceof BaseTexture))
                return;

            // Name
            const item = this.previewItems.find(pi => pi.texture === o);
            if (item)
                item.text.innerText = o['url'] || o.name;
            
            // Dynamic texture
            if (this.texture && o instanceof DynamicTexture && this.texture.name === o.name)
                this.setTexture(o.name, 'dynamic-texture', o);
        });

        // Added object
        this.objectAddedObserver = this.editor.core.onAddObject.add(o => {
            if (!(o instanceof BaseTexture))
                return;

            this.addTextureToList(o);
        });
    }

    /**
     * On the user shows the plugin
     */
    public async onShow (object?: any, property?: string, allowCubes?: boolean): Promise<void> {
        this.object = object;
        this.property = property;
        this.allowCubes = allowCubes;

        this.onResize();
    }

    /**
     * Called on the window, layout etc. is resized.
     */
    public onResize (): void {
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
            case 'add:from-file':
                Tools.OpenFileDialog((files) => this.addFromFiles(files));
                break;
            case 'add:procedural':
                this.addProceduralTexture();
                break;
            case 'add:render-target':
                this.addRenderTargetTexture();
                break;
            case 'add:mirror':
                this.addMirrorTexture();
                break;
            case 'add:reflection-probe':
                this.addReflectionProbe();
                break;
            case 'add:pure-cube-texture':
                AddPureCubeTexture.ShowDialog(this.editor, this);
                break;

            case 'convert-cube-texture':
                this.convertCubeTexture();
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
        if (this._refreshing)
            return;
        
        this._refreshing = true;
        this.toolbar.enable('refresh', false);

        // Clear
        if (this.tempPreview) {
            this.tempPreview.scene.dispose();
            this.tempPreview.engine.dispose();
            this.tempPreview = null;
        }

        const div = $('#TEXTURE-VIEWER-LIST');
        while (div[0].children.length > 0)
            div[0].children[0].remove();

        this.clearRenderTargetObservers();
        this.previewItems = [];
        
        // Misc.
        const scene = this.editor.core.scene;
        const promises: Promise<void>[] = [];

        // Add HTML nodes for textures
        for (const tex of scene.textures) {
            promises.push(this.addTextureToList(tex));
        }

        // Add render targets
        for (const tex of scene.customRenderTargets) {
            this.addRenderTargetTexturePreviewNode(tex);
        }

        // Reflection probes
        if (scene.reflectionProbes) {
            for (const tex of scene.reflectionProbes) {
                this.addRenderTargetTexturePreviewNode(tex);
            }
        }

        // Wait to all finished
        try {
            await Promise.all(promises);
        } catch (e) {
            console.log(e);
        }

        // Clear temp preview
        if (this.tempPreview)
            this.tempPreview.engine.stopRenderLoop();
        
        this._refreshing = false;
        this.toolbar.enable('refresh', true);
    }

    /**
     * Adds the given texture to the textures list.
     * @param tex the texture reference to add to the textures list.
     */
    protected async addTextureToList (tex: BaseTexture): Promise<void> {
        if (this.allowCubes !== undefined && tex.isCube && !this.allowCubes || tex instanceof AdvancedDynamicTexture)
            return;

        if (tex instanceof ProceduralTexture) {
            this.addProceduralTexturePreviewNode(tex);
            return;
        }

        if (tex instanceof CubeTexture && tex['_files'] && tex['_files'].length === 6) {
            await this.addPureCubeTexturePreviewNode(tex);
            return;
        }

        if (tex instanceof DynamicTexture) {
            return this.addPreviewNode(null, tex);
        }
        
        let url = tex.name;
        if (!url)
            return;

        if (url.indexOf('file:') === 0)
            url = url.replace('file:', '').toLowerCase();
        
        let file = FilesInputStore.FilesToLoad[url];

        if (!file)
            file = FilesInputStore.FilesToLoad[url.toLowerCase()];
        
        if (file)
            return this.addPreviewNode(file, tex);

        // Mostly GLTF?
        const buffer = tex['_buffer'];
        if (buffer && buffer instanceof Uint8Array) {
            file = Tools.CreateFile(buffer, tex.name + Tools.GetExtensionFromMimeType(tex['_mimeType']));
            return this.addPreviewNode(file, tex);
        }
    }

    /**
     * Adds a preview node to the textures list
     * @param texturesList: the textures list node
     * @param file: the file to add
     * @param extension: the extension of the file
     */
    protected async addPreviewNode (file: File, originalTexture: BaseTexture): Promise<void> {
        const availableExtensions = ['jpg', 'png', 'jpeg', 'bmp', 'dds', 'env'];
        const ext = file ? Tools.GetFileExtension(file.name).toLowerCase() : originalTexture.name;

        if (file &&availableExtensions.indexOf(ext) === -1)
            return;

        const texturesList = $('#TEXTURE-VIEWER-LIST');
        const parent = Tools.CreateElement<HTMLDivElement>('div', originalTexture.name + 'div', {
            'width': '100px',
            'height': '100px',
            'float': 'left',
            'margin': '10px'
        });

        if (ext === 'dds' || ext === 'env') {
            // Canvas
            if (!this.tempPreview)
                this.tempPreview = this.createPreview(this.tempPreviewCanvas);
            
            const data = await new Promise<string>((resolve) => {
                this.tempPreview.material.reflectionTexture = CubeTexture.CreateFromPrefilteredData('file:' + file.name, this.tempPreview.scene);
                this.tempPreview.scene.render();

                this.tempPreview.scene.executeWhenReady(() => {
                    this.tempPreview.scene.render();
                    this.tempPreview.scene.onReadyObservable.clear();

                    const base64 = this.tempPreviewCanvas.toDataURL('image/png');
                    resolve(base64);
                });
            });

            const img = Tools.CreateElement<HTMLImageElement>('img', file.name, {
                width: '100px',
                height: '100px'
            });
            img.src = data;
            img.classList.add('ctxmenu');
            img.addEventListener('click', (ev) => this.setTexture(file.name, ext, originalTexture));
            ContextMenu.ConfigureElement(img, this.getContextMenuItems(originalTexture));
            parent.appendChild(img);

            texturesList.append(parent);

            // Create texture in editor scene
            if (!this.editor.core.scene.textures.find(t => t.name === file.name)) {
                const texture = new Texture('file:' + file.name, this.editor.core.scene);
                texture.name = texture.url = texture.name.replace('file:', '');
            }

            // Drag'n'drop
            const dropListener = this.dragEnd(originalTexture, true);
            img.addEventListener('dragstart', () => this.editor.core.engine.getRenderingCanvas().addEventListener('drop', dropListener));
            img.addEventListener('dragend', () => this.editor.core.engine.getRenderingCanvas().removeEventListener('drop', dropListener));
        }
        else {
            const url = originalTexture instanceof DynamicTexture ? originalTexture.serialize().base64String : URL.createObjectURL(file);
            const filename = file ? file.name : originalTexture.name;

            const img = Tools.CreateElement<HTMLImageElement>('img', filename, {
                width: '100px',
                height: '100px'
            });
            img.src = url;
            img.classList.add('ctxmenu');
            img.onload = () => URL.revokeObjectURL(url);
            img.addEventListener('click', (ev) => this.setTexture(filename, originalTexture instanceof DynamicTexture ? 'dynamic-texture' : ext, originalTexture));
            ContextMenu.ConfigureElement(img, this.getContextMenuItems(originalTexture));
            parent.appendChild(img);

            texturesList.append(parent);

            // Create texture in editor scene
            if (!(originalTexture instanceof DynamicTexture) && !this.editor.core.scene.textures.find(t => t.name === filename)) {
                const texture = new Texture('file:' + filename, this.editor.core.scene);
                texture.name = texture.url = texture.name.replace('file:', '');
            }

            // Drag'n'drop
            const dropListener = this.dragEnd(originalTexture, false);
            img.addEventListener('dragstart', () => this.editor.core.engine.getRenderingCanvas().addEventListener('drop', dropListener));
            img.addEventListener('dragend', () => this.editor.core.engine.getRenderingCanvas().removeEventListener('drop', dropListener));
        }

        // Add text
        const text = Tools.CreateElement<HTMLElement>('small', originalTexture.name + 'text', {
            'float': 'left',
            'width': '100px',
            'left': '50%',
            'top': '5px',
            'transform': 'translate(-50%, -50%)',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
            'overflow': 'hidden',
            'position': 'relative'
        });
        text.innerText = originalTexture['url'] || originalTexture.name;
        parent.appendChild(text);

        // Save preview item
        this.previewItems.push({
            texture: originalTexture,
            text: text
        });
    }

    /**
     * Returns an event called when the user drops a texture on the preview canvas
     * @param texture: the texture to drop on a mesh/instanced-mesh
     */
    protected dragEnd (texture: BaseTexture, isCube: boolean): (ev: DragEvent) => void {
        return (ev: DragEvent) => {
            const scene = this.editor.core.scene;
            const pick = scene.pick(ev.offsetX, ev.offsetY);

            if (!pick.pickedMesh || !pick.pickedMesh.material)
                return;

            // Apply
            const material = pick.pickedMesh.material;
            
            if (isCube) {
                UndoRedo.Push({ baseObject: material, object: material, property: 'reflectionTexture', from: material['reflectionTexture'], to: texture });
                material['reflectionTexture'] = texture;
            }
            else {
                if (material instanceof PBRMaterial) {
                    UndoRedo.Push({ baseObject: material, object: material, property: 'albedoTexture', from: material.albedoTexture, to: texture });
                    material.albedoTexture = texture;
                }
                else {
                    UndoRedo.Push({ baseObject: material, object: material, property: 'diffuseTexture', from: material['diffuseTexture'], to: texture });
                    material['diffuseTexture'] = texture;
                }
            }

            this.editor.core.onSelectObject.notifyObservers(pick.pickedMesh);
        };
    }

    /**
     * Convets a cube texture to 
     */
    protected async convertCubeTexture (): Promise<void> {
        const files = await Tools.OpenFileDialog();
        const results: File[] = [];

        // Notify user
        this.layout.lockPanel('top', 'Converting', true);

        // For each file, create the generated env file
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const ext = Tools.GetFileExtension(f.name);

            if (ext !== 'dds')
                continue;
            
            // Notify converted texture
            this.layout.lockPanel('top', 'Converting ' + f.name, true);

            // Load and convert
            const id = f.name + BabylonTools.RandomId();
            FilesInputStore.FilesToLoad[id] = f;

            try {
                const baseTexture = CubeTexture.CreateFromPrefilteredData('file:' + f.name, this.editor.core.scene);
                const envTextureBuffer = await EnvironmentTextureTools.CreateEnvTextureAsync(baseTexture);

                baseTexture.dispose();
                results.push(Tools.CreateFile(new Uint8Array(envTextureBuffer), f.name.replace('.dds', '.env')));
            } catch (e) {
                // Catch silently
            }
            delete FilesInputStore[id];
        }

        // Download
        results.forEach(r => BabylonTools.Download(r, r.name));

        // Unlock
        this.layout.unlockPanel('top');
    }

    /**
     * Add a pure cube texture preview
     * @param texture the pure cube texture to add
     */
    public async addPureCubeTexturePreviewNode (texture: CubeTexture): Promise<void> {
        const parent = Tools.CreateElement<HTMLDivElement>('div', texture.name + 'div', {
            'width': '100px',
            'height': '100px',
            'float': 'left',
            'margin': '10px'
        });

        // Canvas
        if (!this.tempPreview)
            this.tempPreview = this.createPreview(this.tempPreviewCanvas);
        
        const data = await new Promise<string>(async (resolve) => {
            // Get all faces
            const files: string[] = [];

            for (const f of texture['_files']) {
                const url = f.replace('file:', '');
                let file = FilesInputStore.FilesToLoad[url];
                if (!file)
                    file = FilesInputStore.FilesToLoad[url.toLowerCase()];

                if (file)
                    files.push(await Tools.ReadFileAsBase64(file));
            }
            
            this.tempPreview.material.reflectionTexture = new CubeTexture(texture.name, this.tempPreview.scene, null, false, texture['_files']);
            this.tempPreview.scene.render();

            this.tempPreview.scene.executeWhenReady(() => {
                this.tempPreview.scene.render();
                this.tempPreview.scene.onReadyObservable.clear();

                const base64 = this.tempPreviewCanvas.toDataURL('image/png');
                resolve(base64);
            });
        });

        const img = Tools.CreateElement<HTMLImageElement>('img', texture.name, {
            width: '100px',
            height: '100px'
        });
        img.src = data;
        img.classList.add('ctxmenu');
        img.addEventListener('click', (ev) => this.setTexture(texture.name, 'pure-cube', texture));
        ContextMenu.ConfigureElement(img, this.getContextMenuItems(texture));
        parent.appendChild(img);

        const texturesList = $('#TEXTURE-VIEWER-LIST');
        texturesList.append(parent);

        // Drag'n'drop
        const dropListener = this.dragEnd(texture, true);
        img.addEventListener('dragstart', () => this.editor.core.engine.getRenderingCanvas().addEventListener('drop', dropListener));
        img.addEventListener('dragend', () => this.editor.core.engine.getRenderingCanvas().removeEventListener('drop', dropListener));

        // Add text
        const text = Tools.CreateElement<HTMLElement>('small', texture.name + 'text', {
            'float': 'left',
            'width': '100px',
            'left': '50%',
            'top': '8px',
            'transform': 'translate(-50%, -50%)',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
            'overflow': 'hidden',
            'position': 'relative'
        });
        text.innerText = texture.name;
        parent.appendChild(text);
    }

    /**
     * Add a procedural texture preview
     * @param texture the texture to add
     */
    protected addProceduralTexturePreviewNode (texture: ProceduralTexture): void {
        const parent = Tools.CreateElement<HTMLDivElement>('div', texture.name + 'div', {
            'width': '100px',
            'height': '100px',
            'float': 'left',
            'margin': '10px'
        });

        const canvas = Tools.CreateElement<HTMLCanvasElement>('canvas', texture.name, {
            width: '100px',
            height: '100px'
        });
        canvas.addEventListener('click', (ev) => this.setTexture(texture.name, 'procedural', texture));
        canvas.classList.add('ctxmenu');
        ContextMenu.ConfigureElement(canvas, this.getContextMenuItems(texture));
        parent.appendChild(canvas);

        const pixels = texture.readPixels();
        const context = canvas.getContext('2d');

        const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer), texture.getSize().width, texture.getSize().height);
        context.putImageData(imageData, 0, 0);

        const texturesList = $('#TEXTURE-VIEWER-LIST');
        texturesList.append(parent);

        // Add text
        const text = Tools.CreateElement<HTMLElement>('small', texture.name + 'text', {
            'float': 'left',
            'width': '100px',
            'left': '50%',
            'top': '8px',
            'transform': 'translate(-50%, -50%)',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
            'overflow': 'hidden',
            'position': 'relative'
        });
        text.innerText = texture.name;
        parent.appendChild(text);

        // Save preview item
        this.previewItems.push({
            texture: texture,
            text: text
        });
    }

    /**
     * Adds a render target texture preview
     * @param texture: the render target texture to preview
     */
    protected addRenderTargetTexturePreviewNode (texture: RenderTargetTexture | ReflectionProbe): void {
        const parent = Tools.CreateElement<HTMLDivElement>('div', texture.name + 'div', {
            'width': '100px',
            'height': '100px',
            'float': 'left',
            'margin': '10px'
        });

        // Create canvas
        const canvas = Tools.CreateElement<HTMLCanvasElement>('canvas', texture.name, {
            width: '100px',
            height: '100px'
        });
        canvas.addEventListener('click', (ev) => {
            if (texture instanceof RenderTargetTexture)
                this.setTexture(texture.name, 'rendertarget', texture);
            else
                this.editor.core.onSelectObject.notifyObservers(texture);
        });
        canvas.classList.add('ctxmenu');
        ContextMenu.ConfigureElement(canvas, this.getContextMenuItems(texture));
        parent.appendChild(canvas);

        // Add text
        const text = Tools.CreateElement<HTMLElement>('small', texture.name + 'text', {
            'float': 'left',
            'width': '100px',
            'left': '50%',
            'top': '8px',
            'transform': 'translate(-50%, -50%)',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
            'overflow': 'hidden',
            'position': 'relative'
        });
        text.innerText = texture.name;
        parent.appendChild(text);

        // Add to DOM
        const texturesList = $('#TEXTURE-VIEWER-LIST');
        texturesList.append(parent);

        // Register render
        if (!(texture instanceof RenderTargetTexture))
            return;
        
        let renderId = 0;
        const context = canvas.getContext('2d');
        
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

        // Save preview item
        this.previewItems.push({
            texture: texture,
            text: text
        });
    }
    
    /**
     * Sets the texture in preview canvas
     * @param name: the name of the texture
     */
    protected async setTexture (name: string, extension: string, originalTexture: BaseTexture): Promise<void> {
        this.camera.detachPostProcess(this.postProcess);
        this.sphere.setEnabled(false);

        // Remove last render target observer
        if (this._lastRenderTargetObserver) {
            this.editor.core.scene.onAfterRenderObservable.remove(this._lastRenderTargetObserver);
            this._lastRenderTargetObserver = null;
        }

        // Remove current texture
        if (this.texture) {
            this.texture.dispose();
            this.texture = null;
        }

        // Switch extension and draw result in the right canvas
        switch (extension) {
            case 'dds':
                this.texture = this.material.reflectionTexture = CubeTexture.CreateFromPrefilteredData('file:' + name, this.scene);
                this.sphere.setEnabled(true);
                break;
            case 'env':
                this.texture = this.material.reflectionTexture = new CubeTexture('file:' + name, this.scene);
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
            case 'pure-cube':
                // Get all faces
                const files: string[] = [];

                for (const f of originalTexture['_files']) {
                    const url = f.replace('file:', '');
                    let file = FilesInputStore.FilesToLoad[url];
                    if (!file)
                        file = FilesInputStore.FilesToLoad[url.toLowerCase()];

                    if (file)
                        files.push(await Tools.ReadFileAsBase64(file));
                }
                this.texture = this.material.reflectionTexture = new CubeTexture(originalTexture.name, this.scene, null, false, files, null, null, null, false);
                this.sphere.setEnabled(true);
                break;
            case 'dynamic-texture':
                this.camera.attachPostProcess(this.postProcess);
                this.texture = DynamicTexture.Parse(originalTexture.serialize(), this.scene, '');
                break;
            default:
                this.camera.attachPostProcess(this.postProcess);
                this.texture = new Texture('file:' + name, this.scene);
                break;
        }

        this.engine.resize();

        if (this.object && this.property) {
            UndoRedo.Push({ object: this.object, property: this.property, from: this.object[this.property], to: originalTexture });
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
        const material = new StandardMaterial('TextureCubeMaterial', scene);

        if (file)
            material.reflectionTexture = CubeTexture.CreateFromPrefilteredData('file:' + file.name, scene);
        
        sphere.material = material;

        engine.runRenderLoop(() => scene.render());

        return {
            engine: engine,
            scene: scene,
            camera: camera,
            sphere: sphere,
            material: material
        };
    }

    /**
     * Adds textures from the given files
     * @param files the files array containing the textures
     */
    protected async addFromFiles (files: File[]): Promise<void> {
        this.layout.lockPanel('top', 'Loading...', true);
            
        for (const f of files) {
            FilesInputStore.FilesToLoad[f.name.toLowerCase()] = f;

            // Create texture
            const ext = Tools.GetFileExtension(f.name).toLowerCase();
            let texture: BaseTexture = null;

            switch (ext) {
                case 'dds':
                    texture = CubeTexture.CreateFromPrefilteredData('file:' + f.name, this.editor.core.scene);
                    break;
                case 'env':
                    texture = new CubeTexture('file:' + f.name, this.editor.core.scene);
                    break;
                default:
                    texture = new Texture('file:' + f.name, this.editor.core.scene);
                    break;
            }

            texture.name = texture['url'] = f.name;
            Tags.AddTagsTo(texture, 'added');

            // Add preview node and update tools
            await this.addPreviewNode(f, texture);
            this.editor.inspector.refresh();
        };

        this.layout.unlockPanel('top');
    }

    /**
     * Add a new render target texture
     */
    protected async addRenderTargetTexture (): Promise<void> {
        const name = await Dialog.CreateWithTextInput('Render target name');
        const rt = new RenderTargetTexture(name, 512, this.editor.core.scene, true, true);
        this.editor.core.scene.customRenderTargets.push(rt);

        this.addRenderTargetTexturePreviewNode(rt);
        this.editor.inspector.refresh();

        // Tags
        Tags.AddTagsTo(rt, 'added');
    }

    /**
     * Add a new mirror texture
     */
    protected async addMirrorTexture (): Promise<void> {
        const name = await Dialog.CreateWithTextInput('Mirror texture name');
        const rt = new MirrorTexture(name, 512, this.editor.core.scene, true);
        this.editor.core.scene.customRenderTargets.push(rt);
        
        this.addRenderTargetTexturePreviewNode(rt);
        this.editor.inspector.refresh();

        // Tags
        Tags.AddTagsTo(rt, 'added');
    }

    /**
     * Adds a new reflection probe texture
     */
    protected async addReflectionProbe (): Promise<void> {
        const name = await Dialog.CreateWithTextInput('Reflection probe name');
        const rt = new ReflectionProbe(name, 512, this.editor.core.scene, true, true);
        this.addRenderTargetTexturePreviewNode(rt);
        this.editor.inspector.refresh();

        // Tags
        Tags.AddTagsTo(rt, 'added');
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
                    this.editor.inspector.refresh();
                };
            });
        });
    }

    /**
     * Processes the context menu for the clicked item
     * @param ev the mouse event object
     * @param texture the texture being clicked
     */
    protected getContextMenuItems (texture: BaseTexture | ReflectionProbe): IStringDictionary<ContextMenuItem> {
        return {
            clone: { name: 'Clone', callback: () => {
                const s = texture.serialize();
                const c = Texture.Parse(s, this.editor.core.scene, 'file:');
                c.name = texture.name;
                c.uniqueId = texture.getScene().getUniqueId();

                if (texture['url'])
                    c['url'] = (texture['url'] || texture.name) + BabylonTools.RandomId();

                Tags.AddTagsTo(c, 'added');
                if (c.metadata)
                    delete c.metadata.original;

                if (c instanceof RenderTargetTexture) {
                    this.editor.core.scene.customRenderTargets.push(c);
                    this.addRenderTargetTexturePreviewNode(c);
                }
                else if (c instanceof ReflectionProbe) {
                    this.addRenderTargetTexturePreviewNode(c);
                }
                else {
                    this.addPreviewNode(FilesInputStore.FilesToLoad[c.name.toLowerCase()], c);
                }
            } },
            remove: { name: 'Remove', callback: async () => {
                const objects = this.editor.core.scene.materials
                                .concat(<any> this.editor.core.scene)
                                .concat(<any> this.editor.core.scene.postProcesses);

                objects.forEach(obj => {
                    for (const key in obj) {
                        if (key[0] !== '_' && obj[key] === texture)
                            obj[key] = null;
                    }
                });

                texture.dispose();
                await this.createList();
            } }
        }
    }
}
