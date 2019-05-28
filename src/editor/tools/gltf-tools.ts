import {
    Engine, FilesInputStore, Tags,
    Tools as BabylonTools,
    BaseTexture
} from 'babylonjs';

import Editor from '../editor';
import Tools from './tools';
import GraphicsTools from './graphics-tools';

export default class GLTFTools {
    /**
     * Configures the current scene context. Typically retrieves the gltf textures to be stored
     * @param editor the editor reference
     * @param file the file scene being loaded by the gltf loader
     */
    public static async ConfigureFromScene (editor: Editor, file: File): Promise<void> {
        const ext = Tools.GetFileExtension(file.name).toLowerCase();
        if (ext !== 'gltf' && ext !== 'glb')
            return;

        // Textures
        const texturesPromises: Promise<void>[] = [];
        for (const tex of editor.core.scene.textures) {
            texturesPromises.push(this._ConfigureTexture(tex));
        }

        await Promise.all(texturesPromises);
    }

    // COnfigures the given texture to retrieve its pixels and create a new file (blob)
    private static async _ConfigureTexture (tex: BaseTexture): Promise<void> {
        if (!tex.metadata || !tex.metadata.gltf)
            return;

        // Configure now
        tex['url'] = tex.name = tex.name + '.png';

        // Get blob
        const blob = await GraphicsTools.TextureToFile(tex);
        blob['name'] = tex.name;
        Tags.AddTagsTo(blob, 'doNotExport');
        FilesInputStore.FilesToLoad[tex.name.toLowerCase()] = <File> blob;
    }
}
