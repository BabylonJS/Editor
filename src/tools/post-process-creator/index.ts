import { } from 'babylonjs';

import Editor, {
    IDisposable, Tools,
    Layout, Grid, GridRow,
    CodeEditor,
    EditorPlugin
} from 'babylonjs-editor';

import Extensions from '../../extensions/extensions';
import PostProcessCreatorExtension, { PostProcessCreatorMetadata } from '../../extensions/post-process-creator/post-process-creator';

import '../../extensions/post-process-creator/post-process-creator';
import { CustomPostProcessConfig } from '../../extensions/post-process-creator/post-process';

export interface PostProcessGrid extends GridRow {
    name: string;
}

export default class PostProcessCreator extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public grid: Grid<PostProcessGrid> = null;

    // Protected members
    protected currentTab: string = 'POST-PROCESS-CREATOR-EDITOR-CODE';

    protected code: CodeEditor = null;
    protected pixel: CodeEditor = null;
    protected config: CodeEditor = null;

    protected datas: PostProcessCreatorMetadata[] = [];
    protected data: PostProcessCreatorMetadata = null;

    // Static members
    public static DefaultCode: string = '';
    public static DefaultPixel: string = '';
    public static DefaultConfig: string = '';

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Post-Process Creator');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.layout.element.destroy();
        this.grid.element.destroy();
        
        this.code.editor.dispose();
        this.pixel.editor.dispose();
        this.config.editor.dispose();

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Template
        !PostProcessCreator.DefaultCode && (PostProcessCreator.DefaultCode = await Tools.LoadFile<string>('./assets/templates/post-process-creator/class.js'));
        !PostProcessCreator.DefaultPixel && (PostProcessCreator.DefaultPixel = await Tools.LoadFile<string>('./assets/templates/post-process-creator/pixel.fx'));
        !PostProcessCreator.DefaultConfig && (PostProcessCreator.DefaultConfig = await Tools.LoadFile<string>('./assets/templates/post-process-creator/config.json'));

        // Request extension
        Extensions.RequestExtension<PostProcessCreatorExtension>(this.editor.core.scene, 'PostProcessCreatorExtension');

        // Metadatas
        this.editor.core.scene.metadata = this.editor.core.scene.metadata || { };
        if (!this.editor.core.scene.metadata['PostProcessCreator']) {
            this.editor.core.scene.metadata['PostProcessCreator'] = [{
                name: 'Custom Post-Process',
                code: PostProcessCreator.DefaultCode,
                pixel: PostProcessCreator.DefaultPixel,
                config: PostProcessCreator.DefaultConfig
            }];
        }

        this.datas = this.editor.core.scene.metadata['PostProcessCreator'];
        this.data = this.datas[0];

        // Create layout
        this.layout = new Layout('PostProcessCreatorCode');
        this.layout.panels = [
            { type: 'left', content: '<div id="POST-PROCESS-CREATOR-LIST" style="width: 100%; height: 100%;"></div>', size: 250, overflow: 'auto', resizable: true },
            { 
                type: 'main',
                content: `
                    <div id="POST-PROCESS-CREATOR-EDITOR-CODE" style="width: 100%; height: 100%;"></div>
                    <div id="POST-PROCESS-CREATOR-EDITOR-PIXEL" style="width: 100%; height: 100%; display: none;"></div>
                    <div id="POST-PROCESS-CREATOR-EDITOR-CONFIG" style="width: 100%; height: 100%; display: none;"></div>
                `,
                resizable: true,
                tabs: <any>[
                    { id: 'code', caption: 'Code' },
                    { id: 'pixel', caption: 'Pixel' },
                    { id: 'config', caption: 'Config' }
                ]
            }
        ];
        this.layout.build(this.divElement.id);

        // Create grid
        this.grid = new Grid<PostProcessGrid>('PostProcessCreatorGrid', {
            toolbarReload: false,
            toolbarEdit: false,
            toolbarSearch: false
        });
        this.grid.columns = [{ field: 'name', caption: 'Name', size: '100%', editable: { type: 'string' } }];
        this.grid.build('POST-PROCESS-CREATOR-LIST');
        this.grid.onAdd = () => this.addPostProcess();
        this.grid.onDelete = (selected) => this.datas.splice(selected[0], 1);
        this.grid.onChange = (selected, value) => this.changePostProcess(selected, value);
        this.grid.onClick = (selected) => this.selectPostProcess(selected[0]);
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
     * Creates a new post-process
     */
    protected addPostProcess (): void {
        // Create data and material
        const data: PostProcessCreatorMetadata = {
            name: 'Custom Post-Process' + this.datas.length + 1,
            code: PostProcessCreator.DefaultCode,
            pixel: PostProcessCreator.DefaultPixel,
            config: PostProcessCreator.DefaultConfig
        };

        // Collect and add to the list
        this.datas.push(data);

        this.grid.addRow({
            name: data.name,
            recid: this.grid.element.records.length - 1
        });
    }

     /**
     * On change the post-process name
     * @param id: the id of the post-process in the array
     * @param value: the new name
     */
    protected changePostProcess (id: number, value: string): void {
        const data = this.datas[id];
        data.name = value;
    }

    /**
     * Selects a post-process from the list
     * @param id: the id of the post-process in the array
     */
    protected selectPostProcess (id: number): void {
        this.data = this.datas[id];

        this.code.setValue(this.data.code);
        this.pixel.setValue(this.data.pixel);
        this.config.setValue(this.data.config);
    }

    /**
     * Creates the code editor
     */
    protected async createEditors (): Promise<void> {
        // Create editors
        this.code = new CodeEditor('javascript', this.data.code);
        await this.code.build('POST-PROCESS-CREATOR-EDITOR-CODE');

        this.pixel = new CodeEditor('cpp', this.data.pixel);
        await this.pixel.build('POST-PROCESS-CREATOR-EDITOR-PIXEL');

        this.config = new CodeEditor('json', this.data.config);
        await this.config.build('POST-PROCESS-CREATOR-EDITOR-CONFIG');

        // Events
        this.layout.getPanelFromType('main').tabs.on('click', (ev) => {
            $('#' + this.currentTab).hide();
            this.currentTab = 'POST-PROCESS-CREATOR-EDITOR-' + ev.target.toUpperCase();
            $('#' + this.currentTab).show();
        });

        this.code.onChange = (value) => this.data && (this.data.code = value);
        this.pixel.onChange = (value) => this.data && (this.data.pixel = value);
        this.config.onChange = (value) => this.data && (this.data.config = value);
    }
}
