import Editor from '../editor';
import { IEditorPlugin } from '../typings/plugin';

import Toolbar from '../gui/toolbar';
import Tools from '../tools/tools';

import ProjectExporter from '../scene/scene-exporter';

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
                    { id: 'export', caption: 'Export...', img: 'icon-folder', text: 'Export...' }
                ]
            },
            { type: 'break' },
            {
                type: 'menu', id: 'view', text: 'View', img: 'icon-edit', items: [
                    { id: 'animations', caption: 'Animations...', img: 'icon-animated-mesh', text: 'Animations...' },
                    { id: 'textures', caption: 'Textures...', img: 'icon-copy', text: 'Textures...' },
                    { id: 'materials', caption: 'Materials...', img: 'icon-effects', text: 'Materials...' },
                    { id: 'code', caption: 'Code...', img: 'icon-behavior', text: 'Code...' }
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
            case 'project:export':
                console.log(ProjectExporter.Export(this.editor));
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
            default: break;
        }
    }

    /**
     * Once the user clicks on a menu of the tools toolbar
     * @param target the target element
     */
    protected onToolsClick (target: string): void {
        switch (target) {
            
            default: break;
        }
    }

    /**
     * 
     * @param url 
     */
    protected async loadTool (url: string, name: string): Promise<IEditorPlugin> {
        this.editor.layout.lockPanel('preview', 'Loading...', true);
        const result = await this.editor.addEditPanelPlugin(url, name);
        this.editor.layout.unlockPanel('preview');

        return result;
    }
}