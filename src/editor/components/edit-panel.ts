import Editor from '../editor';
import { IEditorPlugin } from '../typings/plugin';

export default class EditorEditPanel {
    // Public members
    public panel: W2UI.W2Panel = this.editor.layout.getPanelFromType('preview');

    // Protected members
    protected currentDiv: HTMLDivElement = null;

    /**
     * Constructor
     * @param editor: the editor reference
     */
    constructor (protected editor: Editor)
    { }

    /**
     * Adds the given plugin to the 
     * @param plugin the plugin to add
     */
    public addPlugin (plugin: IEditorPlugin): void {
        this.panel.tabs.add({
            id: plugin.name,
            caption: plugin.name,
            closable: true,
            onClose: () => plugin.close(),
            onClick: (event) => this._onChangeTab(plugin)
        });

        $('#EDIT-PANEL-TOOLS').append(plugin.divElement);
        this.editor.layout.element.sizeTo('preview', window.innerHeight / 2);

        // Activate added plugin
        this._onChangeTab(plugin);
    }

    // On the tab changed
    private _onChangeTab (plugin: IEditorPlugin): void {
        if (this.currentDiv)
            $(this.currentDiv).hide();

        this.currentDiv = plugin.divElement;
        $(this.currentDiv).show();
    }
}