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
        let layoutRegMatch = plugin.name.replace(/\W+/g, '');
        let layoutName = layoutRegMatch + "Layout";

            Object.entries(w2ui).forEach((value) => {
                if (value[0].includes(layoutRegMatch)){
                    w2ui[value[0]].destroy();
                }  
            })  
    
            try {
                this.editor.layoutManager.getComponent(plugin.name)
            }
    
            catch(err){
                this.editor.layoutManager.registerComponent( plugin.name, function( container ){
                    container.getElement().html( '<div id="' + layoutName + '" />');
                });
            }
            
            this.editor.layoutManager.root.getItemsById('SceneRow')[0].addChild(
                {
                    type: 'component',
                    componentName: plugin.name
                }
             );
    
            
            this.NewPluginLayout = null;
            this.NewPluginLayout = new Layout(layoutName);
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
            this.NewPluginLayout.build(layoutName);
            
           
    
            $('#' + layoutName).append(plugin.divElement);

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