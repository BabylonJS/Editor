import { Node, Scene } from 'babylonjs';

import Editor from '../../editor/editor';
import { EditorPlugin } from '../../editor/typings/plugin';
import Tools from '../../editor/tools/tools';

import Layout from '../../editor/gui/layout';
import Toolbar from '../../editor/gui/toolbar';
import Grid, { GridRow } from '../../editor/gui/grid';

import { BehaviorMetadata } from '../../extensions/behavior/code';

// TODO: remove this line and find a way to
// import * as monaco from 'monaco-editor';
export declare type MonacoEditor = any;
declare module monaco.editor {
    function create(domElement: HTMLElement, options?: any, services?: any): MonacoEditor;
}
declare module monaco.languages.typescript.javascriptDefaults {
    function addExtraLib(content: string, id: string): void;
}

export interface CodeGrid extends GridRow {
    name: string;
}

export default class AnimationEditor extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;
    public grid: Grid<CodeGrid> = null;

    // Protected members
    protected code: MonacoEditor;
    protected node: Node | Scene;

    protected onSelectObject = (node) => this.selectObject(node);

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Code Behavior');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.toolbar.element.destroy();
        this.layout.element.destroy();
        this.code.dispose();

        // Events
        this.editor.core.onSelectObject.removeCallback(this.onSelectObject);

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        const div = $(this.divElement);

        // Create layout
        this.layout = new Layout('TextureViewer');
        this.layout.panels = [
            { type: 'top', content: '<div id="CODE-BEHAVIOR-TOOLBAR"></div>', size: 30, resizable: false },
            { type: 'left', content: '<div id="CODE-BEHAVIOR-LIST" style="width: 100%; height: 100%;"></div>', size: 300, overflow: 'auto', resizable: true },
            { type: 'main', content: '<div id="CODE-BEHAVIOR-EDITOR" style="width: 100%; height: 100%;"></div>', resizable: true }
        ];
        this.layout.build(div.attr('id'));

        // Add toolbar
        this.toolbar = new Toolbar('TextureViewerToolbar');
        this.toolbar.items = [{ id: 'add', text: 'Add...', caption: 'Add...', img: 'icon-add' }];
        this.toolbar.build('CODE-BEHAVIOR-TOOLBAR');

        // Add grid
        this.grid = new Grid<CodeGrid>('CodeGrid', {
            toolbarReload: false,
            toolbarSearch: false
        });
        this.grid.columns = [{ field: 'name', caption: 'Name', size: '100%' }];
        this.grid.build('CODE-BEHAVIOR-LIST');

        // Add code editor
        await this.createEditor();

        // Events
        this.editor.core.onSelectObject.add(this.onSelectObject);
    }

    /**
     * On the user selects a node in the editor
     * @param node the selected node
     */
    protected selectObject (node: Node | Scene): void {
        this.node = node;

        // Add all codes
        if (!node.metadata)
            return;
        
        const datas: BehaviorMetadata = node.metadata['BehaviorExtension'] || node.metadata['Code'];
        if (!datas)
            return;

        datas.metadatas.forEach((d, index) => {
            this.grid.addRecord({
                recid: index,
                name: d.name
            });
        });

        this.grid.element.refresh();
    }

    /**
     * Creates the code editor
     */
    protected async createEditor (): Promise<void> {
        const libs = ['babylonjs/dist/preview release/babylon.d.ts'];
        let content = '';

        for (const l of libs) {
            content += await Tools.LoadFile('node_modules/' + l, false);
        }

        this.code = monaco.editor.create ($('#CODE-BEHAVIOR-EDITOR')[0], {
            value: '// Some code',
            language: "javascript",
            automaticLayout: true,
            selectionHighlight: true
        });

        monaco.languages.typescript.javascriptDefaults.addExtraLib(content, 'BehaviorEditor');
    }
}
