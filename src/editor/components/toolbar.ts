import { FilesInputStore } from 'babylonjs';

import Editor from '../editor';
import { IEditorPlugin } from '../typings/plugin';

import Toolbar from '../gui/toolbar';
import Window from '../gui/window';
import Dialog from '../gui/dialog';

import Tools from '../tools/tools';
import UndoRedo from '../tools/undo-redo';
import ThemeSwitcher from '../tools/theme';
import Request from '../tools/request';

import SceneExporter from '../scene/scene-exporter';
import SceneFactory from '../scene/scene-factory';
import SceneImporter from '../scene/scene-importer';
import SceneManager from '../scene/scene-manager';
import SceneSerializer from '../scene/scene-serializer';

import ProjectImporter from '../project/project-importer';
import ProjectExporter from '../project/project-exporter';
import ProjectSettings from '../project/project-settings';
import CodeProjectEditorFactory from '../project/project-code-editor';

import PhotoshopSocket, { PhotoshopExtensionStatus } from '../extensions/photoshop-socket';

export default class EditorToolbar {
    // Public members
    public main: Toolbar;
    public tools: Toolbar;

    /**
     * Constructor
     * @param editor: the editor's reference
     */
    constructor (protected editor: Editor) {
        // Build main toolbar
        this.main = new Toolbar('MainToolBar');
        this.main.items = [
            {
                type: 'menu', id: 'project', text: 'Project', img: 'icon-project', items: [
                    { id: 'import-project', img: 'icon-export', text: 'Import Project...' },
                    { type: 'break' },
                    { id: 'reload-project', img: 'icon-copy', text: 'Reload...' },
                    { id: 'new-project', img: 'icon-copy', text: 'New Project...' },
                    { type: 'break' },
                    { id: 'export-project', img: 'icon-files', text: 'Save Project... <kbd>CTRL + S</kbd>' },
                    { id: 'export-project-as', img: 'icon-files', text: 'Save Project As... <kbd>ALT + CTRL + S</kbd>' },
                    { type: 'break' },
                    { id: 'project-settings', img: 'icon-scenario', text: 'Project Settings...' },
                    { type: 'break' },
                    { id: 'export-template', img: 'icon-files-project', text: 'Export Project Template...' }
                ]
            },
            {
                type: 'menu', id: 'scene', text: 'Scene', img: 'icon-scene', items: [
                    { id: 'download-scene', img: 'icon-export', text: 'Save Scene File...' },
                    { id: 'serialize-scene', img: 'icon-export', text: 'Save Scene File As...' },
                    { type: 'break' },
                    { id: 'export-final-scene', img: 'icon-files-project', text: 'Export Final Scene And Assets...' }
                ]
            },
            { type: 'break' },
            {
                type: 'menu', id: 'edit', text: 'Edit', img: 'icon-edit', items: [
                    { id: 'undo', img: 'icon-undo', text: 'Undo <kbd>CTRL + Z</kbd>' },
                    { id: 'redo', img: 'icon-redo', text: 'Redo <kbd>CTRL + Y</kbd>' },
                    { type: 'break' },
                    { id: 'clean-materials', img: 'icon-recycle', text: 'Clean Unused Materials' },
                    { id: 'clean-textures', img: 'icon-recycle', text: 'Clean Unused Textures' },
                    { type: 'break' },
                    { id: 'restore-removed-object', img: 'icon-recycle', text: 'Restore Removed Object...' },
                    { type: 'break' },
                    { id: 'set-theme-light', img: 'icon-helpers', text: 'Light Theme' },
                    { id: 'set-theme-dark', img: 'icon-helpers', text: 'Dark Theme' },
                    { type: 'break' },
                    { id: 'reset-editor-state', img: 'icon-recycle', text: `Reset Editor's state` }
                ]
            },
            { type: 'break' },
            {
                type: 'menu', id: 'view', text: 'View', img: 'icon-helpers', items: [
                    { id: 'textures', img: 'icon-dynamic-texture', text: 'Textures Viewer...' },
                    { id: 'materials', img: 'icon-effects', text: 'Materials Viewer...' },
                ]
            },
            { type: 'break' },
            {
                type: 'menu', id: 'tools', text: 'Tools', img: 'icon-scenario', items: [
                    { id: 'animations', img: 'icon-animators', text: 'Animations Editor...' },
                    { type: 'break' },
                    { id: 'code-editor', img: 'icon-behavior-editor', text: 'Code Editor...' },
                    { id: 'graph-editor', img: 'icon-graph', text: 'Graph Editor...' },
                    { type: 'break' },
                    // { id: 'material-editor', img: 'icon-shaders', text: 'Material Editor...' },
                    { id: 'post-process-editor', img: 'icon-shaders', text: 'Post-Process Editor...' },
                    { id: 'particles-creator', img: 'icon-particles', text: 'Particles Creator' },
                    { type: 'break' },
                    { id: 'path-finder', img: 'icon-graph', text: 'Path Finder...' },
                    { type: 'break' },
                    { id: 'metadatas', img: 'icon-behavior-editor', text: 'Metadatas Editor...' },
                    { id: 'notes', img: 'icon-behavior-editor', text: 'Notes...' },
                    { id: 'prefab-editor', img: 'icon-mesh', text: 'Prefab Editor...' }
                ]
            },
            { type: 'break' },
            {
                type: 'menu', id: 'add', text: 'Add', img: 'icon-add', items: [
                    { id: 'default-environment', img: 'icon-add', text: 'Default Environment' },
                    { type: 'break' },
                    { id: 'particle-system', img: 'icon-particles', text: 'Particle System' },
                    { id: 'particle-system-animated', img: 'icon-particles', text: 'Animated Particle System' },
                    { type: 'break;' },
                    { id: 'sky', img: 'icon-sky', text: 'Sky Effect' },
                    { id: 'water', img: 'icon-water', text: 'Water Effect' },
                    { type: 'break' },
                    { id: 'dummy-node', img: 'icon-clone', text: 'Dummy' },
                    { id: 'ground', img: 'icon-mesh', text: 'Ground Mesh' },
                    { id: 'cube', img: 'icon-box-mesh', text: 'Cube Mesh' },
                    { id: 'sphere', img: 'icon-sphere-mesh', text: 'Sphere Mesh' },
                    { id: 'plane', img: 'icon-mesh', text: 'Plane Mesh' },
                    { type: 'break' },
                    { id: 'point-light', img: 'icon-light', text: 'Point Light' },
                    { id: 'directional-light', img: 'icon-directional-light', text: 'Directional Light' },
                    { id: 'spot-light', img: 'icon-directional-light', text: 'Spot Light' },
                    { id: 'hemispheric-light', img: 'icon-light', text: 'Hemispheric Light' },
                    { type: 'break' },
                    { id: 'sound', img: 'icon-sound', text: 'Sound' }
                ]
            },
            { type: 'break' },
            { id: 'connect-photoshop', img: 'icon-photoshop-off', text: 'Connect To Photoshop CC...' }

            // TODO: wait for parse and serialize for GUI
            // { type: 'break' },
            // {
            //     type: 'menu', id: 'gui', text: 'Gui', img: 'icon-lens-flare', items: [
            //         { id: 'add-advanced-texture', img: 'icon-ground', text: 'Add Advanced Texture' },
            //         { id: 'add-image', img: 'icon-dynamic-texture', text: 'Add Image' }
            //     ]
            // },
        ];
        this.main.helpUrl = 'http://doc.babylonjs.com/resources/';
        this.main.onClick = target => this.onMainClick(target);
        this.main.build('MAIN-TOOLBAR');

        // Build toolbar
        this.tools = new Toolbar('ToolsToolBar');
        this.tools.items = [
            { type: 'button', id: 'test', text: 'Play', img: 'icon-play-game' },
            { type: 'button', id: 'test-debug', text: 'Play And Debug...', img: 'icon-play-game-windowed' }
        ];
        this.tools.onClick = target => this.onToolsClick(target);
        this.tools.build('TOOLS-TOOLBAR');
    }

