import Editor, { Tools, EditorPlugin } from 'babylonjs-editor';

export default class Notes extends EditorPlugin {
    // Public members
    public textArea: HTMLTextAreaElement = null;

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Notes');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Metadatas
        this.editor.core.scene.metadata = this.editor.core.scene.metadata || { };
        const metadatas = this.editor.core.scene.metadata;

        if (!metadatas.notes)
            metadatas.notes = '';
        
        // Area
        this.textArea = Tools.CreateElement('textarea', 'NOTES-TEXT-AREA', {
            'width': '100%',
            'height': '100%',
            'resize': 'none'
        });
        this.textArea.textContent = metadatas.notes;
        this.textArea.addEventListener('keyup', () => metadatas.notes = this.textArea.value);
        this.divElement.appendChild(this.textArea);
    }
}
