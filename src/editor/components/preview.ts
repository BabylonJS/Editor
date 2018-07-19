import Layout from '../gui/layout';
import Toolbar from '../gui/toolbar';

import Editor from '../editor';

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
            { type: 'main', resizable: false, content: '<canvas id="renderCanvas"></canvas>' }
        ];
        this.layout.build('PREVIEW');

        // Toolbar
        this.toolbar = new Toolbar('PREVIEW-TOOLBAR');
        this.toolbar.onClick = id => this.onToolbarClicked(id);
        this.toolbar.items = [{
            type: 'menu', id: 'show', text: 'Show', img: 'icon-helpers', selected: [], items: [
                { id: 'bounding-boxes', img: 'icon-bounding-box', text: 'Bounding Box' },
                { id: 'wireframe', img: 'icon-wireframe', text: 'Wireframe' },
                { type: 'break' },
                { id: 'post-processes', img: 'icon-helpers', text: 'Post-Processes' },
                { type: 'break' },
                { id: 'textures', img: 'icon-dynamic-texture', text: 'Textures' },
                { id: 'lights', img: 'icon-light', text: 'Lights' }
            ]
        }];
        this.toolbar.build('PREVIEW-TOOLBAR');
    }

    /**
     * Resizes the preview
     */
    public resize (): void {
        this.layout.element.resize();
        this.editor.core.engine.resize();
    }

    /**
     * On the user clicks on the toolbar
     * @param id the id of the clicked item
     */
    protected onToolbarClicked (id: string): void {
        switch (id) {
            case 'show:bounding-boxes': this.editor.core.scene.forceShowBoundingBoxes = !this.editor.core.scene.forceShowBoundingBoxes; break;
            case 'show:wireframe': this.editor.core.scene.forceWireframe = !this.editor.core.scene.forceWireframe; break;

            case 'show:post-processes': this.editor.core.scene.postProcessesEnabled = !this.editor.core.scene.postProcessesEnabled; break;

            case 'show:textures': this.editor.core.scene.texturesEnabled = !this.editor.core.scene.texturesEnabled; break;
            case 'show:lights': this.editor.core.scene.lightsEnabled = !this.editor.core.scene.lightsEnabled; break;

            default: break;
        }
    }
}