    /**
     * Notifies the user that something happens
     * @param message message to draw
     */
    public notifyRightMessage (message: string): void {
        this.tools.element.right = message;
        this.tools.element.render();
    }

    /**
     * Once the user clicks on a menu of the main toolbar
     * @param target the target element
     */
    protected async onMainClick (target: string): Promise<void> {
        switch (target) {
            // Project
            case 'project:import-project':
                const openedProject = await ProjectImporter.ImportProject(this.editor);
                if (!openedProject && Tools.IsElectron())
                    await Request.Post('/openedFile', { value: null });
                break;

            case 'project:reload-project':
                Dialog.Create('Reload scene', 'Are you sure to reload the entire scene?', (result) => {
                    if (result === 'No')
                        return;
                    
                    CodeProjectEditorFactory.CloseAll();
                    this.editor._showReloadDialog = false;

                    if (Tools.IsElectron()) {
                        this.editor.checkOpenedFile();
                    }
                    else {
                        this.editor.filesInput['_processReload']();
                    }
                });
                break
            case 'project:new-project':
                ProjectExporter.ProjectPath = null;
                await this.editor.createDefaultScene(true, true);
                
                if (Tools.IsElectron())
                    await Request.Post('/openedFile', JSON.stringify({ value: null }));
                break;

            case 'project:export-project':
                await ProjectExporter.ExportProject(this.editor);
                break;
            case 'project:export-project-as':
                await ProjectExporter.ExportProject(this.editor, true);
                break;

            case 'project:project-settings':
                ProjectSettings.ShowDialog(this.editor);
                break;

            case 'project:export-template':
                await ProjectExporter.ExportTemplate(this.editor, false);
                break;

            // Scene
            case 'scene:download-scene':
                SceneExporter.DownloadBabylonFile(this.editor);
                break;
            case 'scene:serialize-scene':
                new SceneSerializer(this.editor.core.scene);
                break;

            case 'scene:export-final-scene':
                await ProjectExporter.ExportTemplate(this.editor, true);
                break;

            // Edit
            case 'edit:undo':
                UndoRedo.Undo();
                break;
            case 'edit:redo':
                UndoRedo.Redo();
                break;

            case 'edit:clean-materials':
                Window.CreateAlert(`Cleared ${SceneManager.CleanUnusedMaterials(this.editor.core.scene)} materials`, 'Report');
                break;
            case 'edit:clean-textures':
                Window.CreateAlert(`Cleared ${SceneManager.CleanUnusedTextures(this.editor.core.scene)} textures`, 'Report');
                break;


            case 'edit:restore-removed-object':
                SceneManager.RestoreRemovedObjects(this.editor);
                break;
            
            case 'edit:set-theme-light':
                ThemeSwitcher.ThemeName = 'Light';
                break;
            case 'edit:set-theme-dark':
                ThemeSwitcher.ThemeName = 'Dark';
                break;

            case 'edit:reset-editor-state':
                await this.editor.resetEditorState();
                break;

            // View
            case 'view:textures':
                await this.loadTool('texture-viewer', 'Textures Viewer');
                break;
            case 'view:materials':
                await this.loadTool('material-viewer', 'Materials Viewer');
                break;

            // Tools
            case 'tools:animations':
                await this.loadTool('animation-editor', 'Animations Editor');
                break;
            case 'tools:code-editor':
                await this.loadTool('behavior-editor', 'Code Editor');
                break;
            case 'tools:graph-editor':
                await this.loadTool('graph-editor', 'Graph Editor');
                break;
            case 'tools:material-editor':
                await this.loadTool('material-editor', 'Material Editor');
                break;
            case 'tools:post-process-editor':
                await this.loadTool('post-process-editor', 'Post-Process Editor');
                break;
            case 'tools:particles-creator':
                await this.loadTool('particles-creator', 'Particles Creator');
                break;
            case 'tools:path-finder':
                await this.loadTool('path-finder', 'Path Finder');
                break;
            case 'tools:metadatas':
                await this.loadTool('metadatas', 'Metadatas Editor');
                break;
            case 'tools:notes':
                await this.loadTool('notes', 'Notes');
                break;
            case 'tools:prefab-editor':
                await this.loadTool('prefab-editor', 'Prefab Editor');
                break;

            // Add
            case 'add:default-environment':
                SceneFactory.CreateDefaultEnvironment(this.editor);
                break;
            
            case 'add:particle-system':
                SceneFactory.CreateDefaultParticleSystem(this.editor, false);
                break;
            case 'add:particle-system-animated':
                SceneFactory.CreateDefaultParticleSystem(this.editor, true);
                break;
            case 'add:sky':
                SceneFactory.CreateSkyEffect(this.editor);
                break;
            case 'add:water':
                SceneFactory.CreateWaterEffect(this.editor);
                break;
            
            case 'add:dummy-node':
                SceneFactory.CreateDummyNode(this.editor);
                break;
            case 'add:ground':
                SceneFactory.CreateGroundMesh(this.editor);
                break;
            case 'add:cube':
                SceneFactory.CreateCube(this.editor);
                break;
            case 'add:sphere':
                SceneFactory.CreateSphere(this.editor);
                break;
            case 'add:plane':
                SceneFactory.CreatePlane(this.editor);
                break;


            case 'add:point-light':
                SceneFactory.CreateLight(this.editor, 'point');
                break;
            case 'add:directional-light':
                SceneFactory.CreateLight(this.editor, 'directional');
                break;
            case 'add:spot-light':
                SceneFactory.CreateLight(this.editor, 'spot');
                break;
            case 'add:hemispheric-light':
                SceneFactory.CreateLight(this.editor, 'hemispheric');
                break;
            
            case 'add:sound':
                SceneFactory.AddSound(this.editor);
                break;

            case 'gui:add-advanced-texture':
                SceneFactory.AddGui(this.editor);
                break;
            case 'gui:add-image':
                SceneFactory.AddGuiImage(this.editor);
                break;

            // Photoshop
            case 'connect-photoshop':
                const isChecked = this.main.isChecked('connect-photoshop', true);
                this.editor.notifyMessage(isChecked ? 'Connecting to Photoshop CC' : 'Disconnecting from Photoshop CC', true);

                this.main.enable('connect-photoshop', false);
                const status = (isChecked ? (await PhotoshopSocket.Connect(this.editor)) : (await PhotoshopSocket.Disconnect()));
                this.main.enable('connect-photoshop', true);

                switch (status) {
                    case PhotoshopExtensionStatus.OPENED:
                        this.editor.notifyMessage('Connected to Photoshop CC', false, 2000);
                        this.main.updateItem('connect-photoshop', { text: 'Disconnect From Photoshop CC', img: 'icon-photoshop-on' });
                        this.main.setChecked('connect-photoshop', isChecked);
                        break;
                    case PhotoshopExtensionStatus.CLOSED:
                        this.editor.notifyMessage('Disconnected from Photoshop CC', false, 2000);
                        this.main.updateItem('connect-photoshop', { text: 'Connect To Photoshop CC', img: 'icon-photoshop-off' });
                        this.main.setChecked('connect-photoshop', isChecked);
                        break;
                    case PhotoshopExtensionStatus.ERROR:
                        this.editor.notifyMessage('Failed to connect to Photoshop CC. Ensure that Photoshop CC is opened.', false, 1000);
                        break;
                }
                break;

            default: break;
        }
    }

