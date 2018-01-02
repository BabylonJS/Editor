import { Engine, Scene, ArcRotateCamera, Mesh, Vector3, Color4, Color3 } from 'babylonjs';

import Editor, {
    IDisposable, Tools,
    Layout, Toolbar, Grid, GridRow,
    CodeEditor,
    EditorPlugin
} from 'babylonjs-editor';

import Extensions from '../../extensions/extensions';
import MaterialCreatorExtension, { MaterialCreatorMetadata } from '../../extensions/material-creator/material-creator';

import '../../extensions/material-creator/material-creator';

export interface MaterialGrid extends GridRow {
    name: string;
}

export default class MaterialCreator extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;
    public grid: Grid<MaterialGrid> = null;

    // Protected members
    protected currentTab: string = 'MATERIAL-CREATOR-EDITOR-CODE';

    protected code: CodeEditor = null;
    protected vertex: CodeEditor = null;
    protected pixel: CodeEditor = null;

    protected datas: MaterialCreatorMetadata[] = [];
    protected data: MaterialCreatorMetadata = null;

    protected extension: MaterialCreatorExtension = null;

    // Static members
    public static DefaultCode: string = '';
    public static DefaultVertex: string = '';
    public static DefaultPixel: string = '';

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Material Creator');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.layout.element.destroy();
        this.grid.element.destroy();
        this.toolbar.element.destroy();
        
        this.code.editor.dispose();
        this.vertex.editor.dispose();
        this.pixel.editor.dispose();

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Template
        MaterialCreator.DefaultCode = await Tools.LoadFile<string>('./assets/templates/material-creator/class.js');
        MaterialCreator.DefaultVertex = await Tools.LoadFile<string>('./assets/templates/material-creator/vertex.fx');
        MaterialCreator.DefaultPixel = await Tools.LoadFile<string>('./assets/templates/material-creator/pixel.fx');

        // Request extension
        this.extension = Extensions.RequestExtension<MaterialCreatorExtension>(this.editor.core.scene, 'MaterialCreatorExtension');

        // Metadatas
        this.editor.core.scene.metadata = this.editor.core.scene.metadata || { };
        this.editor.core.scene.metadata['MaterialCreator'] = this.editor.core.scene.metadata['MaterialCreator'] || [{
            name: 'Custom material',
            code: MaterialCreator.DefaultCode,
            vertex: MaterialCreator.DefaultVertex,
            pixel: MaterialCreator.DefaultPixel
        }];
        this.datas = this.editor.core.scene.metadata['MaterialCreator'];
        this.data = this.datas[0];

        this.extension.createMaterial({
            name: this.data.name,
            code: null,
            vertex: this.data.vertex,
            pixel: this.data.pixel
        });

        // Create layout
        this.layout = new Layout('MaterialCreatorCode');
        this.layout.panels = [
            { type: 'top', content: '<div id="MATERIAL-CREATOR-TOOLBAR" style="width: 100%; height: 100%;"></div>', size: 30, resizable: false },
            { type: 'left', content: '<div id="MATERIAL-CREATOR-LIST" style="width: 100%; height: 100%;"></div>', size: 250, overflow: 'auto', resizable: true },
            { 
                type: 'main',
                content: `
                    <div id="MATERIAL-CREATOR-EDITOR-CODE" style="width: 100%; height: 100%;"></div>
                    <div id="MATERIAL-CREATOR-EDITOR-VERTEX" style="width: 100%; height: 100%; display: none;"></div>
                    <div id="MATERIAL-CREATOR-EDITOR-PIXEL" style="width: 100%; height: 100%; display: none;"></div>
                `,
                resizable: true,
                tabs: <any>[
                    { id: 'code', caption: 'Code' },
                    { id: 'vertex', caption: 'Vertex' },
                    { id: 'pixel', caption: 'Pixel' }
                ]
            }
        ];
        this.layout.build(this.divElement.id);

        // Create toolbar
        this.toolbar = new Toolbar('MaterialCreatorToolbar');
        this.toolbar.items = [
            
        ];
        this.toolbar.build('MATERIAL-CREATOR-TOOLBAR');

        // Create grid
        this.grid = new Grid<MaterialGrid>('MaterialCreatorGrid', {
            toolbarReload: false,
            toolbarEdit: false,
            toolbarSearch: false
        });
        this.grid.columns = [{ field: 'name', caption: 'Name', size: '100%', editable: { type: 'string' } }];
        this.grid.build('MATERIAL-CREATOR-LIST');
        this.grid.onAdd = () => this.addMaterial();
        this.grid.onClick = (selected) => this.selectMaterial(selected[0]);
        this.grid.onDelete = (selected) => this.removeMaterial(selected[0]);
        this.grid.onChange = (id, value) => this.changeMaterial(id, value);
        this.datas.forEach((d, index) => this.grid.addRecord({
            name: d.name,
            recid: index
        }));
        this.grid.element.refresh();
        this.grid.select([0]);

        // Add code editors
        await this.createEditors();
    }

    /**
     * On the user shows the plugin
     */
    public onShow (): void {
        this.grid.element.resize();
    }

    /**
     * Creates a new material
     */
    protected addMaterial (): void {
        // Create data and material
        const data: MaterialCreatorMetadata = {
            name: 'Custom material' + this.datas.length + 1,
            code: MaterialCreator.DefaultCode,
            vertex: MaterialCreator.DefaultVertex,
            pixel: MaterialCreator.DefaultPixel
        };

        const material = this.extension.createMaterial({
            name: data.name,
            code: null,
            vertex: data.vertex,
            pixel: data.pixel
        });

        // Collect and add to the list
        this.datas.push(data);

        this.grid.addRow({
            name: material.name,
            recid: this.grid.element.records.length - 1
        });
    }

    /**
     * On change the material name
     * @param id: the id of the material in the array
     * @param value: the new name
     */
    protected changeMaterial (id: number, value: string): void {
        const data = this.datas[id];
        const material = this.editor.core.scene.getMaterialByName(data.name);

        if (material)
            material.name = value;
        
        data.name = value;
    }

    /**
     * Selects a material from the list
     * @param id: the id of the material in the array
     */
    protected selectMaterial (id: number): void {
        this.data = this.datas[id];

        this.code.setValue(this.data.code);
        this.vertex.setValue(this.data.vertex);
        this.pixel.setValue(this.data.pixel);
    }

    /**
     * Removes a material from the list and scene
     * @param id: the id of the material in the array
     */
    protected removeMaterial (id: number): void {
        const material = this.editor.core.scene.getMaterialByName(this.datas[id].name);
        if (material)
            material.dispose(true);
    }

    /**
     * Creates the code editor
     */
    protected async createEditors (): Promise<void> {
        // Create editors
        this.code = new CodeEditor('javascript', this.data.code);
        await this.code.build('MATERIAL-CREATOR-EDITOR-CODE');

        this.vertex = new CodeEditor('cpp', this.data.vertex);
        await this.vertex.build('MATERIAL-CREATOR-EDITOR-VERTEX');

        this.pixel = new CodeEditor('cpp', this.data.pixel);
        await this.pixel.build('MATERIAL-CREATOR-EDITOR-PIXEL');

        // Events
        this.layout.getPanelFromType('main').tabs.on('click', (ev) => {
            $('#' + this.currentTab).hide();
            this.currentTab = 'MATERIAL-CREATOR-EDITOR-' + ev.target.toUpperCase();
            $('#' + this.currentTab).show();
        });

        this.code.onChange = (value) => this.data && (this.data.code = value);
        this.vertex.onChange = (value) => this.data && (this.data.vertex = value);
        this.pixel.onChange = (value) => this.data && (this.data.pixel = value);
    }
}
