import { Vector2 } from 'babylonjs';

import Layout from '../gui/layout';
import Toolbar from '../gui/toolbar';
import ContextMenu from '../gui/context-menu';

import Editor from '../editor';

import { GizmoType } from '../scene/scene-picker';
import { AvailablePaintingTools } from '../painting/painting-tools';

export default class EditorPreview {
    // Public members
    public layout: Layout;
    public toolbar: Toolbar;
    public toolsToolbar: Toolbar;

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
            { type: 'menu', id: 'steps', text: 'Steps', img: 'icon-position', items: ['0', '1', '2', '3', '4', '5'].map((n, index) => ({
                type: 'radio', text: n, id: n, group: '1', selected: index === 0
            })) },
            { type: 'break' },
            { type: 'button', id: 'bounding-boxes', checked: false, img: 'icon-bounding-box', text: '' },
            { type: 'button', id: 'wireframe', checked: false, img: 'icon-wireframe', text: '' },
            { type: 'break' },
            { type: 'button', id: 'post-processes', checked: true, img: 'icon-helpers', text: '' },
            { type: 'break' },
            { type: 'button', id: 'textures', checked: true, img: 'icon-dynamic-texture', text: '' },
            { type: 'button', id: 'lights', checked: true, img: 'icon-light', text: '' },
            { type: 'button', id: 'sounds', checked: true, img: 'icon-sound' }
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

            await this.editor.assets.meshes.onDragAndDropFiles(event.files);
            this.editor.assets.refresh();
            this.editor.assets.showTab(this.editor.assets.meshes.id);
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
     * On the user clicks on the toolbar
     * @param id the id of the clicked item
     */
    protected onToolbarClicked (id: string): void {
        switch (id) {
            // Camera
            case 'camera:free': this.editor.createEditorCamera('free'); break;
            case 'camera:arc': this.editor.createEditorCamera('arc'); break;

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

            // Default
            default: break;
        }
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
}