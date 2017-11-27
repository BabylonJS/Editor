import Editor from '../editor';
import { IEditorPlugin } from '../typings/plugin';

import Toolbar from '../gui/toolbar';
import Tools from '../tools/tools';

import ProjectExporter from '../scene/scene-exporter';
import SceneFactory from '../scene/scene-factory';
import SceneImporter from '../scene/scene-importer';

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
                type: 'menu', id: 'project', text: 'Project', img: 'icon-folder', items: [
                    { id: 'import-project', img: 'icon-export', text: 'Import Project...' },
                    { type: 'break' },
                    { id: 'clean-project', img: 'icon-copy', text: 'Clean Project...' },
                    { type: 'break' },
                    { id: 'export-project', img: 'icon-files', text: 'Export Project...' },
                    { id: 'export-template', img: 'icon-files-project', text: 'Export Template...' }
                ]
            },
            { type: 'break' },
            {
                type: 'menu', id: 'view', text: 'View', img: 'icon-edit', items: [
                    { id: 'animations', img: 'icon-animated-mesh', text: 'Animations...' },
                    { id: 'textures', img: 'icon-copy', text: 'Textures...' },
                    { id: 'materials', img: 'icon-effects', text: 'Materials...' },
                    { id: 'code', img: 'icon-behavior-editor', text: 'Code...' }
                ]
            },
            { type: 'break' },
            {
                type: 'menu', id: 'add', text: 'Add', img: 'icon-add', items: [
                    { id: 'particle-system', img: 'icon-particles', text: 'Particle System' },
                    { id: 'particle-system-animated', img: 'icon-particles', text: 'Animated Particle System' },
                    { type: 'break;' },
                    { id: 'sky', img: 'icon-shaders', text: 'Sky Effect' },
                    { id: 'water', img: 'icon-water', text: 'Water Effect' },
                ]
            }
        ];
        this.main.onClick = target => this.onMainClick(target);
        this.main.build('MAIN-TOOLBAR');

        // Build toolbar
        this.tools = new Toolbar('ToolsToolBar');
        this.tools.items = [
            { type: 'button', id: 'play', text: 'Play', img: 'icon-play-game' },
            { type: 'button', id: 'test', text: 'Test...', img: 'icon-play-game-windowed' }
        ];
        this.tools.onClick = target => this.onToolsClick(target);
        this.tools.build('TOOLS-TOOLBAR');
    }

    /**
     * Once the user clicks on a menu of the main toolbar
     * @param target the target element
     */
    protected async onMainClick (target: string): Promise<void> {
        switch (target) {
            // Project
            case 'project:import-project':
                SceneImporter.ImportProject(this.editor);
                break;
            case 'project:clean-project':
                this.editor.createDefaultScene(true);
                break;
            case 'project:export-project':
                await ProjectExporter.ExportProject(this.editor);
                break;
            case 'project:export-template':
                await ProjectExporter.ExportTemplate(this.editor);
                break;

            // View
            case 'view:animations':
                await this.loadTool('.build/src/tools/animations/editor.js', 'Animations Editor');
                break;
            case 'view:textures':
                await this.loadTool('.build/src/tools/textures/viewer.js', 'Textures Viewer');
                break;
            case 'view:materials':
                await this.loadTool('.build/src/tools/materials/viewer.js', 'Materials Viewer');
                break;
            case 'view:code':
                await this.loadTool('./.build/src/tools/behavior/code.js', 'Behavior Code');
                break;

            // Add
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
                // TODO
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
                ProjectExporter.CreateFiles(this.editor);
                Tools.OpenPopup('./preview.html', 'Preview', 1280, 800);
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
        const result = await this.editor.addEditPanelPlugin(url, name);
        return result;
    }
}