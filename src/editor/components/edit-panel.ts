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
            onClose: async () => {
                await this.editor.removePlugin(plugin);

                const first = Object.keys(this.editor.plugins)[0];
                await this.showPlugin(this.editor.plugins[first]);
            },
            onClick: (event) => this._onChangeTab(plugin, false)
        });

        $('#EDIT-PANEL-TOOLS').append(plugin.divElement);
        this.editor.layout.element.sizeTo('preview', window.innerHeight / 2);

        // Activate added plugin
        this._onChangeTab(plugin, true);
    }

    /**
     * Shows the given plugin
     * @param plugin: the plugin to show
     */
    public async showPlugin (plugin: IEditorPlugin): Promise<void> {
        if (!plugin)
            return;
        
        if (plugin.onShow)
            await plugin.onShow();

        this.panel.tabs.select(plugin.name);
        this._onChangeTab(plugin, false);
    }

    // On the tab changed
    private async _onChangeTab (plugin: IEditorPlugin, firstShow: boolean): Promise<void> {
        if (this.currentDiv)
            $(this.currentDiv).hide();

        this.currentDiv = plugin.divElement;
        $(this.currentDiv).show();

        if (!firstShow && plugin.onShow)
            await plugin.onShow();
    }
}