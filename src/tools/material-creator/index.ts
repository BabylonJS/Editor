import Editor, {
    IDisposable, Tools,
    Layout, Toolbar,
    EditorPlugin
} from 'babylonjs-editor';

import Extensions from '../../extensions/extensions';

// TODO: remove this line and find a way to
// import * as monaco from 'monaco-editor';
export interface MonacoDisposable extends IDisposable {
    [index: string]: any;
}
declare var monaco: MonacoDisposable;

export default class MaterialCreator extends EditorPlugin {
    // Public members
    public layout: Layout = null;

    // Protected members
    protected code: MonacoDisposable = null;

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
        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Create layout
        this.layout = new Layout('MaterialCreatorCode');
        this.layout.panels = [
            { type: 'left', content: '<div id="MATERIAL-CREATOR-LIST" style="width: 100%; height: 100%;"></div>', size: 300, overflow: 'auto', resizable: true },
            { type: 'main', content: '<div id="MATERIAL-CREATOR-EDITOR" style="width: 100%; height: 100%;"></div>', resizable: true }
        ];
        this.layout.build(this.divElement.id);

        // Add code editor
        await this.createEditor();
    }

    /**
     * Creates the code editor
     */
    protected async createEditor (): Promise<void> {
        this.code = monaco.editor.create ($('#MATERIAL-CREATOR-EDITOR')[0], {
            value: '// Some code',
            language: "javascript",
            automaticLayout: true,
            selectionHighlight: true
        });
    }
}
