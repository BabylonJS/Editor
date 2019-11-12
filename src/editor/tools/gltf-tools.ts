import { FilesInputStore, Tags, BaseTexture } from 'babylonjs';

import Editor from '../editor';
import Tools from './tools';
import GraphicsTools from './graphics-tools';

export default class GLTFTools {
    /**
     * Configures the current scene context. Typically retrieves the gltf textures to be stored.
     * @param editor the editor reference.
     */
    public static async ConfigureFromScene (editor: Editor): Promise<void> {
        // Textures
        const texturesPromises: Promise<void>[] = [];
        for (const tex of editor.core.scene.textures) {
            texturesPromises.push(this._ConfigureTexture(tex));
        }

        await Promise.all(texturesPromises);
    }

    // COnfigures the given texture to retrieve its pixels and create a new file (blob)
    private static async _ConfigureTexture (tex: BaseTexture): Promise<void> {
        if (!tex.metadata || !tex.metadata.gltf || tex.metadata.gltfTextureDone)
            return;

        // Get blob
        const blob = await GraphicsTools.TextureToFile(tex);
        if (!blob)
            return;
        
        blob['name'] = tex.name + Tools.GetExtensionFromMimeType(tex['_mimeType']);
        tex.name = blob['name'];
        tex.metadata.gltfTextureDone = true;
        Tags.AddTagsTo(blob, 'doNotExport');
        FilesInputStore.FilesToLoad[blob['name'].toLowerCase()] = <File> blob;
    }
}
