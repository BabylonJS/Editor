import { Effect, Material, Tools as BabylonTools } from 'babylonjs';

import Editor, {
    Tools,
    Layout, Grid, GridRow, Toolbar,
    Dialog,
    CodeEditor,
    EditorPlugin,
    CodeProjectEditorFactory
} from 'babylonjs-editor';
import CodeProjectEditor from 'babylonjs-editor-code-editor';

import Extensions from '../../extensions/extensions';
import MaterialCreatorExtension, { MaterialCreatorMetadata } from '../../extensions/material-editor/material-editor';

import '../../extensions/material-editor/material-editor';
import CustomEditorMaterial from '../../extensions/material-editor/material';

import Helpers from '../helpers';

export interface MaterialGrid extends GridRow {
    name: string;
}

export default class MaterialEditor extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;
    public grid: Grid<MaterialGrid> = null;

    // Protected members
    protected currentTab: string = 'MATERIAL-CREATOR-EDITOR-CODE';

    protected code: CodeEditor = null;
    protected vertex: CodeEditor = null;
    protected pixel: CodeEditor = null;
    protected config: CodeEditor = null;

    protected datas: MaterialCreatorMetadata[] = [];
    protected data: MaterialCreatorMetadata = null;

    protected extension: MaterialCreatorExtension = null;

    // Static members
    public static DefaultCode: string = '';
    public static DefaultVertex: string = '';
    public static DefaultPixel: string = '';
    public static DefaultConfig: string = '';

    public static CodeProjectEditor: CodeProjectEditor = null;

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Material Editor');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.layout.element.destroy();
        this.toolbar.element.destroy();
        this.grid.element.destroy();
        
        this.code.dispose();
        this.vertex.dispose();
        this.pixel.dispose();
        this.config.dispose();

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Template
        !MaterialEditor.DefaultCode && (MaterialEditor.DefaultCode = await Tools.LoadFile<string>('./assets/templates/material-creator/class.ts'));
        !MaterialEditor.DefaultVertex && (MaterialEditor.DefaultVertex = await Tools.LoadFile<string>('./assets/templates/material-creator/vertex.fx'));
        !MaterialEditor.DefaultPixel && (MaterialEditor.DefaultPixel = await Tools.LoadFile<string>('./assets/templates/material-creator/pixel.fx'));
        !MaterialEditor.DefaultConfig && (MaterialEditor.DefaultConfig = await Tools.LoadFile<string>('./assets/templates/material-creator/config.json'));

        // Request extension
        this.extension = Extensions.RequestExtension<MaterialCreatorExtension>(this.editor.core.scene, 'MaterialCreatorExtension');

        // Metadatas
        this.editor.core.scene.metadata = this.editor.core.scene.metadata || { };
        if (!this.editor.core.scene.metadata['MaterialCreator'])
            this.datas = this.editor.core.scene.metadata['MaterialCreator'] = [];

        this.datas = this.editor.core.scene.metadata['MaterialCreator'];
        this.data = this.datas[0];

        // Create layout
        this.layout = new Layout('MaterialCreatorCode');
        this.layout.panels = [
            { type: 'top', content: '<div id="MATERIAL-CREATOR-TOOLBAR" style="width: 100%; height: 100%;"></div>', size: 32, overflow: 'auto', resizable: true },
            { type: 'left', content: '<div id="MATERIAL-CREATOR-LIST" style="width: 100%; height: 100%;"></div>', size: 250, overflow: 'auto', resizable: true },
            { 
                type: 'main',
                content: `
                    <div id="MATERIAL-CREATOR-EDITOR-CODE" style="width: 100%; height: 100%; overflow: hidden;"></div>
                    <div id="MATERIAL-CREATOR-EDITOR-VERTEX" style="width: 100%; height: 100%; overflow: hidden; display: none;"></div>
                    <div id="MATERIAL-CREATOR-EDITOR-PIXEL" style="width: 100%; height: 100%; overflow: hidden; display: none;"></div>
                    <div id="MATERIAL-CREATOR-EDITOR-CONFIG" style="width: 100%; height: 100%; overflow: hidden; display: none;"></div>
                `,
                resizable: true,
                tabs: <any>[
                    { id: 'code', caption: 'Code' },
                    { id: 'vertex', caption: 'Vertex' },
                    { id: 'pixel', caption: 'Pixel' },
                    { id: 'config', caption: 'Config' }
                ]
            }
        ];
        this.layout.build(this.divElement.id);

        // Create toolbar
        this.toolbar = new Toolbar('MaterialEditorToolbar');
        this.toolbar.items = [
            { id: 'open-code-editor', text: 'Open Code Editor', caption: 'Open Code Editor', img: 'icon-edit' }
        ];
        this.toolbar.onClick = id => this.onToolbarClick(id);
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
        setTimeout(() => this.selectMaterial(0), 500);
    }

    /**
     * On the user shows the plugin
     */
    public onShow (): void {
        this.grid.element.resize();
    }

    /**
     * Called on the window, layout etc. is resized.
     */
    public onResize (): void {
        this.layout.element.resize();
    }

    /**
     * On the user clicks on the toolbar
     * @param id the id of the clicked item
     */
    protected onToolbarClick (id: string): void {
        switch (id) {
            // Code Editor
            case 'open-code-editor':
                this.editCode();
                break;
            default: break;
        }
    }

    /**
     * Creates a new material
     */
    protected async addMaterial (): Promise<void> {
        // Create data and material
        const name = await Dialog.CreateWithTextInput('Material Name');
        const data: MaterialCreatorMetadata = {
            name: name,
            id: BabylonTools.RandomId(),
            code: MaterialEditor.DefaultCode,
            vertex: MaterialEditor.DefaultVertex,
            pixel: MaterialEditor.DefaultPixel,
            config: MaterialEditor.DefaultConfig,
            userConfig: { }
        };

        const material = this.extension.createMaterial({
            name: data.name,
            code: null,
            vertex: data.vertex,
            pixel: data.pixel,
            config: data.config,
            userConfig: data.userConfig
        });

        // Collect and add to the list
        this.datas.push(data);

        this.grid.addRow({
            name: material.name,
            recid: this.grid.element.records.length - 1
        });

        // Notify
        this.editor.core.onAddObject.notifyObservers(material);
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
        if (!this.data) {
            this.code.setValue('');
            this.vertex.setValue('');
            this.pixel.setValue('');
            this.config.setValue('');
            return this.layout.lockPanel('main', 'No Material Selected');
        }

        this.code.setValue(this.data.code);
        this.vertex.setValue(this.data.vertex);
        this.pixel.setValue(this.data.pixel);
        this.config.setValue(this.data.config);

        // Manage extra libs
        Helpers.UpdateMonacoTypings(this.editor, this.data);

        // Unlock
        this.layout.unlockPanel('main');
    }

    /**
     * Removes a material from the list and scene
     * @param id: the id of the material in the array
     */
    protected removeMaterial (id: number): void {
        const material = this.editor.core.scene.getMaterialByName(this.datas[id].name);
        if (material)
            material.dispose(true);

        this.datas.splice(id, 1);

        // Select first material
        this.selectMaterial(0);
    }

    /**
     * Updaes the current material's shaders (vertex & pixel)
     */
    protected updateShaders (): void {
        // Update material shader
        const material = <CustomEditorMaterial> this.editor.core.scene.getMaterialByName(this.data.name);
        if (!material)
            return;

        Effect.ShadersStore[material._shaderName + 'VertexShader'] = this.data.vertex;
        Effect.ShadersStore[material._shaderName + 'PixelShader'] = this.data.pixel;

        material._buildId++;
        material.markAsDirty(Material.MiscDirtyFlag);
    }

    /**
     * Creates the code editor
     */
    protected async createEditors (): Promise<void> {
        // Create editors
        this.code = new CodeEditor('typescript', '');
        await this.code.build('MATERIAL-CREATOR-EDITOR-CODE');

        this.vertex = new CodeEditor('cpp', '');
        await this.vertex.build('MATERIAL-CREATOR-EDITOR-VERTEX');

        this.pixel = new CodeEditor('cpp', '');
        await this.pixel.build('MATERIAL-CREATOR-EDITOR-PIXEL');

        this.config = new CodeEditor('json', '');
        await this.config.build('MATERIAL-CREATOR-EDITOR-CONFIG');

        // Events
        this.layout.getPanelFromType('main').tabs.on('click', (ev) => {
            $('#' + this.currentTab).hide();
            this.currentTab = 'MATERIAL-CREATOR-EDITOR-' + ev.target.toUpperCase();
            $('#' + this.currentTab).show();
        });

        this.code.onChange = (value) => {
            if (this.data) {
                this.data.code = value;
                this.data.compiledCode = this.code.transpileTypeScript(value, this.data.name.replace(/ /, ''));
            }
        };

        this.vertex.onChange = (value) => {
            if (!this.data)
                return;
            
            this.data.vertex = value;
            this.updateShaders();
        };

        this.pixel.onChange = (value) => {
            if (!this.data)
                return;
            
            this.data.pixel = value;
            this.updateShaders();
        };

        this.config.onChange = (value) => {
            if (!this.data)
                return;
            
            this.data.config = value;

            const material = <CustomEditorMaterial> this.editor.core.scene.getMaterialByName(this.data.name);
            if (material) {
                try {
                    const config = JSON.parse(this.data.config);
                    material.config = config;

                    // Update shaders and edition tool
                    this.editor.core.onSelectObject.notifyObservers(material);
                    this.updateShaders();
                } catch (e) { /* Silently */ }
            }
        };
    }

    /**
     * On edit the code in a new window
     * @param id: the id of the script
     */
    protected async editCode (): Promise<void> {
        // Check if already opened
        if (MaterialEditor.CodeProjectEditor)
            return;

        // Create
        const editor = await CodeProjectEditorFactory.Create(this.editor, {
            name: 'Code Editor - Materials',
            scripts: this.editor.core.scene.metadata['MaterialCreator'],
            onOpened: () => {
                this.layout.lockPanel('main');
            },
            onClose: () => {
                MaterialEditor.CodeProjectEditor = null;

                if (this.data)
                    this.layout.unlockPanel('main');
            }
        });

        MaterialEditor.CodeProjectEditor = <any>editor;
    }
}
