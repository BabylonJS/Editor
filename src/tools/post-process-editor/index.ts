import { Camera, Effect, Tools as BabylonTools } from 'babylonjs';

import Editor, {
    Tools,
    Layout, Toolbar,
    Grid, GridRow,
    CodeEditor,
    Dialog,
    EditorPlugin,
    Picker,
    CodeProjectEditorFactory
} from 'babylonjs-editor';
import CodeProjectEditor from 'babylonjs-editor-code-editor';

import Extensions from '../../extensions/extensions';
import PostProcessCreatorExtension, { PostProcessCreatorMetadata } from '../../extensions/post-process-editor/post-process-editor';

import '../../extensions/post-process-editor/post-process-editor';
import AbstractPostProcessEditor from '../../extensions/post-process-editor/post-process';

import Helpers from '../helpers';

export interface PostProcessGrid extends GridRow {
    name: string;
    preview: boolean;
}

export default class PostProcessEditor extends EditorPlugin {
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

    public static CodeProjectEditor: CodeProjectEditor = null;

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Post-Process Editor');
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
        !PostProcessEditor.DefaultCode && (PostProcessEditor.DefaultCode = await Tools.LoadFile<string>('./assets/templates/post-process-creator/class.ts'));
        !PostProcessEditor.DefaultPixel && (PostProcessEditor.DefaultPixel = await Tools.LoadFile<string>('./assets/templates/post-process-creator/pixel.fx'));
        !PostProcessEditor.DefaultConfig && (PostProcessEditor.DefaultConfig = await Tools.LoadFile<string>('./assets/templates/post-process-creator/config.json'));

        // Request extension
        Extensions.RequestExtension<PostProcessCreatorExtension>(this.editor.core.scene, 'PostProcessCreatorExtension');

        // Metadatas
        this.editor.core.scene.metadata = this.editor.core.scene.metadata || { };
        if (!this.editor.core.scene.metadata['PostProcessCreator'])
            this.editor.core.scene.metadata['PostProcessCreator'] = [];

