import { Vector2 } from 'babylonjs';

import Layout from '../gui/layout';
import Toolbar from '../gui/toolbar';
import ContextMenu from '../gui/context-menu';

import Editor from '../editor';

import { GizmoType } from '../scene/scene-picker';

export default class EditorPreview {
    // Public members
    public layout: Layout;
    public toolbar: Toolbar;

    /**
     * Constructor
     * @param editor: the editor reference
     */
    constructor (protected editor: Editor) {
        // Layout
        this.layout = new Layout('PREVIEW');
        this.layout.panels = [
            { type: 'top', size: 30, resizable: false, content: '<div id="PREVIEW-TOOLBAR" style="width: 100%; height: 100%;"></div>' },
            { type: 'main', resizable: false, content: '<canvas id="renderCanvasEditor" class="ctxmenu"></canvas>' }
        ];
        this.layout.build('PREVIEW');

        // Toolbar
        this.toolbar = new Toolbar('PREVIEW-TOOLBAR');
        this.toolbar.onClick = id => this.onToolbarClicked(id);
        this.toolbar.items = [
            { type: 'break' },
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
            { type: 'button', id: 'bounding-boxes', checked: false, img: 'icon-bounding-box', text: '' },
            { type: 'button', id: 'wireframe', checked: false, img: 'icon-wireframe', text: '' },
            { type: 'break' },
            { type: 'button', id: 'post-processes', checked: true, img: 'icon-helpers', text: '' },
            { type: 'break' },
            { type: 'button', id: 'textures', checked: true, img: 'icon-dynamic-texture', text: '' },
            { type: 'button', id: 'lights', checked: true, img: 'icon-light', text: '' }
        ];
        this.toolbar.build('PREVIEW-TOOLBAR');

        // Context menu
        const canvas = <HTMLCanvasElement> $('#renderCanvasEditor')[0];
        const lastPosition = Vector2.Zero();

        canvas.addEventListener('pointerdown', (ev) => {
            lastPosition.set(ev.offsetX, ev.offsetY);
        });
        canvas.addEventListener('contextmenu', (ev) => {
            if (Math.abs(ev.offsetX - lastPosition.x) > 10 || Math.abs(ev.offsetY - lastPosition.y) > 10)
                return;

            this.editor.scenePicker.onCanvasClick(ev);

            ContextMenu.Show(ev, {
                focus: { name: 'Focus', callback: () => this.editor.graph.onMenuClick('focus', this.editor.graph.getSelected()) },
                clone: { name: 'Clone', callback: () => this.editor.graph.onMenuClick('clone', this.editor.graph.getSelected()) },
                remove: { name: 'Remove', callback: () => this.editor.graph.onMenuClick('remove', this.editor.graph.getSelected()) }
            });
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
                    default: break; // Should never happen
                }

                break;

            // Show
            case 'bounding-boxes':
            case 'wireframe':
            case 'post-processes':
            case 'textures':
            case 'lights':
                switch (id) {
                    case 'bounding-boxes': this.editor.core.scene.forceShowBoundingBoxes = !this.editor.core.scene.forceShowBoundingBoxes; break;
                    case 'wireframe': this.editor.core.scene.forceWireframe = !this.editor.core.scene.forceWireframe; break;
                    case 'post-processes': this.editor.core.scene.postProcessesEnabled = !this.editor.core.scene.postProcessesEnabled; break;
                    case 'textures': this.editor.core.scene.texturesEnabled = !this.editor.core.scene.texturesEnabled; break;
                    case 'lights': this.editor.core.scene.lightsEnabled = !this.editor.core.scene.lightsEnabled; break;
                }

                this.toolbar.setChecked(id, !this.toolbar.isChecked(id));
                break;

            // Default
            default: break;
        }
    }
}