import {
    Tools as BabylonTools, Engine, Scene, Mesh, Material, PointLight,
    InstancedMesh, AbstractMesh, ArcRotateCamera, Vector3, Tags,
    ShaderMaterial, Observer, NodeMaterial
} from 'babylonjs';

import Editor, {
    Tools,

    Layout,
    Toolbar,
    Picker,
    ContextMenu,

    EditorPlugin,
    UndoRedo
} from 'babylonjs-editor';

export interface PreviewScene {
    engine: Engine;
    scene: Scene;
    camera: ArcRotateCamera;
    sphere: Mesh;
    material: Material;
    light: PointLight;
}

export interface MaterialPreview {
    material: Material;
    image: HTMLImageElement;
    text: HTMLElement;
}

export default class MaterialsViewer extends EditorPlugin {
    // Public members
    public images: JQuery[] = [];
    public layout: Layout = null;
    public toolbar: Toolbar = null;

    public preview: PreviewScene = null;
    public tempPreview: PreviewScene = null;

    public selectedMaterial: Material = null;
    public previewItems: MaterialPreview[] = [];

    // Protected members
    protected canvas: HTMLCanvasElement = null;

    protected engines: Engine[] = [];
    protected waitingMaterials: Material[] = [];
    protected targetObject: AbstractMesh;

    protected onObjectSelected: Observer<any> = null;
    protected onAddObject: Observer<any> = null;
    protected onModifiedObject: Observer<any> = null;
    protected onModifyingObject: Observer<any> = null;

    /**
     * Constructor
     * @param name: the name of the plugin
     */
    constructor(public editor: Editor, targetObject?: AbstractMesh) {
        super('Materials Viewer');

        // Misc.
        this.targetObject = targetObject;
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.engines.forEach(e => {
            e.scenes.forEach(s => s.dispose());
            e.dispose();
        });
        this.editor.core.onAddObject.remove(this.onAddObject);
        this.editor.core.onSelectObject.remove(this.onObjectSelected);
        this.editor.core.onModifiedObject.remove(this.onModifiedObject);
        this.editor.core.onModifyingObject.remove(this.onModifyingObject);

        this.canvas.remove();

        this.preview.scene.dispose();
        this.preview.engine.dispose();

        this.tempPreview.scene.dispose();
        this.tempPreview.engine.dispose();

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
        this.layout = new Layout('MaterialViewer');
        this.layout.panels = [
            { type: 'top', content: '<div id="MATERIAL-VIEWER-TOOLBAR"></div>', size: 30, resizable: false },
            { type: 'left', content: '<div id="MATERIAL-VIEWER-LIST"></div>', size: panelSize.width / 2, overflow: 'auto', resizable: true },
            { type: 'main', content: '<canvas id="MATERIAL-VIEWER-CANVAS" style="position: absolute; padding: 15px; width: 100%; height: 100%;"></canvas>', resizable: true }
        ];
        this.layout.build(div.attr('id'));

        // Add toolbar
        this.toolbar = new Toolbar('MaterialViewerToolbar');
        this.toolbar.items = [
            { id: 'add', text: 'Add...', caption: 'Add...', img: 'icon-add' },
            { id: 'refresh', text: 'Refresh', caption: 'Refresh', img: 'w2ui-icon-reload' }
        ];
        this.toolbar.helpUrl = 'http://doc.babylonjs.com/resources/adding_materials';
        this.toolbar.onClick = (target) => this.toolbarClicked(target);
        this.toolbar.build('MATERIAL-VIEWER-TOOLBAR');

        // Add preview
        this.preview = this.createPreview(<HTMLCanvasElement> $('#MATERIAL-VIEWER-CANVAS')[0]);
        this.preview.engine.runRenderLoop(() => this.preview.scene.render());

        // Add temp preview
        this.canvas = Tools.CreateElement<HTMLCanvasElement>('canvas', 'MaterialsViewerCanvas', {
            width: '100px',
            height: '100px',
            visibility: 'hidden'
        });
        div.append(this.canvas);

        this.tempPreview = this.createPreview(this.canvas);

        // Add existing textures in list
        this.createList();

        // Events
        this.layout.element.on({ execute: 'after', type: 'resize' }, () => this.preview.engine.resize());
        this._bindEvents();

        // Selected object?
        this.selectedObject(this.targetObject);
    }

    /**
     * On the user shows the plugin
     */
    public async onShow (targetObject?: AbstractMesh): Promise<void> {
        for (const m of this.waitingMaterials)
            await this.createPreviewNode($('#MATERIAL-VIEWER-LIST'), this.canvas, this.tempPreview, m);

        this.waitingMaterials = [];

        // Resize
        this.onResize();

        // Misc.
        this.targetObject = targetObject;
        this.selectedObject(targetObject);
    }

    /**
     * Resizes the plugin
     */
    public onResize (): void {
        this.layout.element.resize();
        this.preview.engine.resize();

        // Responsive
        super.resizeLayout(this.layout, ['left'], ['main']);
    }

