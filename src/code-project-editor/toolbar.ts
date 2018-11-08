import { Toolbar, ThemeSwitcher } from 'babylonjs-editor';

import CodeProjectEditor from './project-editor';

export default class CodeEditorToolbar {
    // Public members
    public codeEditor: CodeProjectEditor;
    public toolbar: Toolbar = null;

    /**
     * Constructor
     * @param codeEditor the code editor reference
     */
    constructor (codeEditor: CodeProjectEditor) {
        this.codeEditor = codeEditor;

        // Create toolbar
        this.toolbar = new Toolbar('TOOLBAR');
        this.toolbar.items = [
            { 
                type: 'menu', id: 'edit', text: 'Edit', img: 'icon-edit', items: [
                    { id: 'set-theme-light', img: 'icon-helpers', text: 'Light Theme' },
                    { id: 'set-theme-dark', img: 'icon-helpers', text: 'Dark Theme' }
                ]
            }
        ];
        this.toolbar.onClick = target => this.onClick(target);
        this.toolbar.build('TOOLBAR');
    }

    /**
     * Once the user clicks on a menu of the main toolbar
     * @param target the target element
     */
    protected async onClick (target: string): Promise<void> {
        switch (target) {
            // Edit
            case 'edit:set-theme-light':
                ThemeSwitcher.ThemeName = 'Light';
                break;
            case 'edit:set-theme-dark':
                ThemeSwitcher.ThemeName = 'Dark';
                break;
            
            default: break;
        }
    }
}
