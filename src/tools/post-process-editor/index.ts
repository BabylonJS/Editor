import { Camera, Effect, Tools as BabylonTools } from 'babylonjs';

import Editor, {
    Tools,
    Layout, Toolbar,
    Grid, GridRow,
    CodeEditor,
    Dialog,
    EditorPlugin,
    Picker,
    CodeProjectEditorFactory,
    VSCodeSocket
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
        
        this.code.dispose();
        this.pixel.dispose();
        this.config.dispose();

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
        
        this.datas = this.editor.core.scene.metadata['PostProcessCreator'];
        this.data = this.datas[0];

        // Create layout
        this.layout = new Layout('PostProcessCreatorCode');
        this.layout.panels = [
            { type: 'top', content: '<div id="POST-PROCESS-CREATOR-TOOLBAR" style="width: 100%; height: 100%;"></div>', size: 32, overflow: 'auto', resizable: true },
            { type: 'left', content: '<div id="POST-PROCESS-CREATOR-LIST" style="width: 100%; height: 100%;"></div>', size: 250, overflow: 'auto', resizable: true },
            { 
                type: 'main',
                content: `
                    <div id="POST-PROCESS-CREATOR-EDITOR-CODE" style="width: 100%; height: 100%; overflow: hidden;"></div>
                    <div id="POST-PROCESS-CREATOR-EDITOR-PIXEL" style="width: 100%; height: 100%; overflow: hidden; display: none;"></div>
                    <div id="POST-PROCESS-CREATOR-EDITOR-CONFIG" style="width: 100%; height: 100%; overflow: hidden; display: none;"></div>
                `,
                resizable: true,
                tabs: <any> [
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

        // UI
        if (!this.data)
            this.layout.lockPanel('main');
        else
            setTimeout(() => this.selectPostProcess(0), 500);

        // Opened in editor?
        if (PostProcessEditor.CodeProjectEditor)
            this.layout.lockPanel('main');

        // Sockets
        VSCodeSocket.OnUpdatePostProcessCode = async (d: PostProcessCreatorMetadata) => {
            // Get effective script modified in the vscode editor
            const effective = this.datas.find(s => s.id === d.id);
            const compiledCode = d.code ? await CodeEditor.TranspileTypeScript(d.code, d.name.replace(/ /, ''), {
                module: 'cjs',
                target: 'es5',
                experimentalDecorators: true,
            }) : null;

            if (!effective) {
                // Just refresh
                VSCodeSocket.RefreshPostProcess(this.datas);
                return;
            }
            else {
                // Just update
                d.code && (effective.code = d.code);
                d.pixel && (effective.pixel = d.pixel);
                d.config && (effective.config = d.config);
                compiledCode && (effective.compiledCode = compiledCode);
            }

            if (this.data && this.data.id === d.id) {
                this.selectPostProcess(this.datas.indexOf(this.data));
            }
        };
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

        // Update socket
        VSCodeSocket.RefreshPostProcess(this.datas);
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

        this.grid.selectNone();
        this.grid.select([this.datas.length - 1]);

        // Select new post-process to edit
        this.selectPostProcess(this.datas.length - 1);

        // UI
        this.layout.unlockPanel('main');

        // Update socket
        VSCodeSocket.RefreshPostProcess(data);
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

        // Update socket
        VSCodeSocket.RefreshMaterial(this.datas);
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

                VSCodeSocket.RefreshPostProcess(this.data);
            }  
        };

        this.pixel.onChange = (value) => {
            if (!this.data)
                return;
            
            this.data.pixel = value;
            VSCodeSocket.RefreshPostProcess(this.data);
        };
        
        this.config.onChange = (value) => {
            if (!this.data)
                return;
            
            this.data.config = value;
            VSCodeSocket.RefreshPostProcess(this.data);
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
