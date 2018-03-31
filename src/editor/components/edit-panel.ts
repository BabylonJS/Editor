import Editor from '../editor';
import { IEditorPlugin } from '../typings/plugin';
import Layout from '../gui/layout';

export default class EditorEditPanel {
    // Public members
    public panel: W2UI.W2Panel = this.editor.layout.getPanelFromType('preview');

    public NewPluginLayout : Layout;


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

        this.editor.layoutManager.registerComponent( plugin.name, function( container, state ){
            container.getElement().html( '<div id="' + plugin.name.replace(/\s+/g, '') + '-Layout" />');
        });
        
        this.editor.layoutManager.root.getItemsById('SceneRow')[0].addChild(
            {
                type: 'component',
                componentName: plugin.name,
                componentState: { text: "a" }
            }
         );

        this.NewPluginLayout = new Layout(plugin.name.replace(/\s+/g, '') + '-Layout');
        this.NewPluginLayout.panels = [
            { type: 'right',
              hidden: false,
              size: 310,
              style: "height: 100%",
              overflow: "unset",
              content: '<div style="width: 100%; height: 100%;"></div>',
              resizable: false,
              tabs: <any>[] },
        ];
        this.NewPluginLayout.build(plugin.name.replace(/\s+/g, '') + '-Layout');

        $('#'+plugin.name.replace(/\s+/g, '') + '-Layout').append(plugin.divElement);
        //this.editor.layout.element.sizeTo('preview', window.innerHeight / 2);

        // Activate added plugin
        //this._onChangeTab(plugin, true);
    }

    /**
     * Shows the given plugin
     * @param plugin: the plugin to show
     */
    public async showPlugin (plugin: IEditorPlugin, ...params: any[]): Promise<void> {
        if (!plugin)
            return;
        
        if (plugin.onShow)
            await plugin.onShow.apply(plugin, params);

        //this.panel.tabs.select(plugin.name);
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