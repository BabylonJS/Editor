import { Vector2, Light, Tools as BabylonTools, Camera, Mesh, Tags, ParticleSystem, InstancedMesh, MeshLODLevel } from 'babylonjs';

import Layout from '../gui/layout';
import Toolbar from '../gui/toolbar';
import ContextMenu from '../gui/context-menu';

import Editor from '../editor';

import Window from "../gui/window";

import { GizmoType } from '../scene/scene-picker';
import { AvailablePaintingTools } from '../painting/painting-tools';

interface ComputedLODMesh {
    mesh: Mesh;
    levels: MeshLODLevel[];
}

export default class EditorPreview {
    /**
     * The layout used to draw canvas and toolbars.
     */
    public layout: Layout;
    /**
     * The main preview toolbar.
     */
    public toolbar: Toolbar;
    /**
     * The tools toolbar (painting tools, etc.).
     */
    public toolsToolbar: Toolbar;

    private _nodeToCopy: any = null;

    private _lodQuality: number = -1;
    private _lodComputedMeshes: ComputedLODMesh[] = [];

    /**
     * Constructor
     * @param editor: the editor reference
     */
    constructor (protected editor: Editor) {
        // Layout
        this.layout = new Layout('PREVIEW');
        this.layout.panels = [
            { type: 'top', size: 30, resizable: false, content: '<div id="PREVIEW-TOOLBAR" style="width: 100%; height: 100%;"></div>' },
            { type: 'main', resizable: false, content: '<canvas id="renderCanvasEditor" class="ctxmenu"></canvas>' },
            { type: 'bottom', resizable: false, size: 30, content: '<div id="RENDER-CANVAS-CONTAINER" style="width: 100%; height: 100%;"></div>' }
        ];
        this.layout.build('PREVIEW');

        // Toolbar
        this.toolbar = new Toolbar('PREVIEW-TOOLBAR');
        this.toolbar.onClick = id => this.onToolbarClicked(id);
        this.toolbar.items = [
            { type: 'menu', id: 'camera', text: 'Camera', img: 'icon-camera', items: [
                { id: 'free', text: 'Free Camera', img: 'icon-camera' },
                { id: 'arc', text: 'Arc Rotate Camera', img: 'icon-camera' }
            ]},
            { type: 'break' },
            { type: 'button', id: 'position', text: '', img: 'icon-position', checked: false },
            { type: 'button', id: 'rotation', text: '', img: 'icon-rotation', checked: false },
            { type: 'button', id: 'scaling', text: '', img: 'icon-scaling', checked: false },
            { type: 'button', id: 'bounding-box', text :'', img: 'icon-bounding-box', checked: false },
            { type: 'break' },
            { type: 'menu', id: 'steps', text: 'Steps', items: ['0', '1', '2', '3', '4', '5'].map((n, index) => ({
                type: 'radio', text: n, id: n, group: '1', selected: index === 0
            })) },
            { type: 'button', id: 'fit-rotation', text: 'Fit', checked: true },
            { type: 'button', id: 'use-euler', text: 'Euler', checked: false },
            { type: 'break' },
            { type: 'button', id: 'bounding-boxes', checked: false, img: 'icon-bounding-box', text: '' },
            { type: 'button', id: 'wireframe', checked: false, img: 'icon-wireframe', text: '' },
            { type: 'break' },
            { type: 'button', id: 'post-processes', checked: true, img: 'icon-helpers', text: '' },
            { type: 'break' },
            { type: 'button', id: 'textures', checked: true, img: 'icon-dynamic-texture', text: '' },
            { type: 'button', id: 'lights', checked: true, img: 'icon-light', text: '' },
            { type: 'button', id: 'sounds', checked: true, img: 'icon-sound' },
            { type: 'break' },
            { type: 'menu', id: 'lod-quality', text: 'LOD Quality', items: ['Auto', 'High', 'Medium', 'Low'].map((n, index) => ({
                type: 'radio', tex: n, id: n.toLowerCase(), group: '1', selected: index === 0
            })) }
        ];
        this.toolbar.build('PREVIEW-TOOLBAR');

        // Tools toolbar
        this.toolsToolbar = new Toolbar('RENDER-CANVAS-CONTAINER');
        this.toolsToolbar.onClick = id => this.onToolsToolbarClicked(id);
        this.toolsToolbar.items = [
            { type: 'button', id: 'mesh-painter', text: 'Mesh Painter', img: 'icon-paint', checked: false },
            { type: 'button', id: 'terrain-painter', text: 'Terrain Painter', img: 'icon-paint', checked: false }
        ];
        this.toolsToolbar.build('RENDER-CANVAS-CONTAINER');

        // Context menu
        const canvas = <HTMLCanvasElement> $('#renderCanvasEditor')[0];
        const lastPosition = Vector2.Zero();

        canvas.addEventListener('pointerdown', (ev) => {
            lastPosition.set(ev.offsetX, ev.offsetY);
        });
        canvas.addEventListener('contextmenu', (ev) => {
            if (Math.abs(ev.offsetX - lastPosition.x) > 10 || Math.abs(ev.offsetY - lastPosition.y) > 10 || !this.editor.scenePicker.enabled)
                return;

            this.editor.scenePicker.onCanvasClick(ev);

            ContextMenu.Show(ev, {
                focus: { name: 'Focus', callback: () => this.editor.graph.onMenuClick('focus', this.editor.graph.getSelected()) },
                clone: { name: 'Clone', callback: () => this.editor.graph.onMenuClick('clone', this.editor.graph.getSelected()) },
                remove: { name: 'Remove', callback: () => this.editor.graph.onMenuClick('remove', this.editor.graph.getSelected()) }
            });
        });

        // Users drag'n'drops files.
        this.editor.core.onDropFiles.add(async (event) => {
            if (event.target !== this.editor.core.engine.getRenderingCanvas())
                return;

            const lastMeshesLength = this.editor.assets.meshes.datas.length;
            await this.editor.assets.meshes.onDragAndDropFiles(event.files);
            
            if (this.editor.assets.meshes.datas.length !== lastMeshesLength) {
                this.editor.assets.refresh();
                this.editor.assets.showTab(this.editor.assets.meshes.id);
            }
        });
    }

