import {
    Node, GroundMesh, InstancedMesh,
    DirectionalLight, HemisphericLight,
    Scene,
    Tools as BabylonTools,
    IParticleSystem
} from 'babylonjs';
import * as BABYLON from 'babylonjs';

import Editor, {
    Tools,

    Layout,
    Toolbar,
    Grid, GridRow,
    CodeEditor,
    Tree,
    Window as Popin,
    Dialog,
    Picker,

    EditorPlugin,

    ProjectRoot
} from 'babylonjs-editor';

import Extensions from '../../extensions/extensions';
import CodeExtension, { BehaviorMetadata, BehaviorCode, BehaviorNodeMetadata } from '../../extensions/behavior/code';

import '../../extensions/behavior/code';

export interface CodeGrid extends GridRow {
    name: string;
    active: boolean;
}

export default class BehaviorCodeEditor extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;
    public grid: Grid<CodeGrid> = null;

    // Protected members
    protected extension: CodeExtension = null;

    protected code: CodeEditor = null;
    protected template: string = '// Some code';

    protected node: Node | Scene | IParticleSystem = null;

    protected datas: BehaviorNodeMetadata = null;
    protected data: BehaviorCode = null;

    protected onSelectObject = (node) => node && this.selectObject(node);
    protected onSelectAsset = (asset) => asset && this.selectAsset(asset);
    protected onResize = () => this.layout.element.resize();

    protected targetNode: any;
    protected targetNodeAddScript: boolean;
    protected targetNodeSetScript: boolean;

    // Private members
    private _timeoutId: number = -1;

    /**
     * Constructor
     * @param name: the name of the plugin 
     * @param targetNode: the node being edited
     * @param targetNodeAddScript: if the code editor should prompt a string request
     */
    constructor(public editor: Editor, targetNode: any, targetNodeAddScript: boolean, targetNodeSetScript: boolean) {
        super('Code Editor');

        // Misc.
        this.targetNode = targetNode;
        this.targetNodeAddScript = targetNodeAddScript;
        this.targetNodeSetScript = targetNodeSetScript;
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.toolbar.element.destroy();
        this.grid.element.destroy();
        this.layout.element.destroy();

        this.code.editor.dispose();

        // Events
        this.editor.core.onSelectObject.removeCallback(this.onSelectObject);
        this.editor.core.onSelectAsset.removeCallback(this.onSelectAsset);
        this.editor.core.onResize.removeCallback(this.onResize);

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
            { type: 'left', content: '<div id="CODE-BEHAVIOR-LIST" style="width: 100%; height: 100%;"></div>', size: 250, overflow: 'auto', resizable: true },
            { type: 'main', content: '<div id="CODE-BEHAVIOR-EDITOR" style="width: 100%; height: 100%;"></div>', resizable: true }
        ];
        this.layout.build(div.attr('id'));

        // Lock
        this.layout.lockPanel('left', 'Loading...', true);

        // Add toolbar
        this.toolbar = new Toolbar('CodeToolbar');
        this.toolbar.items = [
            { id: 'add-new', text: 'Add New Script', caption: 'Add New Script', img: 'icon-add' },
            { type: 'break' },
            { id: 'import', text: 'Import from...', caption: 'Import from...', img: 'icon-add' }
        ];
        this.toolbar.right = 'No object selected';
        this.toolbar.helpUrl = 'http://doc.babylonjs.com/resources/custom_scripts';
        this.toolbar.onClick = (id) => this.toolbarClicked(id);
        this.toolbar.build('CODE-BEHAVIOR-TOOLBAR');

        // Add grid
        this.grid = new Grid<CodeGrid>('CodeGrid', {
            toolbarReload: false,
            toolbarSearch: false
        });
        this.grid.columns = [
            { field: 'name', caption: 'Name', size: '80%', editable: { type: 'string' } },
            { field: 'active', caption: 'Active', size: '20%', editable: { type: 'checkbox' } }
        ];
        this.grid.onClick = (id) => this.selectCode(id[0]);
        this.grid.onAdd = () => this._importFrom([this._getSerializedMetadatasFile()]);
        this.grid.onDelete = (ids) => this.delete(ids);
        this.grid.onChange = (id, value) => this.change(id, value);
        this.grid.onEdit = (id) => this.editCode(id);
        this.grid.build('CODE-BEHAVIOR-LIST');

        // Add code editor
        this.layout.lockPanel('main');
        this.code = await this.createEditor();
        this.template = await Tools.LoadFile<string>('./assets/templates/code/code-typescript.ts', false);
        this.layout.unlockPanel('main');
        
        // Events
        this.editor.core.onSelectAsset.add(this.onSelectAsset);
        this.editor.core.onSelectObject.add(this.onSelectObject);
        this.editor.core.onResize.add(this.onResize);

        // Metadatas
        this.editor.core.scene.metadata = this.editor.core.scene.metadata || { };
        this.editor.core.scene.metadata.behaviorScripts = this.editor.core.scene.metadata.behaviorScripts || [];

        // Request extension and register asset
        this.extension = <CodeExtension> Extensions.RequestExtension(this.editor.core.scene, 'BehaviorExtension');
        this.editor.assets.addTab(this.extension);
        
        // Select object
        if (this.targetNode || this.editor.core.currentSelectedObject)
            this.selectObject(this.targetNode || this.editor.core.currentSelectedObject);

        // Add new script
        if (this.targetNodeAddScript)
            this.add();

        // Set script
        if (this.targetNodeSetScript)
            this._importFrom([this._getSerializedMetadatasFile()]);

        // Unlock
        this.layout.unlockPanel('left');
    }

    /**
     * On the user shows the plugin
     * @param targetNode: the node being edited
     * @param targetNodeAddScript: if the code editor should prompt a string request
     */
    public onShow (targetNode: any, targetNodeAddScript: boolean, targetNodeSetScript: boolean): void {
        this.onResize();

        // Add new script?
        this.targetNode = targetNode;
        if (targetNode)
            this.selectObject(this.targetNode);
        
        if (targetNodeAddScript)
            this.add();

        // Set script
        if (targetNodeSetScript)
            this._importFrom([this._getSerializedMetadatasFile()]);
    }

    /**
     * On the user clicks on the toolbar
     * @param id the clocked id
     */
    protected async toolbarClicked (id: string): Promise<void> {
        switch (id) {
            // Add
            case 'add-new':
                await this.add();
                break;
            // Import
            case 'import':
                await this._importFrom();
                break;
            default: break;
        }
    }

    /**
     * On the user selects an asset in the editor
     * @param asset the selected asset
     */
    protected selectAsset (asset: BehaviorCode): void {
        this.node = null;
        if (!asset)
            return this.selectObject(null);
        
        if (asset.code) {
            this.layout.hidePanel('left');

            this.datas = {
                node: 'Unknown',
                nodeId: 'Unknown',
                metadatas: [{
                    active: true,
                    codeId: asset.id
                }]
            };

            this.selectCode(0);

            this.layout.unlockPanel('left');
            this.layout.unlockPanel('main');
        }
    }

    /**
     * On the user selects a node in the editor
     * @param node the selected node
     */
    protected selectObject (node: Node | Scene | IParticleSystem): void {
        if (!node) {
            this.layout.lockPanel('left', 'No object selected');
            this.layout.lockPanel('main', 'No code selected');
            return;
        }
        
        this.node = node;
        node['metadata'] = node['metadata'] || { };

        // Add all codes
        this.datas = node['metadata'].behavior;
        if (!this.datas) {
            this.datas = node['metadata'].behavior = {
                node: (node instanceof Scene) ? 'Scene' : node.name,
                nodeId: (node instanceof Scene) ? 'Scene' : node.id,
                metadatas: []
            }
        }

        if (!this.datas.nodeId)
            this.datas.nodeId = (node instanceof Scene) ? 'Scene' : node.id;

        // Clear existing data
        this.data = null;

        this.grid.element.clear();
        this.code.setValue('');

        // Add rows
        const scripts = this.editor.core.scene.metadata.behaviorScripts;

        this.datas.metadatas.forEach((d, index) => {
            const code = scripts.find(s => s.id === d.codeId);

            this.grid.addRecord({
                recid: index,
                name: code.name,
                active: d.active
            });
        });

        this.grid.element.refresh();

        // Select first behavior
        if (this.datas.metadatas.length > 0) {
            this.selectCode(0);
            this.grid.select([0]);
        }

        // Show grid
        this.layout.showPanel('left');

        // Refresh right text
        this._updateToolbarText();

        // Unlock / lock
        this.layout.unlockPanel('left');

        if (this.datas.metadatas.length === 0)
            this.layout.lockPanel('main', 'No code selected');
        else
            this.layout.unlockPanel('main');
    }

    /**
     * On the user selects a code
     * @param index the index of the 
     */
    protected selectCode (index: number): void {
        // Get data
        const scripts = this.editor.core.scene.metadata.behaviorScripts;
        this.data = scripts.find(s => s.id === this.datas.metadatas[index].codeId);

        // Manage extra libs
        for (const k in CodeEditor.CustomLibs) {
            const lib = CodeEditor.CustomLibs[k];
            lib.dispose();
        }

        CodeEditor.CustomLibs = { };
        
        scripts.forEach(s => {
            if (s === this.data)
                return;

            // Check if attached, then don't share declaration
            const datas = this.extension.onSerialize();
            const isAttached = datas.nodes.find(n => n.metadatas.find(m => m.codeId === s.id) !== undefined);

            if (isAttached)
                return;

            const code = `declare module "${s.name}" {${s.code}}`;
            CodeEditor.CustomLibs[s.name] = window['monaco'].languages.typescript.typescriptDefaults.addExtraLib(code, s.name);
        });

        // Update editor
        this.code.setValue(this.data.code);

        // Refresh right text
        this._updateToolbarText();
    }

    /**
     * The user clicks on "Add"
     */
    protected async add (): Promise<void> {
        let ctor = 'scene';

        if (this.node) {
            ctor = Tools.GetConstructorName(this.node).toLowerCase();

            if (this.node instanceof DirectionalLight)
                ctor = "dirlight";
            else if (this.node instanceof HemisphericLight)
                ctor = "hemlight";
            else if (this.node instanceof GroundMesh || this.node instanceof InstancedMesh)
                ctor = 'mesh';
        }

        // Add script
        const name = await Dialog.CreateWithTextInput('Script Name');
        const data: BehaviorCode = {
            name: name,
            id: BabylonTools.RandomId(),
            code: this.template.replace(/{{type}}/g, ctor)
        };

        this.editor.core.scene.metadata.behaviorScripts.push(data);

        if (this.node) {
            // Add metadata to node
            this.datas.metadatas.push({
                active: true,
                codeId: data.id
            });

            this.grid.addRow({
                recid: this.datas.metadatas.length - 1,
                name: data.name,
                active: true
            });

            // Select latest script
            this.grid.select([this.datas.metadatas.length - 1]);
            this.selectCode(this.datas.metadatas.length - 1);
        }
        else {
            this.selectAsset(data);
        }

        // Focus code directly
        this.code.focus();

        // Unlock
        this.layout.unlockPanel('main');

        // Update assets
        this.editor.assets.refresh(this.extension.id);
    }

    /**
     * The user wants to delete a script
     * @param ids: the ids to delete
     */
    protected async delete (ids: number[]): Promise<void> {
        // Remove including links
        let offset = 0;
        ids.forEach(id => {
            this.datas.metadatas.splice(id - offset, 1);
            offset++;
        });

        // Update assets
        this.editor.assets.refresh(this.extension.id);
    }

    /**
     * On the user changes the name of the script
     * @param id: the id of the script
     * @param value: the new value
     */
    protected change (id: number, value: string | boolean): void {
        if (typeof value === 'string') {
            const scripts = this.editor.core.scene.metadata.behaviorScripts;

            const code = scripts.find(s => s.id === this.datas.metadatas[id].codeId);
            code.name = value;

            // Refresh right text and assets
            this._updateToolbarText();
            this.editor.assets.refresh(this.extension.id);
        }
        else
            this.datas.metadatas[id].active = value;
    }

    /**
     * Creates the code editor
     * @param parent: the parent html div
     * @param data: the behavior data if opened into a new window
     * @param caller: the window attached to the editor
     */
    protected async createEditor (parent?: HTMLDivElement, data?: BehaviorCode, caller?: Window): Promise<CodeEditor> {
        caller = caller || window;

        const code = new CodeEditor('typescript');
        await code.build(parent || 'CODE-BEHAVIOR-EDITOR', caller);

        code.onChange = value => {
            // Compile typescript
            clearTimeout(this._timeoutId);
            this._timeoutId = setTimeout(() => {
                if (!data && !this.data)
                    return;
                
                const config = {
                    module: 'cjs',
                    target: 'es5',
                    experimentalDecorators: true,
                };
                
                // Store compiled code
                if (data)
                    data.compiledCode = code.transpileTypeScript(data.code, this.data.name.replace(/ /, ''), config);
                else if (this.data)
                    this.data.compiledCode = this.code.transpileTypeScript(this.data.code, this.data.name.replace(/ /, ''), config);
            }, 500);

            // Update metadata
            if (data) {
                data.code = code.getValue();

                if (data === this.data)
                    this.code.setValue(data.code);
            }
            else if (this.data) {
                this.data.code = this.code.getValue();
            }
        };

        return code;
    }

    /**
     * On edit the code in a new window
     * @param id: the id of the script
     */
    protected async editCode (id: number): Promise<void> {
        const name = 'Code Editor - ' + this.data.name;

        // Create popup
        const popup = Tools.OpenPopup('./code-editor.html#' + name, name, 1280, 800);
        popup.document.title = name;
        popup.addEventListener('editorloaded', async () => {
            const code = await this.createEditor(<HTMLDivElement> popup.document.getElementById('EDITOR-DIV'), this.data, popup);
            code.setValue(this.data.code);
        });
        popup.addEventListener('beforeunload', () => {
            CodeEditor.RemoveExtraLib(popup);
        });
    }

    // Returns the serialized metadatas file
    private _getSerializedMetadatasFile (): File {
        const result = {
            customMetadatas: {
                BehaviorExtension: this.extension.onSerialize()
            }
        };
        
        return Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(result)), 'editorproject');
    }

    // Updates the toolbar text (attached object + edited objec)
    private _updateToolbarText (): void {
        this.toolbar.element.right = `<h2 id="currentNodeNameCode">${this.data ? this.data.name : ''}</h2> Attached to "${this.node instanceof Scene ? 'Scene' : this.node ? this.node.name : ''}"`;
        this.toolbar.element.render();
    }

    // Imports code from
    private async _importFrom(files?: File[]): Promise<void> {
        let importFromFile = false;

        if (!files) {
            importFromFile = true;
            files = await Tools.OpenFileDialog();
        }
        
        for (const f of files) {
            if (Tools.GetFileExtension(f.name) !== 'editorproject')
                continue;

            // Read and parse
            const content = await Tools.ReadFileAsText(f);
            const project = <ProjectRoot> JSON.parse(content);

            if (!project.customMetadatas || !project.customMetadatas.BehaviorExtension)
                continue;

            const metadatas = <BehaviorMetadata> project.customMetadatas.BehaviorExtension;
            const scripts = this.editor.core.scene.metadata.behaviorScripts;

            const picker = new Picker('Import Scripts From...');
            picker.search = true;
            picker.addItems(metadatas.scripts);
            picker.open(items => {
                items.forEach(i => {
                    // Add script
                    const code = importFromFile ? metadatas.scripts[i.id] : scripts[i.id];
                    const id = importFromFile ? BabylonTools.RandomId() : code.id;

                    if (importFromFile) {
                        code.id = id;
                        scripts.push(code);
                    }

                    // Add link to current node
                    this.datas.metadatas.push({
                        active: true,
                        codeId: id
                    });
                });

                this.selectObject(this.node);
            });
        }
    }
}
