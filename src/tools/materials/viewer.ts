import {
    FilesInput, Tools as BabylonTools,
    Engine, Scene, Mesh, Material, PointLight,
    ArcRotateCamera,
    Vector3
} from 'babylonjs';
import * as BABYLON from 'babylonjs';

import Editor from '../../editor/editor';
import { EditorPlugin } from '../../editor/typings/plugin';
import Tools from '../../editor/tools/tools';

import Layout from '../../editor/gui/layout';

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

    public preview: PreviewScene = null;

    // Protected members
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

        this.preview.scene.dispose();
        this.preview.engine.dispose();

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
            { type: 'left', content: '<div id="MATERIAL-VIEWER-LIST"></div>', size: panelSize.width / 2, overflow: 'auto', resizable: true },
            { type: 'main', content: '<canvas id="MATERIAL-VIEWER-CANVAS" style="position: absolute; padding: 15px; width: 100%; height: 100%;"></div>', resizable: true }
        ];
        this.layout.build(div.attr('id'));

        // Add preview
        this.preview = this.createPreview(<HTMLCanvasElement> $('#MATERIAL-VIEWER-CANVAS')[0]);
        this.preview.engine.runRenderLoop(() => this.preview.scene.render());

        // Events
        this.editor.core.onResize.add(this.onResizePreview);

        // Add existing textures in list
        await this.createList();
    }

    /**
     * Creates the list of materials (on the left)
     * @param div the tool's div element
     */
    protected async createList (): Promise<void> {
        const div = $('#MATERIAL-VIEWER-LIST');

        // Add HTML nodes
        const canvas = Tools.CreateElement<HTMLCanvasElement>('canvas', 'MaterialsViewerCanvas', {
            width: '100px',
            height: '100px',
            visibility: 'hidden'
        });
        div.append(canvas);

        const scene = this.editor.core.scene;
        const preview = this.createPreview(canvas);

        // For each material
        for (const mat of scene.materials) {
            const img = Tools.CreateElement<HTMLImageElement>('img', mat.id, {
                width: '100px',
                height: '100px',
                float: 'left',
                margin: '10px'
            });

            const base64 = await this.createMaterialPreview(canvas, preview, mat);
            img.src = base64;

            img.addEventListener('click', (ev) => {
                const obj = mat.serialize();
                this.preview.sphere.material = Material.Parse(obj, this.preview.scene, 'file:');
                this.preview.engine.resize();
            });

            div.append(img);
        }

        // Dispose temp preview
        preview.scene.dispose();
        preview.engine.dispose();
        canvas.remove();
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
                    const base64 = canvas.toDataURL('image/png');
                    preview.engine.stopRenderLoop();
                    resolve(base64);
                }
            });
        });
    }
}