    /**
     * Once the user selects an object
     * @param obj the selected object in the graph or the scene
     */
    protected selectedObject (obj: any): void {
        this.targetObject = (obj instanceof AbstractMesh && obj !== this.targetObject) ? null : this.targetObject;
        this.toolbar.notifyMessage(this.targetObject ? `<h2>${this.targetObject.name}</h2> Selected` : '');
    }

    /**
     * When the user clicks on the toolbar
     * @param target: the target button
     */
    protected toolbarClicked (target: string): void {
        switch (target) {
            case 'add':
                this.createMaterialDialog();
                break;
            case 'refresh':
                this.createList();
                break;
            default: break;
        }
    }

    /**
     * Creates the list of materials (on the left)
     * @param div the tool's div element
     */
    protected async createList (): Promise<void> {
        const div = $('#MATERIAL-VIEWER-LIST');
        while (div[0].children.length > 0)
            div[0].children[0].remove();

        // Clear previews
        this.previewItems = [];

        // For each material
        const scene = this.editor.core.scene;

        for (const mat of scene.materials)
            await this.createPreviewNode(div, this.canvas, this.tempPreview, mat);
    }

    /**
     * Adds a preview node
     * @param div the div element where to add the preview
     * @param canvas the canvas being used to render mesh with material
     * @param preview the preview structure
     * @param material the material being viewed
     */
    protected async createPreviewNode (div: JQuery, canvas: HTMLCanvasElement, preview: PreviewScene, material: Material): Promise<void> {
        if (material instanceof ShaderMaterial)
            return;
        
        const parent = Tools.CreateElement<HTMLDivElement>('div', material.id + 'div', {
            'width': '100px',
            'height': '100px',
            'float': 'left',
            'margin': '10px'
        });

        const text = Tools.CreateElement<HTMLElement>('small', material.id + 'text', {
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
        text.innerText = material.name;

        const img = Tools.CreateElement<HTMLImageElement>('img', material.id, {
            'width': '100px',
            'height': '100px'
        });
        img.classList.add('ctxmenu');
        ContextMenu.ConfigureElement(img, {
            clone: { name: 'Clone', callback: () => {
                const newMaterial = material.clone(material.name + ' Cloned');
                newMaterial.id = BabylonTools.RandomId();
                Tags.AddTagsTo(newMaterial, 'added');
                
                this.createPreviewNode(div, canvas, preview, newMaterial);
            } },
            remove: { name: 'Remove', callback: () => {
                material.dispose(true, false, false);
                parent.remove();
            } },
            edit: material instanceof NodeMaterial ? { name: 'Edit...', callback: async () => {
                await Tools.ImportScript<any>('babylonjs-node-editor');
                material.edit();
            } } : undefined
        });

        // Add
        parent.appendChild(img);
        parent.appendChild(text);

        const base64 = await this.createMaterialPreview(canvas, preview, material);
        img.src = base64;

        img.addEventListener('click', (ev) => {
            // Clear
            this._clearMaterial();

            // Setup
            const obj = material.serialize();
            obj._customCode = null; // Hack for CustomMaterialEdtitor class
            
            this.preview.sphere.material = Material.Parse(obj, this.preview.scene, 'file:');
            if (this.preview.sphere.material instanceof NodeMaterial)
                this.preview.sphere.material.build();
            
            this.preview.engine.resize();
            this.editor.core.onSelectObject.notifyObservers(material);

            if (this.targetObject)
                this.targetObject.material = material;

            this.selectedMaterial = material;
        });

        // Drag'n'drop
        const dropListener = this.dragEnd(material);
        img.addEventListener('dragstart', () => {
            this.editor.core.engine.getRenderingCanvas().addEventListener('drop', dropListener);
        });

        img.addEventListener('dragend', () => {
            this.editor.core.engine.getRenderingCanvas().removeEventListener('drop', dropListener);
        });

        div.append(parent);

        // Save preview item
        this.previewItems.push({ material: material, image: img, text: text });
    }

    /**
     * Creates a scene to preview cube textures or just the preview panel
     * @param canvas: the HTML Canvas element
     * @param material: the material to add directly
     */
    protected createPreview (canvas: HTMLCanvasElement, material?: Material): PreviewScene {
        const engine = new Engine(canvas);
        const scene = new Scene(engine);
        scene.clearColor.set(0, 0, 0, 1);

        const camera = new ArcRotateCamera('MaterialViewerCamera', 1, 1, 15, Vector3.Zero(), scene);
        camera.attachControl(canvas);

        const sphere = Mesh.CreateSphere('MaterialViewerSphere', 32, 6, scene);
        const light = new PointLight('MaterialViewerLight', new Vector3(20, 20, 20), scene);

        if (material) {
            const obj = material.serialize();
            sphere.material = Material.Parse(obj, scene, 'file:');

            if (sphere.material instanceof NodeMaterial)
                sphere.material.build();
        }

        return {
            engine: engine,
            scene: scene,
            camera: camera,
            sphere: sphere,
            material: material,
            light: light
        };
    }

    /**
     * Create a material preview
     * @param canvas: the HTML Canvas element
     * @param mat: the material to render
     * @param preview the preview object containing the scene, engine, etc. used for the preview
     * @param previewItem the optional preview item that already exists
     */
    protected async createMaterialPreview (canvas: HTMLCanvasElement, preview: PreviewScene, mat: Material): Promise<string> {
        return new Promise<string>((resolve) => {
            // Clear
            if (preview.sphere.material)
                preview.sphere.material.dispose(true, true);
            
            // Create
            const obj = mat.serialize();
            preview.sphere.material = Material.Parse(obj, preview.scene, 'file:');
            preview.sphere.material.onError = () => resolve('./assets/textures/waitlogo.png');

            if (preview.sphere.material instanceof NodeMaterial)
                preview.sphere.material.build();

            preview.scene.render();

            preview.scene.executeWhenReady(() => {
                preview.scene.render();
                preview.scene.onReadyObservable.clear();

                const base64 = canvas.toDataURL('image/png');
                resolve(base64);
            });
        });
    }

    /**
     * Returns an event called when the user drops a material on the canvas
     * @param material: the material to drop on a mesh/instanced-mesh
     */
    protected dragEnd (material: Material): (ev: DragEvent) => void {
        return (ev: DragEvent) => {
            const scene = this.editor.core.scene;
            const pick = scene.pick(ev.offsetX, ev.offsetY);

            if (!pick.pickedMesh)
                return;

            if (pick.pickedMesh instanceof InstancedMesh) {
                pick.pickedMesh.sourceMesh.material = material;
                UndoRedo.Push({ object: pick.pickedMesh.sourceMesh, property: 'material', from: pick.pickedMesh.sourceMesh.material, to: material });
            }
            else if (pick.pickedMesh instanceof Mesh) {
                UndoRedo.Push({ object: pick.pickedMesh, property: 'material', from: pick.pickedMesh.material, to: material });
                pick.pickedMesh.material = material;
            }

            this.editor.core.onSelectObject.notifyObservers(pick.pickedMesh);
        };
    }

    /**
     * Creates a material selector dialog
     */
    protected createMaterialDialog (): void {
        const materials: string[] = [
            'StandardMaterial',
            'PBRMaterial',
            'PBRMetallicRoughnessMaterial',
            'PBRSpecularGlossinessMaterial',
            'NodeMaterial',
            'FireMaterial',
            'CellMaterial',
            'GridMaterial',
            'TriPlanarMaterial',
            'TerrainMaterial',
            'LavaMaterial',
            'MixMaterial'
        ];

        const picker = new Picker('Select Material...');
        picker.addItems(materials.map(m => { return { name: m } }));
        picker.open(async items => {
            const ctor = BabylonTools.Instantiate('BABYLON.' + items[0].name);
            let material: Material;
            if (items[0].name === 'NodeMaterial') {
                await Tools.ImportScript<any>('babylonjs-node-editor');
                material = this._createNodeMaterial(items[0].name + BabylonTools.RandomId().substr(0, 5));
            } else {
                material = new ctor(items[0].name + BabylonTools.RandomId().substr(0, 5), this.editor.core.scene);
            }

            Tags.AddTagsTo(material, 'added');

            // Add preview node
            await this.createPreviewNode($('#MATERIAL-VIEWER-LIST'), this.canvas, this.tempPreview, material);
        });
    }

    // Adds a new node material.
    private _createNodeMaterial (name: string): NodeMaterial {
        const m = new NodeMaterial(name, this.editor.core.scene, { emitComments: true });
        m.setToDefault();
        m.build();

        return m;
    }

    // Clears the current material
    private _clearMaterial (): void {
        if (this.preview.sphere.material) {
            this.preview.sphere.material.dispose(true, false);
            this.preview.sphere.material = null;
        }
    }

    // Binds the vents
    private _bindEvents (): void {
        this.onAddObject = this.editor.core.onAddObject.add((m: Material) => this.waitingMaterials.push(m));
        this.onObjectSelected = this.editor.core.onSelectObject.add(obj => this.selectedObject(obj));
        this.onModifiedObject = this.editor.core.onModifiedObject.add(async (obj: any) => {
            const previewItem = this.previewItems.find(pi => pi.material === obj || pi.material === obj.material);
            if (!previewItem)
                return;

            previewItem.image.src = await this.createMaterialPreview(this.canvas, this.tempPreview, previewItem.material);
            previewItem.text.innerText = previewItem.material.name;
        });
        this.onModifyingObject = this.editor.core.onModifyingObject.add((obj: any) => {
            const previewItem = this.previewItems.find(pi => pi.material === obj || pi.material === obj.material);
            if (!previewItem)
                return;
            
            const data = previewItem.material.serialize();
            data._customCode = null; // Hack for CustomMaterialEdtitor class
            
            this._clearMaterial();
            this.preview.sphere.material = Material.Parse(data, this.preview.scene, 'file:');
        });
    }
}
