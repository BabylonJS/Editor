import {
    Node,
    DirectionalLight, HemisphericLight,
    Scene
} from 'babylonjs';

import Editor, {
    Tools,

    Layout,
    Toolbar,
    Grid, GridRow,

    EditorPlugin,
    IDisposable   
} from 'babylonjs-editor';

import Extensions from '../../extensions/extensions';
import { BehaviorMetadata, BehaviorCode } from '../../extensions/behavior/code';

import '../../extensions/behavior/code';

// TODO: remove this line and find a way to
// import * as monaco from 'monaco-editor';
export interface MonacoDisposable extends IDisposable {
    [index: string]: any;
}
declare var monaco: MonacoDisposable;

export interface CodeGrid extends GridRow {
    name: string;
}

export default class BehaviorCodeEditor extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;
    public grid: Grid<CodeGrid> = null;

    // Protected members
    protected code: MonacoDisposable = null;
    protected template: string = '// Some code';

    protected node: Node | Scene = null;

    protected datas: BehaviorMetadata = null;
    protected data: BehaviorCode = null;

    protected onSelectObject = (node) => this.selectObject(node);

    // Static members
    protected static ExtraLib: MonacoDisposable = null;

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Code');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.toolbar.element.destroy();
        this.grid.element.destroy();
        this.layout.element.destroy();

        BehaviorCodeEditor.ExtraLib.dispose();
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
        this.layout = new Layout('Code');
        this.layout.panels = [
            { type: 'top', content: '<div id="CODE-BEHAVIOR-TOOLBAR"></div>', size: 30, resizable: false },
            { type: 'left', content: '<div id="CODE-BEHAVIOR-LIST" style="width: 100%; height: 100%;"></div>', size: 300, overflow: 'auto', resizable: true },
            { type: 'main', content: '<div id="CODE-BEHAVIOR-EDITOR" style="width: 100%; height: 100%;"></div>', resizable: true }
        ];
        this.layout.build(div.attr('id'));

        // Add toolbar
        this.toolbar = new Toolbar('CodeToolbar');
        this.toolbar.items = [{ id: 'add', text: 'Add...', caption: 'Add...', img: 'icon-add' }];
        this.toolbar.build('CODE-BEHAVIOR-TOOLBAR');

        // Add grid
        this.grid = new Grid<CodeGrid>('CodeGrid', {
            toolbarReload: false,
            toolbarSearch: false,
            toolbarEdit: false
        });
        this.grid.columns = [{ field: 'name', caption: 'Name', size: '100%', editable: { type: 'string' } }];
        this.grid.onClick = (id) => this.selectCode(id[0]);
        this.grid.onAdd = () => this.add();
        this.grid.onDelete = (ids) => this.delete(ids);
        this.grid.onChange = (id, value) => this.change(id, value);
        this.grid.build('CODE-BEHAVIOR-LIST');

        // Add code editor
        await this.createEditor();
        this.template = await Tools.LoadFile<string>('./assets/templates/code.txt', false);

        // Events
        this.editor.core.onSelectObject.add(this.onSelectObject);

        // Select object
        if (this.editor.core.currentSelectedObject)
            this.selectObject(this.editor.core.currentSelectedObject);

        // Request extension
        Extensions.RequestExtension(this.editor.core.scene, 'BehaviorExtension');
    }

    /**
     * On the user shows the plugin
     */
    public onShow (): void {
        this.grid.element.resize();
    }

    /**
     * On the user selects a node in the editor
     * @param node the selected node
     */
    protected selectObject (node: Node | Scene): void {
        this.node = node;
        node.metadata = node.metadata || { };

        // Add all codes
        this.datas = node.metadata['behavior'];
        if (!this.datas)
            this.datas = node.metadata['behavior'] = { node: (node instanceof Scene) ? 'Scene' : node.name, metadatas: [] }

        // Clear existing data
        this.data = null;

        this.grid.element.clear();
        this.code.setValue('');

        // Add rows
        this.datas.metadatas.forEach((d, index) => {
            this.grid.addRecord({
                recid: index,
                name: d.name
            });
        });

        this.grid.element.refresh();
    }

    /**
     * On the user selects a code
     * @param index the index of the 
     */
    protected selectCode (index: number): void {
        this.data = this.datas.metadatas[index];
        this.code.setValue(this.data.code);
    }

    /**
     * The user clicks on "Add"
     */
    protected add (): void {
        let ctor = Tools.GetConstructorName(this.node).toLowerCase();
        if (this.node instanceof DirectionalLight)
            ctor = "dirlight";
        else if (this.node instanceof HemisphericLight)
            ctor = "hemlight";

        const data: BehaviorCode = {
            name: 'New Script',
            active: true,
            code: this.template.replace(/{{type}}/g, ctor)
        };
        this.datas.metadatas.push(data);

        this.grid.addRow({
            recid: this.datas.metadatas.length,
            name: data.name
        });
    }

    /**
     * The user wants to delete a script
     * @param ids: the ids to delete
     */
    protected delete (ids: number[]): void {
        let offset = 0;
        ids.forEach(id => {
            this.datas.metadatas.splice(id - offset, 1);
            offset++;
        });
    }

    /**
     * On the user changes the name of the script
     * @param id: the id of the script
     * @param value: the new value
     */
    protected change (id: number, value: string): void {
        this.datas.metadatas[id].name = value;
    }

    /**
     * Creates the code editor
     */
    protected async createEditor (): Promise<void> {
        const libs = ['babylonjs/dist/preview release/babylon.d.ts'];
        let content = '';

        for (const l of libs)
            content += await Tools.LoadFile('node_modules/' + l, false) + '\n';

        content += `
            declare var scene: BABYLON.Scene;
            declare var mesh: BABYLON.Mesh;
            declare var pointlight: BABYLON.PointLight;
            declare var universalcamera: BABYLON.UniversalCamera;
            declare var spotlight: BABYLON.SpotLight;
            declare var dirlight: BABYLON.DirectionalLight;
            declare var hemlight: BABYLON.HemisphericLight;
            declare var groundmesh: BABYLON.GroundMesh;
            declare var particleSystem: BABYLON.ParticleSystem;
            declare var gpuParticleSystem: BABYLON.GPUParticleSystem;
        `;

        this.code = monaco.editor.create ($('#CODE-BEHAVIOR-EDITOR')[0], {
            value: '// Some code',
            language: "javascript",
            automaticLayout: true,
            selectionHighlight: true
        });

        if (!BehaviorCodeEditor.ExtraLib)
            BehaviorCodeEditor.ExtraLib = monaco.languages.typescript.javascriptDefaults.addExtraLib(content, 'BehaviorEditor');

        this.code.onDidChangeModelContent(() => {
            if (this.data)
                this.data.code = this.code.getValue();
        });
    }
}
