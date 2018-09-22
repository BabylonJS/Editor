import { FilesInput, Tools as BabylonTools, SceneSerializer } from 'babylonjs';

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
        // Scene
        editor.assets.prefabs.setSerializable(true);
        const serializedScene = SceneSerializer.Serialize(editor.core.scene);
        editor.assets.prefabs.setSerializable(false);

        if (editor.playCamera)
            serializedScene.activeCameraID = editor.playCamera.id;
        
        if (format === 'babylon') {
            editor.sceneFile = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serializedScene)), 'scene' + randomId + '.babylon');
            FilesInput.FilesToLoad[editor.sceneFile.name] = editor.sceneFile;
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
        FilesInput.FilesToLoad[editor.projectFile.name] = editor.projectFile;
    }

    /**
     * Creates the babylon scene and a download link for the babylon file
     * @param editor the editor reference
     */
    public static DownloadBabylonFile (editor: Editor): void {
        this.CreateFiles(editor);
        BabylonTools.Download(editor.sceneFile, editor.sceneFile.name);
    }
}
