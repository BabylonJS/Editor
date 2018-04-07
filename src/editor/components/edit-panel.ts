import Editor from '../editor';
import { IEditorPlugin } from '../typings/plugin';
import Layout from '../gui/layout';

export default class EditorEditPanel {
    // Public members
    public panel: W2UI.W2Panel = this.editor.layout.getPanelFromType('preview');
    public newPluginLayout : Layout;

    // Protected members
    protected currentPlugin: IEditorPlugin = null;

    // Used to identify layout
    protected layoutRegMatch : string;
    protected layoutName : string;

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
            this.layoutRegMatch = plugin.name.replace(/\W+/g, '');
            this.layoutName = this.layoutRegMatch + "Layout";
            
                this.editor.listObjectEntries(w2ui).forEach((value) => {
                    if (value[0].includes(this.layoutRegMatch)){
                        w2ui[value[0]].destroy();
                    }  
                })  
        
                try {
                    this.editor.layoutManager.element.getComponent(plugin.name)
                }
        
                catch(err){
                    this.editor.layoutManager.addComponent( plugin.name,
                                                            '<div id="' + this.layoutName + '" />'
                    );
                }
                
                this.editor.layoutManager.getFirstItemById("SceneRow").addChild(
                    {
                        type: 'component',
                        componentName: plugin.name
                    }
                 );
                
                this.newPluginLayout = null;
                this.newPluginLayout = new Layout(this.layoutName);
                this.newPluginLayout.panels = [
                    { type: 'right',
                      hidden: false,
                      size: 310,
                      style: "height: 100%",
                      overflow: "unset",
                      content: '<div style="width: 100%; height: 100%;"></div>',
                      resizable: false,
                      tabs: <any>[] },
                ];
                this.newPluginLayout.build(this.layoutName);
                
                $('#' + this.layoutName).append(plugin.divElement);
        
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

    }

}