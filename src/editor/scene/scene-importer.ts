import {
    Tags,
    SceneLoader,
    FilesInput,
    MultiMaterial,
    Tools as BabylonTools,
} from 'babylonjs';

import Editor from '../editor';

import Tools from '../tools/tools';

import Window from '../gui/window';
import Picker from '../gui/picker';

import SceneFactory from './scene-factory';

export default class SceneImporter {
    /**
     * Import meshes from
     * @param editor the editor reference
     */
    public static ImportMeshesFromFile (editor: Editor): void {
        Tools.OpenFileDialog(async files => {
            let babylonFile: File = null;

            // Configure files
            for (const f of files) {
                const name = f.name.toLowerCase();

                if (Tools.GetFileExtension(f.name) === 'babylon')
                    babylonFile = f;
                
                if (!FilesInput.FilesToLoad[name])
                    FilesInput.FilesToLoad[name] = f;
            };

            // Read file
            const json = await Tools.ReadFileAsText(babylonFile);
            const data = JSON.parse(json);

            // Create picker
            const picker = new Picker('ImportMeshesFrom');
            picker.addItems(data.meshes);
            picker.open(items => {
                // Import meshes
                const names = items.map(i => i.name);
                SceneLoader.ImportMesh(names, 'file:', babylonFile.name, editor.core.scene, (meshes) => {
                    // Configure
                    meshes.forEach(m => {
                        // Tags
                        Tags.AddTagsTo(m, 'added');

                        if (m.material) {
                            Tags.AddTagsTo(m.material, 'added');

                            if (m.material instanceof MultiMaterial)
                                m.material.subMaterials.forEach(m => Tags.AddTagsTo(m, 'added'));
                        }

                        // Id and name
                        const id = m.id;
                        const meshes = editor.core.scene.meshes.filter(m => m.id === id);
                        if (meshes.length > 1)
                            m.id += BabylonTools.RandomId();

                        // Misc.
                        m.isPickable = true;

                        // Add to graph
                        SceneFactory.AddToGraph(editor, m);
                    });
                }, null, (scene, message) => {
                    Window.CreateAlert(message, 'Error');
                });
            });
        });
    }
}
