import Editor from '../../editor/editor';
import { EditorPlugin } from '../../editor/typings/plugin';

export default class AnimationEditor extends EditorPlugin {
    // Public members

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor (public editor: Editor) {
        super('Animation Editor');
    }

    /**
     * Creates the plugin
     */
    public async create (): Promise<void> {
        debugger;
        
    }
}
