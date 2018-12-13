import { Node, ParticleSystem, Observer } from 'babylonjs';
import Editor, { EditorPlugin, CodeEditor } from 'babylonjs-editor';

import Extensions from '../../extensions/extensions';
import '../../extensions/metadata/metadatas';

export default class MetadataEditor extends EditorPlugin {
    // Public members
    public code: CodeEditor = null;

    // Protected members
    protected selectedNode: Node | ParticleSystem = null;
    protected selectedObjectObserver: Observer<any> = null;

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

        // Events
        this.editor.core.onSelectObject.remove(this.selectedObjectObserver);

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Create json editor
        this.code = new CodeEditor('json', '{\n\n}');
        this.code.onChange = (value) => {
            if (!this.selectedNode)
                return;
            
            try {
                const data = JSON.parse(value);
                this.selectedNode['metadata'].customMetadatas = data;
            } catch (e) { /* Catch silently */ }
        };
        await this.code.build(this.divElement);

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
