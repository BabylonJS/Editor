import {
    FilesInput, Tools as BabylonTools,
    Engine, Scene, Mesh, Material, PointLight, InstancedMesh,
    ArcRotateCamera,
    Vector3
} from 'babylonjs';
import * as BABYLON from 'babylonjs';

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
    material: Material;
    light: PointLight;
}

export default class AnimationEditor extends EditorPlugin {
    // Public members
    public images: JQuery[] = [];
    public layout: Layout = null;
    public toolbar: Toolbar = null;

    public preview: PreviewScene = null;

    // Protected members
    protected canvas: HTMLCanvasElement = null;

    protected engines: Engine[] = [];
    protected onResizePreview = () => this.preview.engine.resize();

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Materials Viewer');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.engines.forEach(e => e.scenes.forEach(s => s.dispose()) && e.dispose());
        this.editor.core.onResize.removeCallback(this.onResizePreview);

        this.canvas.remove();

        this.preview.scene.dispose();
        this.preview.engine.dispose();

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
        this.layout = new Layout('MaterialViewer');
        this.layout.panels = [
            { type: 'top', content: '<div id="MATERIAL-VIEWER-TOOLBAR"></div>', size: 30, resizable: false },
            { type: 'left', content: '<div id="MATERIAL-VIEWER-LIST"></div>', size: panelSize.width / 2, overflow: 'auto', resizable: true },
            { type: 'main', content: '<canvas id="MATERIAL-VIEWER-CANVAS" style="position: absolute; padding: 15px; width: 100%; height: 100%;"></canvas>', resizable: true }
        ];
        this.layout.build(div.attr('id'));

        // Add toolbar
        this.toolbar = new Toolbar('MaterialViewerToolbar');
        this.toolbar.items = [{ id: 'add', text: 'Add...', caption: 'Add...', img: 'icon-add' }];
        this.toolbar.onClick = (target) => this.toolbarClicked(target);
        this.toolbar.build('MATERIAL-VIEWER-TOOLBAR');

        // Add preview
        this.preview = this.createPreview(<HTMLCanvasElement> $('#MATERIAL-VIEWER-CANVAS')[0]);
        this.preview.engine.runRenderLoop(() => this.preview.scene.render());

        // Events
        this.editor.core.onResize.add(this.onResizePreview);

        // Add existing textures in list
        await this.createList();
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
            default: break;
        }
    }

    /**
     * Creates the list of materials (on the left)
     * @param div the tool's div element
     */
    protected async createList (): Promise<void> {
        const div = $('#MATERIAL-VIEWER-LIST');

        // Add HTML nodes
        this.canvas = Tools.CreateElement<HTMLCanvasElement>('canvas', 'MaterialsViewerCanvas', {
            width: '100px',
            height: '100px',
            visibility: 'hidden'
        });
        div.append(this.canvas);

        const scene = this.editor.core.scene;
        const preview = this.createPreview(this.canvas);

        // For each material
        for (const mat of scene.materials)
            await this.createPreviewNode(div, this.canvas, preview, mat);

        // Dispose temp preview
        preview.scene.dispose();
        preview.engine.dispose();
    }

    /**
     * Adds a preview node
     * @param div 
     * @param canvas 
     * @param preview 
     * @param material 
     */
    protected async createPreviewNode (div: JQuery, canvas: HTMLCanvasElement, preview: PreviewScene, material: Material): Promise<void> {
        const parent = Tools.CreateElement<HTMLDivElement>('div', material.id + 'div', {
            width: '100px',
            height: '100px',
            float: 'left',
            margin: '10px'
        });

        const text = Tools.CreateElement<HTMLElement>('small', material.id + 'text', {
            float: 'left',
            position: 'relative'
        });
        text.innerText = material.name;
        parent.appendChild(text);

        const img = Tools.CreateElement<HTMLImageElement>('img', material.id, {
            width: '100px',
            height: '100px'
        });
        parent.appendChild(img);

        const base64 = await this.createMaterialPreview(canvas, preview, material);
        img.src = base64;

        img.addEventListener('click', (ev) => {
            const obj = material.serialize();
            this.preview.sphere.material = Material.Parse(obj, this.preview.scene, 'file:');
            this.preview.engine.resize();
            this.editor.core.onSelectObject.notifyObservers(material);
        });

        // Drag'n'drop
        let dropListener = this.dragEnd(material);

        img.addEventListener('dragstart', () => {
            this.editor.core.engine.getRenderingCanvas().addEventListener('drop', dropListener);
        });

        img.addEventListener('dragend', () => {
            this.editor.core.engine.getRenderingCanvas().removeEventListener('drop', dropListener);
        });

        div.append(parent);
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
     */
    protected async createMaterialPreview (canvas: HTMLCanvasElement, preview: PreviewScene, mat: Material): Promise<string> {
        return new Promise<string>((resolve) => {
            const obj = mat.serialize();
            preview.sphere.material = Material.Parse(obj, preview.scene, 'file:');

            preview.engine.runRenderLoop(() => {
                preview.scene.render();
                
                if (preview.scene.getWaitingItemsCount() === 0) {
                    preview.scene.render();
                    const base64 = canvas.toDataURL('image/png');
                    preview.engine.stopRenderLoop();
                    resolve(base64);
                }
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

            if (pick.pickedMesh instanceof InstancedMesh)
                pick.pickedMesh.sourceMesh.material = material;
            else if (pick.pickedMesh instanceof Mesh)
                pick.pickedMesh.material = material;
        };
    }

    /**
     * Creates a material selector dialog
     */
    protected createMaterialDialog (): void {
        const materials: string[] = [
            'StandardMaterial',
            'PBRMaterial'
        ];

        const picker = new Picker('Select Material...');
        picker.addItems(materials.map(m => { return { name: m } }));
        picker.open(async items => {
            const ctor = BabylonTools.Instantiate('BABYLON.' + items[0].name);
            const material = new ctor(items[0].name + BabylonTools.RandomId(), this.editor.core.scene);
    
            // Add preview node
            const preview = this.createPreview(this.canvas);
            await this.createPreviewNode($('#MATERIAL-VIEWER-LIST'), this.canvas, preview, material);
    
            preview.scene.dispose();
            preview.engine.dispose();
        });
    }
}
