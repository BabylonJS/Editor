import Editor from '../editor';
import Tools from './tools';

export default class ObjTools {
    /**
     * Configures the current scene context. Typically retrieves the obj real textures names.
     * @param editor the editor reference
     * @param file the file scene being loaded by the obj loader
     */
    public static ConfigureFromScene (editor: Editor, file: File): void {
        const ext = Tools.GetFileExtension(file.name).toLowerCase();
        if (ext !== 'obj')
            return;

        // Textures
        editor.core.scene.textures.forEach(t => t.name = t.name.replace(/file:/g, ''));
    }
}
