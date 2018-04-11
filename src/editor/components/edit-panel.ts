import Editor from '../editor';
import { IEditorPlugin } from '../typings/plugin';

export default class EditorEditPanel {
    // Static members
    public static PluginCount: number = 0;

    // Protected members
    protected currentPlugin: IEditorPlugin = null;

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
        // Add component
        const title = plugin.name;
        plugin.name += EditorEditPanel.PluginCount++;

        this.editor.resizableLayout.addPanelToStack('edit-panel', {
            type: 'component',
            title: title,
            componentName: plugin.name,
            html: plugin.divElement,
            onClose: async () => {
                await this.editor.removePlugin(plugin);

                const first = Object.keys(this.editor.plugins)[0];

                if (first)
                    await this.showPlugin(this.editor.plugins[first]);
                else 
                    this.editor.resizableLayout.setPanelSize('edit-panel', 10);
            },
            onClick: () => this._onChangeTab(plugin, false)
        });

        this.editor.resizableLayout.setPanelSize('edit-panel', 50);
    }

    /**
     * Shows the given plugin
     * @param plugin: the plugin to show
     */
    public async showPlugin (plugin: IEditorPlugin, ...params: any[]): Promise<void> {
        if (!plugin)
            return;
        
        // Show tab
        this.editor.resizableLayout.showPanelTab(plugin.name);

        await this._onChangeTab.apply(this, [plugin, false].concat(params));
    }

    // On the tab changed
    private async _onChangeTab (plugin: IEditorPlugin, firstShow: boolean, ...params: any[]): Promise<void> {
        if (this.currentPlugin && this.currentPlugin.onHide)
            await this.currentPlugin.onHide();

        this.currentPlugin = plugin;

        if (!firstShow && plugin.onShow)
            await plugin.onShow.apply(plugin, params);
    }
}