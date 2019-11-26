import Editor from '../editor';
import Tools from './tools';

export default class ObjTools {
    /**
     * Configures the current scene context. Typically retrieves the obj real textures names.
     * @param editor the editor reference.
     */
    public static ConfigureFromScene (editor: Editor): void {
        // Textures
        editor.core.scene.textures.forEach(t => t.name = t.name.replace(/file:/g, ''));
    }
}