    /**
     * Once the user clicks on a menu of the tools toolbar
     * @param target the target element
     */
    protected onToolsClick (target: string): void {
        switch (target) {
            case 'test':
                SceneExporter.CreateFiles(this.editor);
                this.editor.addEditPanelPlugin('play-game', false, 'Game');
                break;
            case 'test-debug':
                SceneExporter.CreateFiles(this.editor);
                Tools.OpenPopup('./preview.html', 'Preview', 1280, 800).addEventListener('beforeunload', (ev) => {
                    if (ev.srcElement['baseURI'].indexOf('preview.html') === -1)
                        return;
                    
                    if (this.editor.projectFile) {
                        delete FilesInputStore.FilesToLoad[this.editor.projectFile.name];
                        this.editor.projectFile = null;
                    }
                    if (this.editor.sceneFile) {
                        delete FilesInputStore.FilesToLoad[this.editor.sceneFile.name];
                        this.editor.sceneFile = null;
                    }
                });
                break;
            default: break;
        }
    }

    /**
     * Loads an editor tool and add it in the edit-panel
     * @param url the URL of the tool
     * @param name: the name of the tool to draw when locking the panel
     */
    protected async loadTool (url: string, name: string): Promise<IEditorPlugin> {
        const result = await this.editor.addEditPanelPlugin(url, false, name);
        return result;
    }
}