    /**
     * Resizes the preview
     */
    public resize (): void {
        this.layout.element.resize();
        this.editor.core.engine.resize();
    }

    /**
     * Sets a click and the given item's id
     * @param id the id of the item to click
     */
    public setToolClicked (id: string): void {
        this.onToolbarClicked(id);
    }

    /**
     * Resets the preview panel.
     */
    public reset (): void {
        this.toolbar.setChecked('bounding-boxes', false);
        this.toolbar.setChecked('wireframe', false);
        this.toolbar.setChecked('post-processes', true);
        this.toolbar.setChecked('textures', true);
        this.toolbar.setChecked('lights', true);
    }

    /**
     * Enables the given tool.
     * @param id the id of the tool to enable.
     */
    public enableToolMode (id: string): void {
        this.toolsToolbar.setChecked(id, true);
    }

    /**
     * Disables the given tool.
     * @param id the id of the tool to disable.
     */
    public disableToolMode (id: string): void {
        this.toolsToolbar.setChecked(id, false);
    }

    /**
     * Toggles the given tool.
     * @param id the id of the tool to toggle (enabled/disabled)
     */
    public toogleToolMode (id: string): void {
        const isChecked = this.toolsToolbar.isChecked(id);
        isChecked ? this.disableToolMode(id) : this.enableToolMode(id);
    }

    /**
     * Copies the currently selected node to clipboard.
     */
    public copyToClipBoard (): void {
        this._nodeToCopy = this.editor.core.currentSelectedObject;
    }

    /**
     * Pastes the currently copied node from the clipboard and adds to the scene.
     */
    public pasteFromClipBoard (): void {
        if (!this._nodeToCopy)
            return;

        let newNode = null;
        if (this._nodeToCopy instanceof Light) {
            newNode = this._nodeToCopy.clone(this._nodeToCopy.name);
        }
        else if (this._nodeToCopy instanceof Camera) {
            newNode = this._nodeToCopy.clone(this._nodeToCopy.name);
        }
        else if (this._nodeToCopy instanceof Mesh) {
            newNode = this._nodeToCopy.createInstance(this._nodeToCopy.name + ' (Mesh Instance)');
            newNode.position.copyFrom(this._nodeToCopy.position);
            newNode.rotation.copyFrom(this._nodeToCopy.rotation);
            newNode.scaling.copyFrom(this._nodeToCopy.scaling);
            if (this._nodeToCopy.rotationQuaternion)
                newNode.rotationQuaternion.copyFrom(this._nodeToCopy.rotationQuaternion);
        }
        else if (this._nodeToCopy instanceof InstancedMesh) {
            newNode = this._nodeToCopy.sourceMesh.createInstance(this._nodeToCopy.name + (this._nodeToCopy.name.indexOf('Mesh Instance') === -1 ? ' (Mesh Instance)' : ''));
            newNode.position.copyFrom(this._nodeToCopy.position);
            newNode.rotation.copyFrom(this._nodeToCopy.rotation);
            newNode.scaling.copyFrom(this._nodeToCopy.scaling);
            if (this._nodeToCopy.rotationQuaternion)
                newNode.rotationQuaternion.copyFrom(this._nodeToCopy.rotationQuaternion);
        }
        else if (this._nodeToCopy instanceof ParticleSystem) {
            newNode = this._nodeToCopy.clone(this._nodeToCopy.name, this._nodeToCopy.emitter);
        }

        if (!newNode)
            return;

        Tags.AddTagsTo(newNode, 'added');
        newNode.parent = this._nodeToCopy.parent;
        newNode.id = BabylonTools.RandomId();

        this.editor.graph.addNode(this.editor.core.scene, newNode);
        setTimeout(() => {
            this.editor.core.onSelectObject.notifyObservers(newNode);
            this.editor.scenePicker.configureMesh(newNode);
            this.editor.scenePicker.setGizmoAttachedMesh(newNode);
            this.editor.notifyMessage(`Pasted "${newNode.name}"`, false, 1000);
        }, 0);
    }

