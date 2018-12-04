import {
    Tags,
    SceneLoader,
    FilesInput,
    MultiMaterial,
    Tools as BabylonTools,
} from 'babylonjs';

import Editor from '../editor';

import Tools from '../tools/tools';
import Request from '../tools/request';

import Window from '../gui/window';
import Picker from '../gui/picker';

import SceneFactory from './scene-factory';

import ProjectExporter from '../project/project-exporter';
import { ProjectRoot } from '../typings/project';

export default class SceneImporter {
    /**
     * 
     */
    public static async CheckOpenedFile (editor: Editor): Promise<boolean> {
        // Get path
        const path = await Request.Get<string>('/openedFile');
        if (!path)
            return false;

        // Parse project content
        const content = await Tools.LoadFile<string>(path);
        if (content === '')
            return;
        
        const project = <ProjectRoot> JSON.parse(content);

        // Load files
        const promises: Promise<void>[] = [];
        const files: File[] = [];
        const folder = path.replace(Tools.GetFilename(path), '');

        const filesList = await Request.Get<{ value: { folder: string; name: string }[] }>('/files?path=' + folder);

        // Manage backward compatibility for file list
        if (!project.filesList) {
            project.filesList = [];
            for (const v of filesList.value) {
                if (v.folder)
                    continue;

                project.filesList.push(v.name);
            }
        }

        // Load all files
        for (const f of project.filesList) {
            promises.push(new Promise<void>(async (resolve) => {
                const name = Tools.GetFilename(f);
                const realFile = filesList.value.find(v => v.name === name || v.name.toLowerCase() === f);
                const realname = realFile ? realFile.name : name;

                const ext = Tools.GetFileExtension(realname);
                if (ext === 'babylon') {
                    FilesInput.FilesToLoad = { };
                }

                const buffer = await Tools.LoadFile<ArrayBuffer>(folder + name, true);
                const array = new Uint8Array(buffer);

                files.push(Tools.CreateFile(array, realname));

                resolve();
            }));
        }

        editor.layout.lockPanel('main', 'Loading project files...', true);
        await Promise.all(promises);

        // Setup and load
        editor._showReloadDialog = false;
        editor.filesInput.loadFiles({
            target: {
                files: files
            }
        });

        // Configure exporter
        ProjectExporter.ProjectPath = folder;

        return true;
    }

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
                        m.metadata = m.metadata || { };
                        m.metadata.baseConfiguration = {
                            isPickable: m.isPickable
                        };
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
