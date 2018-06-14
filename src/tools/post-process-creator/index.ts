import { Camera, Effect } from 'babylonjs';

import Editor, {
    IDisposable, Tools,
    Layout, Toolbar,
    Grid, GridRow,
    CodeEditor,
    EditorPlugin
} from 'babylonjs-editor';

import Extensions from '../../extensions/extensions';
import PostProcessCreatorExtension, { PostProcessCreatorMetadata } from '../../extensions/post-process-creator/post-process-creator';

import '../../extensions/post-process-creator/post-process-creator';
import PostProcessEditor, { CustomPostProcessConfig } from '../../extensions/post-process-creator/post-process';

export interface PostProcessGrid extends GridRow {
    name: string;
    preview: boolean;
}

export default class PostProcessCreator extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;
    public grid: Grid<PostProcessGrid> = null;

    // Protected members
    protected currentTab: string = 'POST-PROCESS-CREATOR-EDITOR-CODE';

    protected code: CodeEditor = null;
    protected pixel: CodeEditor = null;
    protected config: CodeEditor = null;

    protected datas: PostProcessCreatorMetadata[] = [];
    protected data: PostProcessCreatorMetadata = null;

    protected activeCamera: Camera = this.editor.playCamera;

    protected onResize = () => this.layout.element.resize();

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
        this.toolbar.element.destroy();
        this.grid.element.destroy();
        
        this.code.editor.dispose();
        this.pixel.editor.dispose();
        this.config.editor.dispose();

        // Events
        this.editor.core.onResize.removeCallback(this.onResize);

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Template
        !PostProcessCreator.DefaultCode && (PostProcessCreator.DefaultCode = await Tools.LoadFile<string>('./assets/templates/post-process-creator/' + (Tools.IsElectron() ? 'class.ts' : 'class.js')));
        !PostProcessCreator.DefaultPixel && (PostProcessCreator.DefaultPixel = await Tools.LoadFile<string>('./assets/templates/post-process-creator/pixel.fx'));
        !PostProcessCreator.DefaultConfig && (PostProcessCreator.DefaultConfig = await Tools.LoadFile<string>('./assets/templates/post-process-creator/config.json'));

        // Request extension
        Extensions.RequestExtension<PostProcessCreatorExtension>(this.editor.core.scene, 'PostProcessCreatorExtension');

        // Metadatas
        this.editor.core.scene.metadata = this.editor.core.scene.metadata || { };
        if (!this.editor.core.scene.metadata['PostProcessCreator']) {
            this.editor.core.scene.metadata['PostProcessCreator'] = [{
                name: 'Custom Post-Process',
                preview: true,
                cameraName: this.activeCamera ? this.activeCamera.name : null,
                code: PostProcessCreator.DefaultCode,
                pixel: PostProcessCreator.DefaultPixel,
                config: PostProcessCreator.DefaultConfig,
                userConfig: { }
            }];
        }

        this.datas = this.editor.core.scene.metadata['PostProcessCreator'];
        this.data = this.datas[0];

        this.datas.forEach(d => this.createOrUpdatePostProcess(d.name));

        // Create layout
        this.layout = new Layout('PostProcessCreatorCode');
        this.layout.panels = [
            { type: 'top', content: '<div id="POST-PROCESS-CREATOR-TOOLBAR" style="width: 100%; height: 100%;"></div>', size: 32, overflow: 'auto', resizable: true },
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

        // Create toolbar
        this.toolbar = new Toolbar('PostProcessCreatorToolbar');
        this.toolbar.items = [
            { id: 'project', type: 'menu', caption: 'Project', img: 'icon-folder', items: [
                { id: 'add', caption: 'Add Existing Project...', img: 'icon-export' },
                { id: 'download', caption: 'Download Project...', img: 'icon-export' }
            ] }
        ];
        this.toolbar.build('POST-PROCESS-CREATOR-TOOLBAR');

        // Create grid
        this.grid = new Grid<PostProcessGrid>('PostProcessCreatorGrid', {
            toolbarReload: false,
            toolbarEdit: false,
            toolbarSearch: false
        });
        this.grid.columns = [
            { field: 'name', caption: 'Name', size: '80%', editable: { type: 'string' } },
            { field: 'preview', caption: 'Preview', size: '20%', editable: { type: 'checkbox' } }
        ];
        this.grid.build('POST-PROCESS-CREATOR-LIST');
        this.grid.onAdd = () => this.addPostProcess();
        this.grid.onDelete = (selected) => this.datas.splice(selected[0], 1);
        this.grid.onChange = (selected, value) => this.changePostProcess(selected, value);
        this.grid.onClick = (selected) => this.selectPostProcess(selected[0]);
        this.datas.forEach((d, index) => this.grid.addRecord({
            name: d.name,
            preview: d.preview,
            recid: index
        }));
        this.grid.element.refresh();
        this.grid.select([0]);

        // Add code editors
        await this.createEditors();

        // Events
        this.editor.core.onResize.add(this.onResize);
    }

    /**
     * On the user shows the plugin
     */
    public onShow (): void {
        this.grid.element.resize();
    }

    /**
     * Resizes the plugin
     */
    protected resize (): void {
        this.layout.element.resize();
    }

    /**
     * Creates a new post-process
     */
    protected addPostProcess (): void {
        // Create data and material
        const data: PostProcessCreatorMetadata = {
            preview: true,
            cameraName: this.activeCamera ? this.activeCamera.name : null,
            name: 'Custom Post-Process' + this.datas.length + 1,
            code: PostProcessCreator.DefaultCode,
            pixel: PostProcessCreator.DefaultPixel,
            config: PostProcessCreator.DefaultConfig,
            userConfig: { }
        };

        // Collect and add to the list
        this.datas.push(data);

        this.grid.addRow({
            name: data.name,
            preview: data.preview,
            recid: this.grid.element.records.length - 1
        });

        // Add and select
        const p = this.createOrUpdatePostProcess(data.name);

        if (p)
            this.editor.core.onSelectObject.notifyObservers(p);
    }

    /**
     * Creates or updates the given post-process name
     * @param name: the name of the post-process
     */
    protected createOrUpdatePostProcess (name: string): PostProcessEditor {
        if (!this.data.preview)
            return null;
        
        const camera = this.editor.core.scene.activeCamera;
        for (const p of camera._postProcesses as PostProcessEditor[]) {
            if (!p)
                continue;
            
            if (p.name === name) {
                p.setConfig(JSON.parse(this.data.config));
                p.userConfig = { };
                this.editor.core.onSelectObject.notifyObservers(p);
                return p;
            }
        }

        // Update shader store
        Effect.ShadersStore[name + 'PixelShader'] = this.data.pixel;

        // Create post-process
        const config = JSON.parse(this.data.config);
        const p = new PostProcessEditor(name, name, camera, config, null);
        p.setConfig(config);

        // Update graph tool
        this.editor.graph.clear();
        this.editor.graph.fill();
        this.editor.graph.select(p.name);

        this.editor.core.onSelectObject.notifyObservers(p);

        return p;
    }

     /**
     * On change the post-process name
     * @param id: the id of the post-process in the array
     * @param value: the new name
     */
    protected changePostProcess (id: number, value: string | boolean): void {
        const data = this.datas[id];
        const postProcesses = this.editor.core.scene.postProcesses;

        // Name
        if (typeof value === 'string') {
            const lastName = data.name;
            data.name = value;

            // Update post-process name
            for (const p of postProcesses) {
                if (p instanceof PostProcessEditor && p.name === lastName) {
                    p.name = value;
                    break;
                }
            }

            return;
        }

        // Preview
        const camera = this.editor.core.scene.activeCamera;
        data.preview = value;

        for (const p of postProcesses) {
            if (!(p instanceof PostProcessEditor) || p.name !== data.name)
                continue;

            if (value)
                camera.attachPostProcess(p, camera._postProcesses.length + id);
            else
                camera.detachPostProcess(p);
            
            return;
        }
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
        this.code = new CodeEditor(Tools.IsElectron() ? 'typescript' : 'javascript', this.data.code);
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

        this.code.onChange = (value) => {
            if (this.data) {
                this.data.code = value;

                if (Tools.IsElectron())
                    this.data.compiledCode = this.code.transpileTypeScript(value);
            }  
        };

        this.pixel.onChange = (value) => {
            if (!this.data)
                return;
            
            this.data.pixel = value;
            Effect.ShadersStore[this.data.name + 'PixelShader'] = this.data.pixel;
            this.createOrUpdatePostProcess(this.data.name);
        };
        
        this.config.onChange = (value) => {
            if (!this.data)
                return;
            
            this.data.config = value;

            try {
                const config = JSON.parse(value);
                const p = this.createOrUpdatePostProcess(this.data.name);
            } catch (e) { /* Catch silently */ }
        }
    }
}