    /**
     * Creates a new screenshot.
     */
    public async createScreenShot(): Promise<void> {
        this.editor.core.scene.render();
        const screenshot = await BabylonTools.CreateScreenshotAsync(this.editor.core.engine, this.editor.core.scene.activeCamera, {
            width: 3840,
            height: 2160
        });

        const win = new Window("PreviewScreenshot");
        win.title = "Screenshot";
        win.width = win.height = 512;
        win.body = `<img src="${screenshot}" style="width: 100%; height: 100%; object-fit: contain;"></img>`;
        win.buttons = ["Ok", "Save"];
        win.open();

        win.onButtonClick = (id) => {
            if (id === "Save") {
                const buffer = BabylonTools.DecodeBase64(screenshot);
                const blob = new Blob([buffer]);
                BabylonTools.Download(blob, 'screenshot.png');
            }

            win.close();
        };
    }

    /**
     * On the user clicks on the toolbar
     * @param id the id of the clicked item
     */
    protected onToolbarClicked (id: string): void {
        const split = id.split(":");
        if (split.length === 1 && split[0] === "camera")
            this._updateCamerasMenu();

        if (split.length > 1 && split[0] === "camera")
            return this.onToolbarCameraClocked(split[1]);

        switch (id) {
            // Gizmos
            case 'bounding-box':
            case 'position':
            case 'rotation':
            case 'scaling':
                const active = this.toolbar.isChecked(id, true);

                this.toolbar.setChecked('bounding-box', false);
                this.toolbar.setChecked('position', false);
                this.toolbar.setChecked('rotation', false);
                this.toolbar.setChecked('scaling', false);
                this.toolbar.setChecked(id, active);

                this.editor.scenePicker.gizmosLayer.shouldRender = active;

                if (!active) {
                    this.editor.scenePicker.gizmoType = GizmoType.NONE;
                    break;
                }

                switch (id) {
                    case 'bounding-box': this.editor.scenePicker.gizmoType = GizmoType.BOUNDING_BOX; break;
                    case 'position': this.editor.scenePicker.gizmoType = GizmoType.POSITION; break;
                    case 'rotation': this.editor.scenePicker.gizmoType = GizmoType.ROTATION; break;
                    case 'scaling': this.editor.scenePicker.gizmoType = GizmoType.SCALING; break;
                }

                break;

            // Steps
            case 'steps:0': this.editor.scenePicker.gizmoStep = 0; break;
            case 'steps:1': this.editor.scenePicker.gizmoStep = 1; break;
            case 'steps:2': this.editor.scenePicker.gizmoStep = 2; break;
            case 'steps:3': this.editor.scenePicker.gizmoStep = 3; break;
            case 'steps:4': this.editor.scenePicker.gizmoStep = 4; break;
            case 'steps:5': this.editor.scenePicker.gizmoStep = 5; break;

            // Fit
            case 'fit-rotation':
                const fit = this.toolbar.isChecked(id, true);
                this.editor.scenePicker.updateGizmoRotationToMatchAttachedMesh = fit;
                this.toolbar.setChecked(id, fit);
                break;
            // Euler
            case 'use-euler':
                const useEuler = this.toolbar.isChecked(id, true);
                this.editor.scenePicker.useEulerRotation = useEuler;
                this.toolbar.setChecked(id, useEuler);
                break;

            // Show
            case 'bounding-boxes':
            case 'wireframe':
            case 'post-processes':
            case 'textures':
            case 'lights':
            case 'sounds':
                switch (id) {
                    case 'bounding-boxes': this.editor.core.scene.forceShowBoundingBoxes = !this.editor.core.scene.forceShowBoundingBoxes; break;
                    case 'wireframe': this.editor.core.scene.forceWireframe = !this.editor.core.scene.forceWireframe; break;
                    case 'post-processes': this.editor.core.scene.postProcessesEnabled = !this.editor.core.scene.postProcessesEnabled; break;
                    case 'textures': this.editor.core.scene.texturesEnabled = !this.editor.core.scene.texturesEnabled; break;
                    case 'lights': this.editor.core.scene.lightsEnabled = !this.editor.core.scene.lightsEnabled; break;
                    case 'sounds': this.editor.core.scene.mainSoundTrack.setVolume(this.toolbar.isChecked(id, true) ? 1 : 0);
                }

                this.toolbar.setChecked(id, !this.toolbar.isChecked(id));
                break;

            // LOD Quality
            case 'lod-quality:auto': this._updateLodQuality(-1); break;
            case 'lod-quality:low': this._updateLodQuality(2); break;
            case 'lod-quality:medium': this._updateLodQuality(1); break;
            case 'lod-quality:high': this._updateLodQuality(0); break;

            // Default
            default: break;
        }
    }

