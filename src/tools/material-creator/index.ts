import { Engine, Scene, Effect, ArcRotateCamera, Mesh, Vector3, Color4, Color3, Material } from 'babylonjs';

import Editor, {
    IDisposable, Tools,
    Layout, Toolbar, Grid, GridRow,
    CodeEditor,
    EditorPlugin
} from 'babylonjs-editor';

import Extensions from '../../extensions/extensions';
import MaterialCreatorExtension, { MaterialCreatorMetadata } from '../../extensions/material-creator/material-creator';

import '../../extensions/material-creator/material-creator';
import CustomEditorMaterial from '../../extensions/material-creator/material';

export interface MaterialGrid extends GridRow {
    name: string;
}

export default class MaterialCreator extends EditorPlugin {
    // Public members
    public layout: Layout = null;
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
        
        this.code.editor.dispose();
        this.vertex.editor.dispose();
        this.pixel.editor.dispose();
        this.config.editor.dispose();

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Template
        !MaterialCreator.DefaultCode && (MaterialCreator.DefaultCode = await Tools.LoadFile<string>('./assets/templates/material-creator/class.js'));
        !MaterialCreator.DefaultVertex && (MaterialCreator.DefaultVertex = await Tools.LoadFile<string>('./assets/templates/material-creator/vertex.fx'));
        !MaterialCreator.DefaultPixel && (MaterialCreator.DefaultPixel = await Tools.LoadFile<string>('./assets/templates/material-creator/pixel.fx'));
        !MaterialCreator.DefaultConfig && (MaterialCreator.DefaultConfig = await Tools.LoadFile<string>('./assets/templates/material-creator/config.json'));

        // Request extension
        this.extension = Extensions.RequestExtension<MaterialCreatorExtension>(this.editor.core.scene, 'MaterialCreatorExtension');

        // Metadatas
        this.editor.core.scene.metadata = this.editor.core.scene.metadata || { };
        if (!this.editor.core.scene.metadata['MaterialCreator']) {
            this.datas = this.editor.core.scene.metadata['MaterialCreator'] = [{
                name: 'Custom material',
                code: MaterialCreator.DefaultCode,
                vertex: MaterialCreator.DefaultVertex,
                pixel: MaterialCreator.DefaultPixel,
                config: MaterialCreator.DefaultConfig,
                userConfig: { }
            }];
            this.data = this.datas[0];

            const material = this.extension.createMaterial({
                name: this.data.name,
                code: null,
                vertex: this.data.vertex,
                pixel: this.data.pixel,
                config: this.data.config,
                userConfig: { }
            });

            this.editor.core.onAddObject.notifyObservers(material);
        }

        this.datas = this.editor.core.scene.metadata['MaterialCreator'];
        this.data = this.datas[0];

        // Create layout
        this.layout = new Layout('MaterialCreatorCode');
        this.layout.panels = [
            { type: 'left', content: '<div id="MATERIAL-CREATOR-LIST" style="width: 100%; height: 100%;"></div>', size: 250, overflow: 'auto', resizable: true },
            { 
                type: 'main',
                content: `
                    <div id="MATERIAL-CREATOR-EDITOR-CODE" style="width: 100%; height: 100%;"></div>
                    <div id="MATERIAL-CREATOR-EDITOR-VERTEX" style="width: 100%; height: 100%; display: none;"></div>
                    <div id="MATERIAL-CREATOR-EDITOR-PIXEL" style="width: 100%; height: 100%; display: none;"></div>
                    <div id="MATERIAL-CREATOR-EDITOR-CONFIG" style="width: 100%; height: 100%; display: none;"></div>
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
            pixel: MaterialCreator.DefaultPixel,
            config: MaterialCreator.DefaultConfig,
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

        this.code.setValue(this.data.code);
        this.vertex.setValue(this.data.vertex);
        this.pixel.setValue(this.data.pixel);
        this.config.setValue(this.data.config);
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
        this.code = new CodeEditor('javascript', this.data.code);
        await this.code.build('MATERIAL-CREATOR-EDITOR-CODE');

        this.vertex = new CodeEditor('cpp', this.data.vertex);
        await this.vertex.build('MATERIAL-CREATOR-EDITOR-VERTEX');

        this.pixel = new CodeEditor('cpp', this.data.pixel);
        await this.pixel.build('MATERIAL-CREATOR-EDITOR-PIXEL');

        this.config = new CodeEditor('json', this.data.config);
        await this.config.build('MATERIAL-CREATOR-EDITOR-CONFIG');

        // Events
        this.layout.getPanelFromType('main').tabs.on('click', (ev) => {
            $('#' + this.currentTab).hide();
            this.currentTab = 'MATERIAL-CREATOR-EDITOR-' + ev.target.toUpperCase();
            $('#' + this.currentTab).show();
        });

        this.code.onChange = (value) => this.data && (this.data.code = value);

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
}
