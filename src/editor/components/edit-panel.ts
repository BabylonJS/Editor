import Editor from '../editor';
import { IEditorPlugin } from '../typings/plugin';
import Layout from '../gui/layout';

export default class EditorEditPanel {
    // Public members
    public NewPluginLayout : Layout;

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
                this.editor.layoutManager.element.getComponent(plugin.name)
            }
    
            catch(err){
                this.editor.layoutManager.addComponent( plugin.name,
                                                        '<div id="' + layoutName + '" />'
                );
            }
            
            this.editor.layoutManager.getFirstItemById("SceneRow").addChild(
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
    }
}