import { Scene, FilesInputStore, SceneLoader as BabylonSceneLoader } from 'babylonjs';

import Editor from '../editor';

import Tools from '../tools/tools';
import UndoRedo from '../tools/undo-redo';

import ProjectExporter from '../project/project-exporter';

import Window from '../gui/window';
import Dialog from '../gui/dialog';
import SceneManager from './scene-manager';
import Extensions from '../../extensions/extensions';
import CodeProjectEditorFactory from '../project/project-code-editor';
import { ProjectRoot } from '../typings/project';
import ProjectImporter from '../project/project-importer';
import GLTFTools from '../tools/gltf-tools';
import ObjTools from '../tools/obj-tools';

import VSCodeSocket from '../extensions/vscode-socket';

export default class SceneLoader {
    // Public members
    public static SceneFiles: File[] = [];

    // Private members
    private static _CurrentProject: ProjectRoot = null;
    private static _SceneExtensions: string[] = ['babylon', 'obj', 'stl', 'gltf', 'glb'];
    private static _CurrentFiles: File[] = [];

    /**
     * Starts processing the files that have just been drag'n'dropped by the user
     * @param editor the editor reference
     * @param files the files array just drag'n'dropped to check if a scene file is present
     */
    public static OnStartingProcessingFiles (editor: Editor, files: File[]): void {
        for (const f of files) {
            const ext = Tools.GetFileExtension(f.name).toLowerCase();

            if (this._SceneExtensions.indexOf(ext) === -1)
                continue;

            // Keep files array
            this._CurrentFiles = files;

            // Reset all
            ProjectExporter.ProjectPath = null;
            editor.projectFile = null;
            editor.sceneFile = null;
            return;
        }
    }

    /**
     * 
     * @param editor the editor reference
     * @param sceneFile the scene file to load
     */
    public static OnReloadingScene (editor: Editor, sceneFile: File): void {
        // If no scene file, just notify that files have been added to the files input store
        if (!sceneFile)
            return editor.notifyMessage('Files added.', false, 3000);

        // Ask to append or load as new scene? or directly load?
        if (editor._showReloadDialog) {
            const title = 'Load scene';
            const message = `Scene file found (${sceneFile.name}). Append to existing one?`;
            Dialog.Create(title, message, (result) => this._Prepare(editor, sceneFile, result === 'Yes'));
        }
        else
            this._Prepare(editor, sceneFile, false);

        editor._showReloadDialog = true;
    }

    /**
     * Prepares the scene loader before loading the scene file
     * @param editor the editor reference
     * @param sceneFile the file reference of the scene being loaded
     * @param append if the scene should be appended or not
     */
    private static async _Prepare (editor: Editor, sceneFile: File, append: boolean): Promise<void> {
        // Clear undo / redo
        UndoRedo.Clear();

        // Load dependencies
        editor.layout.lockPanel('main', 'Importing Loaders...', true);
        await Tools.ImportScript('babylonjs-loaders');

        editor.layout.lockPanel('main', 'Importing Physics...', true);
        await Tools.ImportScript('cannon');

        editor.layout.lockPanel('main', 'Importing Materials...', true);
        await Tools.ImportScript('babylonjs-materials');

        editor.layout.lockPanel('main', 'Importing Procedural Textures...', true);
        await Tools.ImportScript('babylonjs-procedural-textures');

        editor.layout.lockPanel('main', 'Importing Post Processes...', true);
        await Tools.ImportScript('babylonjs-post-process');

        // Import extensions
        editor.layout.lockPanel('main', 'Importing Extensions...', true);
        await Promise.all([
            Tools.ImportScript('behavior-editor'),
            Tools.ImportScript('graph-editor'),
            Tools.ImportScript('material-editor'),
            Tools.ImportScript('post-process-editor'),
            Tools.ImportScript('post-processes'),
            Tools.ImportScript('path-finder'),
            Tools.ImportScript('particles-creator')
        ]);

        editor.layout.unlockPanel('main');

        // Stop render loop
        editor.core.engine.stopRenderLoop();
        
        // Load scene
        if (!append) {
            // Clear files
            FilesInputStore.FilesToLoad = { };
            for (const f of this._CurrentFiles)
                FilesInputStore.FilesToLoad[f.name.toLowerCase()] = f;
            
            BabylonSceneLoader.Load(
                'file:',
                sceneFile.name,
                editor.core.engine,
                (scene) => this._OnSceneLoaded(editor, sceneFile, scene, true),
                null,
                (scene, message) => this._OnError('Error while loading scene', message
            ));
        }
        else {
            BabylonSceneLoader.Append(
                'file:',
                sceneFile.name,
                editor.core.scene,
                (scene) => this._OnSceneLoaded(editor, sceneFile, scene, false),
                null,
                (scene, message) => this._OnError('Error while loading scene', message)
            );
        }

        // Lock panel and hide loading UI
        editor.core.engine.hideLoadingUI();
        editor.layout.lockPanel('main', 'Loading Scene...', true);

        // Delete start scene (when starting the editor) and add new scene
        FilesInputStore.FilesToLoad[sceneFile.name] = sceneFile;
    }

