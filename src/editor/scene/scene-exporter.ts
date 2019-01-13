import { Tools as BabylonTools, SceneSerializer, FilesInputStore, ShaderMaterial } from 'babylonjs';

import ProjectExporter from '../project/project-exporter';

import Tools from '../tools/tools';
import Editor from '../editor';

const randomId = BabylonTools.RandomId();

export default class SceneExporter {
    // Public members
    public static ProjectPath: string = null;
    public static ProjectExportFormat: 'babylon' | 'glb' | 'gltf' = 'babylon';

    /**
     * Creates a new file
     * @param editor: the editor instance
     */
    public static CreateFiles (editor: Editor, format: 'babylon' | 'glb' | 'gltf' = 'babylon'): void {
        // Do not export shader materials
        editor.core.scene.materials.forEach(m => m instanceof ShaderMaterial && (m.doNotSerialize = true));

        // Serialize
        editor.assets.prefabs.setSerializable(true);
        const serializedScene = SceneSerializer.Serialize(editor.core.scene);
        editor.assets.prefabs.setSerializable(false);

        if (editor.playCamera)
            serializedScene.activeCameraID = editor.playCamera.id;

        // Metadatas
        this._ClearMetadatas(serializedScene.meshes);
        this._ClearMetadatas(serializedScene.lights);
        this._ClearMetadatas(serializedScene.cameras);
        this._ClearMetadatas(serializedScene.particleSystems);
        this._ClearMetadatas(serializedScene.materials);
        this._ClearMetadatas(serializedScene.skeletons);
        this._ClearMetadatas(serializedScene.sounds);
        this._ClearMetadatas([serializedScene]);

        // Scene "File"
        if (format === 'babylon') {
            editor.sceneFile = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serializedScene)), 'scene' + randomId + '.babylon');
            FilesInputStore.FilesToLoad[editor.sceneFile.name] = editor.sceneFile;
        }

        // Gui
        editor.guiFiles = [];
        editor.core.uiTextures.forEach(ut => {
            const serializedGui = ut.serialize();
            editor.guiFiles.push(Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serializedGui)), ut.name + '.gui'));
        });

        // Project
        const name = 'scene' + randomId + '.editorproject';
        const project = ProjectExporter.Export(editor);
        editor.projectFile = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(project)), name);
        FilesInputStore.FilesToLoad[editor.projectFile.name] = editor.projectFile;
    }

    /**
     * Creates the babylon scene and a download link for the babylon file
     * @param editor the editor reference
     */
    public static DownloadBabylonFile (editor: Editor): void {
        this.CreateFiles(editor);
        BabylonTools.Download(editor.sceneFile, editor.sceneFile.name);
    }

    // Clears the metadatas from the editor and replace by custom metadatas
    // if exists
    private static _ClearMetadatas (objects: any[]): void {
        if (!objects)
            return;
        
        // For each object, replace by custom metadata if exists
        objects.forEach(m => {
            if (m.metadata) {
                if (m.metadata.baseConfiguration)
                    m.pickable = m.metadata.baseConfiguration.isPickable;
                
                if (m.metadata.customMetadatas)
                    m.metadata = m.metadata.customMetadatas;
            }
            else {
                delete m.metadata;
            }
        });
    }
}
