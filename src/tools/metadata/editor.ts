import { Node, ParticleSystem, Observer } from 'babylonjs';
import Editor, { EditorPlugin, Layout, CodeEditor, Toolbar } from 'babylonjs-editor';

import Extensions from '../../extensions/extensions';
import '../../extensions/metadata/metadatas';

export default class MetadataEditor extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public code: CodeEditor = null;
    public toolbar: Toolbar = null;

    // Protected members
    protected selectedNode: Node | ParticleSystem = null;
    protected selectedObjectObserver: Observer<any> = null;

    // Private members
    private _checkTimeout: number = -1;

    /**
     * Constructor
     * @param editor: the editor reference 
     */
    constructor(public editor: Editor) {
        super('Metadata');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        // Code
        this.code.dispose();
        this.toolbar.element.destroy();
        this.layout.element.destroy();

        // Events
        this.editor.core.onSelectObject.remove(this.selectedObjectObserver);

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Layout
        this.layout = new Layout(this.divElement.id);
        this.layout.panels = [
            { type: 'top', size: 30, resizable: false, content: '<div id="METADATA-EDITOR-TOOLBAR" style="width: 100%; height: 100%;"></div>' },
            { type: 'main', content: '<div id="METADATA-EDITOR-EDITOR" style="width: 100%; height: 100%;"></div>' }
        ]
        this.layout.build(this.divElement.id);

        // Toolbar
        this.toolbar = new Toolbar('METADATA-EDITOR-TOOLBAR');
        this.toolbar.build('METADATA-EDITOR-TOOLBAR');

        // Create json editor
        this.code = new CodeEditor('json', '{\n\n}');
        this.code.onChange = (value) => {
            if (!this.selectedNode)
                return;

            // Clear JSON checker timeout
            if (this._checkTimeout !== -1) {
                clearTimeout(this._checkTimeout);
                this._checkTimeout = -1;
            }
            
            try {
                // Parse JSON text value
                const data = JSON.parse(value);
                this.selectedNode['metadata'].customMetadatas = data;
                this.toolbar.notifyMessage('');
            } catch (e) {
                //  Check JSON validation after 1s
                this._checkTimeout = <any> setTimeout(() => {
                    this.toolbar.notifyMessage(`<h4 style="color: rgb(255, 0, 0);">${e.message}</h4>Error`);
                    this._checkTimeout = -1;
                }, 1000);
            }
        };
        await this.code.build('METADATA-EDITOR-EDITOR');

        // Events
        this.selectedObjectObserver = this.editor.core.onSelectObject.add(data => this.objectSelected(data));

        // Extension
        Extensions.RequestExtension(this.editor.core.scene, 'CustomMetadatasExtension');
    }

    /**
     * On the user selected a node
     * @param node the selected node
     */
    protected objectSelected (node: Node | ParticleSystem): void {
        if (this.selectedNode === node)
            return;
        
        if (!(node instanceof Node) && !(node instanceof ParticleSystem))
            return;
        
        // Setup metadatas
        node['metadata'] = node['metadata'] || { };
        if (!node['metadata'].customMetadatas)
            node['metadata'].customMetadatas = { };

        // Setup code editor
        this.selectedNode = node;
        this.code.setValue(JSON.stringify(node['metadata'].customMetadatas, null, '\t'));
    }
}