    /**
     * Called once the given scene has been loaded. Just reset everything and configure the new scene
     * @param editor the editor ference
     * @param sceneFile the scene file just loaded
     * @param scene the new scene created using the babylonjs scene loader
     * @param loadingNewScene if the previous scene should be disposed (typically if the user decided to not append to the current scene)
     */
    private static async _OnSceneLoaded (editor: Editor, sceneFile: File, scene: Scene, loadingNewScene: boolean): Promise<void> {
        // Misc.
        if (loadingNewScene)
            this.SceneFiles = [sceneFile];
        else
            this.SceneFiles.push(sceneFile);
        
        // Configure editor
        editor.core.removeScene(editor.core.scene, loadingNewScene);

        editor.core.uiTextures.forEach(ui => ui.dispose());
        editor.core.uiTextures = [];

        editor.core.scene = scene;
        editor.core.scenes.push(scene);

        editor.playCamera = scene.activeCamera;

        const existingCamera = scene.getCameraByName('Editor Camera');
        if (existingCamera)
            existingCamera.dispose();
        
        editor.createEditorCamera();

        // Clear scene manager
        SceneManager.Clear();

        // Editor project
        if (loadingNewScene) {
            Extensions.ClearExtensions();
            CodeProjectEditorFactory.CloseAll();
        }

        // Project file
        if (loadingNewScene) {
            // Load other files
            const appendPromises: Promise<Scene>[] = [];

            for (const f in FilesInputStore.FilesToLoad) {
                const file = FilesInputStore.FilesToLoad[f];
                const ext = Tools.GetFileExtension(file.name).toLowerCase();

                if (file === sceneFile || file === editor.sceneFile || this._SceneExtensions.indexOf(ext) === -1)
                    continue;

                // Load
                appendPromises.push(BabylonSceneLoader.AppendAsync('file:', file.name, scene));
                editor.core.engine.hideLoadingUI();

                // Save
                this.SceneFiles.push(file);
            }

            await Promise.all(appendPromises);

            // Save original values
            editor.layout.lockPanel('main', 'Configuring...', true);
            SceneManager.SaveOriginalObjects(editor.core.scene);

            // Load project
            const projectFile = editor.getProjectFileFromFilesInputStore();                    
            if (projectFile) {
                editor.projectFileName = projectFile.name;
                Tools.SetWindowTitle(projectFile.name);
                
                const content = await Tools.ReadFileAsText(projectFile);
                this._CurrentProject = JSON.parse(content);

                try {
                    // Apply project
                    const importSuccess = await ProjectImporter.Import(editor, this._CurrentProject);
                    if (importSuccess.length > 0) {
                        Window.CreateAlert('Failed to load project: ' + importSuccess.join('\n'), 'Error');
                        ProjectExporter.ProjectPath = null;
                        return editor.createDefaultScene(true, true);
                    }

                    // Removed objects
                    SceneManager.ApplyRemovedObjects(scene, this._CurrentProject.removedObjects);
                } catch (e) {
                    this._OnError('Error while loading project', e.message);
                }

                // Remove project file
                delete FilesInputStore.FilesToLoad[projectFile.name.toLowerCase()];
            }

            // Default light
            if (scene.lights.length === 0)
                scene.createDefaultCameraOrLight(false, false, false);
        }

        // Gltf or glb?
        await GLTFTools.ConfigureFromScene(editor, sceneFile);
        // Obj?
        ObjTools.ConfigureFromScene(editor, sceneFile);

        // Soundtrack
        if (scene.soundTracks && scene.soundTracks.length === 0)
            scene.soundTracks.push(scene.mainSoundTrack);

        // Physics
        if (scene.getPhysicsEngine())
            scene.getPhysicsEngine().setTimeStep(Tools.Epsilon);

        // Graph
        editor.graph.clear();
        editor.graph.fill();

        // Preview
        if (loadingNewScene)
            editor.preview.reset();

        // Restart plugins
        await editor.restartPlugins();

        // Create scene picker
        editor.createScenePicker();

        // Toggle interactions (action manager, etc.)
        SceneManager.Toggle(editor.core.scene);

        // Run scene
        editor.run();

        // Unlock main panel
        editor.layout.unlockPanel('main');

        // Select scene
        editor.core.onSelectObject.notifyObservers(editor.core.scene);

        // Refresh vscode
        VSCodeSocket.Refresh();

        // Clear
        editor.filesInput['_sceneFileToLoad'] = null;

        // Notify
        editor.core.onSceneLoaded.notifyObservers({
            file: sceneFile,
            project: this._CurrentProject,
            scene: editor.core.scene
        });

        // Update components
        editor.stats.updateStats();
        editor.assets.refresh();
        editor.files.refresh();

        // Finish
        this._CurrentProject = null;
    }

    // Creates an alert with the given title and message
    private static _OnError (title: string, message: string): void {
        Window.CreateAlert(message, title);
    }
}