    /**
     * On the user clicks on a camera in the menu camera.
     * @param id the id of the camera menu item.
     */
    protected onToolbarCameraClocked (id: string): void {
        const pipelines = this.editor.core.scene.postProcessRenderPipelineManager;
        pipelines.supportedPipelines.forEach((p) => pipelines.detachCamerasFromRenderPipeline(p.name, this.editor.core.scene.activeCamera));

        let camera: Camera;
        switch (id) {
            // Common
            case 'free': camera = this.editor.createEditorCamera('free'); break;
            case 'arc': camera = this.editor.createEditorCamera('arc'); break;

            // Custom
            default:
                camera = this.editor.core.scene.activeCamera = this.editor.core.scene.getCameraByID(id);
                camera.attachControl(this.editor.core.engine.getRenderingCanvas(), false);
                break;
        }

        if (!camera)
            return;

        pipelines.supportedPipelines.forEach((p) => pipelines.attachCamerasToRenderPipeline(p.name, [camera]));
    }

    /**
     * On the user clicks on the tools toolbar
     * @param id the id of the clicked item
     */
    protected onToolsToolbarClicked (id: string): void {
        switch (id) {
            case 'mesh-painter':
            case 'terrain-painter':
                const active = this.toolsToolbar.isChecked(id, true);

                this.toolsToolbar.setChecked('mesh-painter', false);
                this.toolsToolbar.setChecked('terrain-painter', false);

                this.toolsToolbar.setChecked(id, active);

                switch (id) {
                    case 'mesh-painter': this.editor.paintingTools.enableTool(AvailablePaintingTools.MeshPainter); break;
                    case 'terrain-painter': this.editor.paintingTools.enableTool(AvailablePaintingTools.TerrainPainter); break;
                }
                break;
        }
    }

    // Updates the forced LOD quality.
    private _updateLodQuality (lodQuality: number): void {
        if (this._lodQuality === lodQuality)
            return;
        
        this._lodQuality = lodQuality;

        this.editor.core.scene.meshes.forEach((m) => {
            if (!(m instanceof Mesh) || !m.hasLODLevels)
                return;
            
            // Get current levels
            let levels = m.getLODLevels().sort((a, b) => a.distance - b.distance);

            // Restore saved levels or register.
            let cm = this._lodComputedMeshes.find((cm) => cm.mesh === m);
            if (!cm) {
                this._lodComputedMeshes.push(cm = { mesh: m, levels: levels.map((l) => new MeshLODLevel(l.distance, l.mesh)) });
            }

            cm.levels.forEach((l) => m.removeLODLevel(l.mesh));
            cm.levels.forEach((l) => m.addLODLevel(l.distance, l.mesh));
            levels = m.getLODLevels();

            switch (lodQuality) {
                case -1: // Auto
                    // Do nothing, automatic.
                    break;
                case 0: // High
                    levels.forEach((l) => l.distance = Infinity);
                    break;
                case 1: // Medium
                    const index = (levels.length - 1) - (((levels.length - 1) * 0.5) >> 0);
                    const middleLevel = levels[index];
                    for (let i = 0; i < index; i++)
                        levels[i].distance = Infinity;
                    middleLevel.distance = 0;
                    for (let i = index + 1; i < levels.length; i++)
                        levels[i].distance = Infinity;
                    break;
                case 2: // Low
                    levels[0].distance = 0;
                    for (let i = 1; i < levels.length; i++)
                        levels[i].distance = Infinity;
                    break;
            }

            m['_sortLODLevels']();
        });
    }

    // Updates the cameras menu.
    private _updateCamerasMenu(): void {
        const cameras = this.editor.core.scene.cameras.filter((c) => c !== this.editor.camera);
        const menu = this.toolbar.element.items[0];

        menu.items =  <W2UI.W2Item[]> ([
            { id: 'free', text: 'Free Camera', img: 'icon-camera' },
            { id: 'arc', text: 'Arc Rotate Camera', img: 'icon-camera' }
        ].concat(cameras.map((c) => ({
            id: c.id,
            type: 'button',
            text: c.name,
            img: 'icon-camera'
        }))));

        this.toolbar.element.refresh();
    }
}