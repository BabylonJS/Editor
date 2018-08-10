import {
    Node,
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

    EditorPlugin,

    ProjectRoot
} from 'babylonjs-editor';

import Extensions from '../../extensions/extensions';
import CodeExtension, { BehaviorMetadata, BehaviorCode, BehaviorCodeLink } from '../../extensions/behavior/code';

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

    protected datas: BehaviorMetadata = null;
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
        this.grid.onAdd = () => this.add();
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

        // Select object
        if (this.targetNode || this.editor.core.currentSelectedObject)
            this.selectObject(this.targetNode || this.editor.core.currentSelectedObject);

        // Request extension
        this.extension = <CodeExtension> Extensions.RequestExtension(this.editor.core.scene, 'BehaviorExtension');

        // Add new script
        if (this.targetNodeAddScript)
            this.add();

        // Set script
        if (this.targetNodeSetScript)
            this._importFrom([this._getSerializedMetadatasFile()], true);

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
            this._importFrom([this._getSerializedMetadatasFile()], true);
    }

    /**
     * On the user clicks on the toolbar
     * @param id the clocked id
     */
    protected async toolbarClicked (id: string): Promise<void> {
        switch (id) {
            // Add
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
        if (asset.code) {
            this.layout.hidePanel('left');

            this.datas = {
                node: 'Unknown',
                metadatas: [asset]
            };

            this.selectCode(0);
        }
    }

    /**
     * On the user selects a node in the editor
     * @param node the selected node
     */
    protected selectObject (node: Node | Scene | IParticleSystem): void {
        if (!node)
            return;
        
        this.node = node;
        node['metadata'] = node['metadata'] || { };

        // Add all codes
        this.datas = node['metadata'].behavior;
        if (!this.datas)
            this.datas = node['metadata'].behavior = { node: (node instanceof Scene) ? 'Scene' : node.name, metadatas: [] }

        // Clear existing data
        this.data = null;

        this.grid.element.clear();
        this.code.setValue('');

        // Add rows
        this.datas.metadatas.forEach((d, index) => {
            this.grid.addRecord({
                recid: index,
                name: d.name,
                active: d.active
            });
        });

        this.grid.element.refresh();

        let currentNodeName = "";

        // Select first behavior
        if (this.datas.metadatas.length > 0) {
            this.selectCode(0);
            this.grid.select([0]);
            currentNodeName = this.datas.metadatas[0].name;
        }

        // Show grid
        this.layout.showPanel('left');

        // Refresh right text
        this._updateToolbarText();
    }

    /**
     * On the user selects a code
     * @param index the index of the 
     */
    protected selectCode (index: number): void {
        this.data = this.datas.metadatas[index];

        // Refresh right text
        this._updateToolbarText();

        // Link?
        if (this.data.link) {
            const link = this.data.link;
            const node = link.node === 'Scene' ? this.editor.core.scene :
                         this.editor.core.scene.getNodeByName(link.node) ||
                         this.editor.core.scene.getParticleSystemByID(link.node);

            const metadatas = <BehaviorCode[]> node['metadata'].behavior.metadatas;
            this.data = metadatas.find(m => m.name === link.metadata);
        }

        this.code.setValue(this.data.code);
    }

    /**
     * The user clicks on "Add"
     */
    protected async add (): Promise<void> {
        let ctor = Tools.GetConstructorName(this.node).toLowerCase();
        if (this.node instanceof DirectionalLight)
            ctor = "dirlight";
        else if (this.node instanceof HemisphericLight)
            ctor = "hemlight";

        const name = await Dialog.CreateWithTextInput('Script Name');

        const data: BehaviorCode = {
            name: name,
            active: true,
            code: this.template.replace(/{{type}}/g, ctor)
        };
        this.datas.metadatas.push(data);

        this.grid.addRow({
            recid: this.datas.metadatas.length - 1,
            name: data.name,
            active: true
        });

        // Select latest script
        this.grid.select([this.datas.metadatas.length - 1]);
        this.selectCode(this.datas.metadatas.length - 1);
        this.code.focus();
    }

    /**
     * The user wants to delete a script
     * @param ids: the ids to delete
     */
    protected async delete (ids: number[]): Promise<void> {
        // Check links
        for (let i = 0; i < ids.length; i++) {
            const code = this.datas.metadatas[i];
            const result = this._manageLinks(code.name, false);

            if (result.length > 0) {
                const answer = await Dialog.Create('Some links found', 'Some links to the scripts you are deleting were found. If you remove these scripts, all links will be deleted. Are you sure?');
                if (answer === 'No') {
                    this.selectObject(this.node);
                    return;
                }
                
                break;
            }
        }

        // Remove including links
        let offset = 0;
        ids.forEach(id => {
            const code = this.datas.metadatas[id - offset];
            if (!code.link) {
                // No a link, remove all other references
                this._manageLinks(code.name, true);
            }

            this.datas.metadatas.splice(id - offset, 1);
            offset++;
        });
    }

    /**
     * On the user changes the name of the script
     * @param id: the id of the script
     * @param value: the new value
     */
    protected change (id: number, value: string | boolean): void {
        if (typeof value === 'string') {
            !this.datas.metadatas[id].link && (this.datas.metadatas[id].name = value);

            // Refresh right text
            this._updateToolbarText();
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
        const code = new CodeEditor('typescript');
        await code.build(parent || 'CODE-BEHAVIOR-EDITOR', caller);

        code.onChange = value => {
            // Compile typescript
            clearTimeout(this._timeoutId);
            this._timeoutId = setTimeout(() => {
                if (data)
                    data.compiledCode = code.transpileTypeScript(data.code, this.data.name.replace(/ /, ''));
                else if (this.data)
                    this.data.compiledCode = this.code.transpileTypeScript(this.data.code, this.data.name.replace(/ /, ''));
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
        const name = 'Code Editor - ' + this.datas.metadatas[id].name;

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

    // Manages the links
    private _manageLinks (metadata: string, remove: boolean): any {
        const result: BehaviorCode[] = [];
        const removeLink = (link: BehaviorCodeLink, objects: (Scene | Node | IParticleSystem)[], remove: boolean) => {
            objects.forEach(o => {
                if (!o['metadata'] || !o['metadata'].behavior)
                    return;
                
                const behavior = <BehaviorMetadata> o['metadata'].behavior;
                
                for (let i = 0; i < behavior.metadatas.length; i++) {
                    const code = behavior.metadatas[i];
                    if (code.link && code.link.node === link.node && code.link.metadata === link.metadata) {
                        if (remove) {
                            behavior.metadatas.splice(i, 1);
                            i--;
                        }
                        else {
                            result.push(code);
                        }
                    }
                }
            });
        };

        removeLink({ node: this.datas.node, metadata: metadata }, this.editor.core.scene.meshes, remove);
        removeLink({ node: this.datas.node, metadata: metadata }, this.editor.core.scene.lights, remove);
        removeLink({ node: this.datas.node, metadata: metadata }, this.editor.core.scene.cameras, remove);
        removeLink({ node: this.datas.node, metadata: metadata }, this.editor.core.scene.particleSystems, remove);
        removeLink({ node: this.datas.node, metadata: metadata }, [this.editor.core.scene], remove);

        return result;
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
        this.toolbar.element.right = `<h2 id="currentNodeNameCode">${this.data ? this.data.name : ''}</h2> Attached to "${this.node instanceof Scene ? 'Scene' : this.node.name}"`;
        this.toolbar.element.render();
    }

    // Imports code from
    private async _importFrom(files?: File[], importAsLink?: boolean): Promise<void> {
        if (!files)
            files = await Tools.OpenFileDialog();
        
        for (const f of files) {
            if (Tools.GetFileExtension(f.name) !== 'editorproject')
                continue;

            // Read and parse
            const content = await Tools.ReadFileAsText(f);
            const project = <ProjectRoot> JSON.parse(content);

            if (!project.customMetadatas || !project.customMetadatas.BehaviorExtension)
                continue;

            const codes = <BehaviorMetadata[]> project.customMetadatas.BehaviorExtension;

            // Create window
            const window = new Popin('ImportBehaviorCode');
            window.title = 'Import Custom Script...';
            window.body = `
                <input id="IMPORT-BEHAVIOR-CODE-SEARCH" type="text" placeHolder="Search" style="width: 100%; height: 40px;" />
                <div id="IMPORT-BEHAVIOR-CODE" style="width: 100%; height: 100%; overflow: auto;"></div>
            `;
            window.buttons = ['Ok', 'Cancel'];
            window.open();

            // Create tree and fill
            const tree = new Tree('ImportBehaviorTree');
            tree.build('IMPORT-BEHAVIOR-CODE');

            const nodeName = this.node instanceof Scene ? 'Scene' :
                             this.node instanceof Node ? this.node.name :
                             this.node.id;

            codes.forEach(c => {
                if (c.metadatas.length === 0 || (importAsLink && c.node === nodeName))
                    return;
                
                // Check instance
                if (c.node === 'Scene' && !(this.node instanceof Scene))
                    return;

                const node = this.editor.core.scene.getNodeByName(c.node) || this.editor.core.scene.getParticleSystemByID(c.node);
                if (node && Tools.GetConstructorName(node) !== Tools.GetConstructorName(this.node))
                    return;
                
                // Add
                tree.add({ data: c, id: c.node, text: c.node, img: 'icon-mesh' });

                c.metadatas.forEach(m => {
                    if (m.link)
                        return;
                    
                    tree.add({ data: m, id: c.node + m.name, text: m.name, img: 'icon-behavior-editor' }, c.node)
                });
            });

            // Search
            const search = $('#IMPORT-BEHAVIOR-CODE-SEARCH');
            search.keyup(() => {
                tree.search(<string> search.val());
            });

            setTimeout(() => search.focus(), 1);

            // On click on 'Ok', import script(s) and update grid
            window.onButtonClick = (id) => {
                const selected = tree.getSelected();

                if (!selected || id === 'Cancel')
                    return window.close();

                if (importAsLink && selected.data.node)
                    return;
                
                const metadatas = selected.data.node ? selected.data.metadatas : [selected.data];
                const parent = selected.parent ? tree.get(selected.parent) : null;

                metadatas.forEach(m => {
                    this.datas.metadatas.push({
                        active: m.active,
                        code: importAsLink ? undefined : m.code,
                        name: m.name,
                        link: importAsLink ? { node: parent.data.node, metadata: m.name } : undefined
                    });
                });

                window.close();

                this.selectObject(this.node);
            };

            window.onClose = () => tree.destroy();
        }
    }
}
