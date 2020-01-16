import { Tools as BabylonTools, SceneSerializer, FilesInputStore, ShaderMaterial } from 'babylonjs';

import ProjectExporter from '../project/project-exporter';

import Tools from '../tools/tools';
import Editor from '../editor';

export default class SceneExporter {
    // Public members
    public static ProjectExportFormat: 'babylon' | 'glb' | 'gltf' = 'babylon';

    // Private members
    private static _LastRandomId: string = BabylonTools.RandomId();

    /**
     * Creates a new file
     * @param editor: the editor instance
     */
    public static CreateFiles (editor: Editor, format: 'babylon' | 'glb' | 'gltf' = 'babylon', onlyExtensions: boolean = false): void {
        // Delete old files
        editor.sceneFile && delete FilesInputStore.FilesToLoad[editor.sceneFile.name];
        editor.projectFile && delete FilesInputStore.FilesToLoad[editor.projectFile.name];

        this._LastRandomId = BabylonTools.RandomId();

        // Do not export shader materials
        editor.core.scene.materials.forEach(m => m instanceof ShaderMaterial && (m.doNotSerialize = true));

        // Serialize
        editor.assets.prefabs.setSerializable(true);
        if (editor.core.scene.soundTracks && editor.core.scene.soundTracks.length === 0)
            editor.core.scene.soundTracks.push(editor.core.scene.mainSoundTrack);
        const serializedScene = SceneSerializer.Serialize(editor.core.scene);
        if (editor.core.scene.soundTracks && editor.core.scene.soundTracks.length === 1)
            editor.core.scene.soundTracks.pop();
        editor.assets.prefabs.setSerializable(false);

        if (editor.playCamera)
            serializedScene.activeCameraID = editor.playCamera.id;

        // Metadatas
        this._ClearMetadatas(serializedScene.meshes);
        this._ClearMetadatas(serializedScene.lights);
        this._ClearMetadatas(serializedScene.cameras);
        this._ClearMetadatas(serializedScene.transformNodes);
        this._ClearMetadatas(serializedScene.particleSystems);
        this._ClearMetadatas(serializedScene.materials);
        this._ClearMetadatas(serializedScene.multiMaterials);
        this._ClearMetadatas(serializedScene.skeletons);
        this._ClearMetadatas(serializedScene.sounds);
        this._ClearMetadatas([serializedScene]);

        // Scene "File"
        if (format === 'babylon') {
            editor.sceneFile = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serializedScene)), 'scene' + this._LastRandomId + '.babylon');
            FilesInputStore.FilesToLoad[editor.sceneFile.name] = editor.sceneFile;
        }

        // Gui
        editor.guiFiles = [];
        editor.core.uiTextures.forEach(ut => {
            const serializedGui = ut.serialize();
            editor.guiFiles.push(Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serializedGui)), ut.name + '.gui'));
        });

        // Project
        const name = 'scene' + this._LastRandomId + '.editorproject';
        const project = ProjectExporter.Export(editor, onlyExtensions);
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
            if (!m)
                return;
            
            this._ClearMetadata(m);

            // Second level (typically for textures)
            for (const k in m) {
                const v = m[k];
                if (!v)
                    continue;

                this._ClearMetadata(v);
            }
        });
    }

    // Clears the metadata object
    private static _ClearMetadata (obj: any): void {
        if (obj.metadata) {
            // Clear original saved object
            delete obj.metadata.original;

            if (obj.metadata.baseConfiguration)
                obj.pickable = obj.metadata.baseConfiguration.isPickable;
            
            if (obj.metadata.customMetadatas)
                obj.metadata = obj.metadata.customMetadatas;
        }
        else {
            delete obj.metadata;
        }
    }
}