        /*
        if (this.editor.core.scene.metadata['PostProcessCreator'].length === 0) {
            this.editor.core.scene.metadata['PostProcessCreator'] = [{
                name: 'Custom Post-Process',
                preview: true,
                cameraName: this.activeCamera ? this.activeCamera.name : null,
                code: PostProcessCreator.DefaultCode,
                pixel: PostProcessCreator.DefaultPixel,
                config: PostProcessCreator.DefaultConfig,
                userConfig: {
                    textures: [],
                    floats: [],
                    vectors2: [],
                    vectors3: []
                }
            }];
        }
        */
        
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
            ] },
            { id: 'open-code-editor', text: 'Open Code Editor', caption: 'Open Code Editor', img: 'icon-edit' }
        ];
        this.toolbar.onClick = id => this.onToolbarClick(id);
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
        this.grid.onDelete = (selected) => this.deletePostProcess(selected[0]);
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

        // UI
        if (!this.data)
            this.layout.lockPanel('main');
        else
            setTimeout(() => this.selectPostProcess(0), 500);

        // Opened in editor?
        if (PostProcessEditor.CodeProjectEditor)
            this.layout.lockPanel('main');
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
     * On the user clicks on the toolbar
     * @param id the id of the clicked item
     */
    protected onToolbarClick (id: string): void {
        switch (id) {
            // Project
            case 'project:add':
                Tools.OpenFileDialog(files => this._addPostProcessesFromFiles(files[0]));
                break;
            case 'project:download':
                const file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(this.datas)), 'post-processes.json');
                BabylonTools.Download(file, file.name);
                break;

            // Code Editor
            case 'open-code-editor':
                this.editCode();
                break;
            default: break;
        }
    }

    /**
     * Deletes the given post-process
     * @param id the id of the selected item
     */
    protected deletePostProcess (id: number): void {
        const p = this.createOrUpdatePostProcess(this.datas[id].name);
        if (p)
            p.dispose();

        // Remove data
        this.datas.splice(id, 1);
        this.data = this.datas[0];

        if (this.data)
            this.selectPostProcess(0);
        else {
            this.code.setValue('');
            this.pixel.setValue('');
            this.config.setValue('');

            this.layout.lockPanel('main');
        }
    }

    /**
     * Creates a new post-process
     */
    protected async addPostProcess (): Promise<void> {
        // Create data and material
        const name = await Dialog.CreateWithTextInput('Post-Process Name');
        const data: PostProcessCreatorMetadata = this.data = {
            preview: true,
            cameraName: this.activeCamera ? this.activeCamera.name : null,
            name: name,
            code: PostProcessEditor.DefaultCode,
            pixel: PostProcessEditor.DefaultPixel,
            config: PostProcessEditor.DefaultConfig,
            userConfig: {
                textures: [],
                floats: [],
                vectors2: [],
                vectors3: []
            },
            id: BabylonTools.RandomId()
        };

        // Collect and add to the list
        this.datas.push(data);

        this.grid.addRow({
            name: data.name,
            preview: data.preview,
            recid: this.grid.element.records.length - 1
        });

        this.grid.select([this.datas.length - 1]);

        // Select new post-process to edit
        this.selectPostProcess(this.datas.length - 1);

        // Add and select
        const p = this.createOrUpdatePostProcess(data.name);

        if (p)
            this.editor.core.onSelectObject.notifyObservers(p);

        // UI
        this.layout.unlockPanel('main');
    }

    /**
     * Creates or updates the given post-process name
     * @param name: the name of the post-process
     */
    protected createOrUpdatePostProcess (name: string): AbstractPostProcessEditor {
        if (!this.data.preview)
            return null;
        
        const camera = this.editor.core.scene.activeCamera;
        for (const p of camera._postProcesses as AbstractPostProcessEditor[]) {
            if (!p)
                continue;
            
            if (p.name === name) {
                p.setConfig(JSON.parse(this.data.config));
                this.editor.core.onSelectObject.notifyObservers(p);
                return p;
            }
        }

        // Update shader store
        Effect.ShadersStore[name + 'PixelShader'] = this.data.pixel;

        // Create post-process
        const config = JSON.parse(this.data.config);
        const p = new AbstractPostProcessEditor(name, name, camera, this.editor.core.engine, config, null);
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
                if (p instanceof AbstractPostProcessEditor && p.name === lastName) {
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
            if (!(p instanceof AbstractPostProcessEditor) || p.name !== data.name)
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

        // Manage extra libs
        Helpers.UpdateMonacoTypings(this.editor, this.data);

        // Finish
        if (PostProcessEditor.CodeProjectEditor)
            this.layout.lockPanel('main');
    }

    /**
     * Creates the code editor
     */
    protected async createEditors (): Promise<void> {
        // Create editors
        this.code = new CodeEditor('typescript', this.data ? this.data.code : '');
        await this.code.build('POST-PROCESS-CREATOR-EDITOR-CODE');

        this.pixel = new CodeEditor('cpp', this.data ? this.data.pixel : '');
        await this.pixel.build('POST-PROCESS-CREATOR-EDITOR-PIXEL');

        this.config = new CodeEditor('json', this.data ? this.data.config : '');
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
                this.data.compiledCode = this.code.transpileTypeScript(value, this.data.name.replace(/ /, ''));
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

    /**
     * On edit the code in a new window
     * @param id: the id of the script
     */
    protected async editCode (): Promise<void> {
        // Check if already opened
        if (PostProcessEditor.CodeProjectEditor)
            return;

        // Create
        const editor = await CodeProjectEditorFactory.Create(this.editor, {
            name: 'Code Editor - Post-Processes',
            scripts: this.editor.core.scene.metadata['PostProcessCreator'],
            onOpened: () => {
                this.layout.lockPanel('main');
            },
            onClose: () => {
                PostProcessEditor.CodeProjectEditor = null;

                if (this.data)
                    this.layout.unlockPanel('main');
            }
        });

        PostProcessEditor.CodeProjectEditor = <any>editor;
    }

    // Create a window and a grid to select post-processes to add
    private async _addPostProcessesFromFiles (file: File): Promise<void> {
        const content = await Tools.ReadFileAsText(file);
        const data = JSON.parse(content);

        const postProcesses = <PostProcessCreatorMetadata[]> (data.customMetadatas ? data.customMetadatas.PostProcessCreatorExtension : data);
        if (!postProcesses)
            return;

        Tools.SortAlphabetically(postProcesses, 'name');

        // Create picker
        const picker = new Picker('AddPostProcesses');
        picker.addItems(postProcesses);
        picker.open((items, selected) => {
            selected.forEach(s => {
                const data = postProcesses[s];
                this.datas.push(data);

                this.grid.addRow({
                    name: data.name,
                    preview: data.preview,
                    recid: this.grid.element.records.length - 1
                });
            });

            if (selected.length > 0 && !PostProcessEditor.CodeProjectEditor) {
                this.layout.unlockPanel('main');

                this.data = this.datas[this.datas.length - 1];
                this.grid.select([this.datas.length - 1]);
                this.selectPostProcess(this.datas.length - 1);
            }
        });
    }
}
