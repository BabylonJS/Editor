import { CodeEditor } from 'babylonjs-editor';

import CodeProjectEditor, { Script } from './project-editor';

export default class CodeEdit {
    // Public members
    public codeEditor: CodeProjectEditor;
    public code: CodeEditor = null;

    public onClose: () => void = null;
    public onChange: () => void = null;

    /**
     * Constructor
     * @param codeEditor the code editor reference
     */
    constructor (codeEditor: CodeProjectEditor) {
        this.codeEditor = codeEditor;
    }

    /**
     * Creates the code editor
     */
    public async create (code: Script): Promise<void> {
        // Create tab
        this.codeEditor.codeLayout.layout.addPanelToStack('edit-panel', {
            type: 'component',
            title: code.name,
            componentName: code.id,
            html: `<div id="${code.id}-editor" style="width: 100%; height: 100%;"></div>`,
            onClose: () => {
                this.code.dispose();
                
                if (this.onClose)
                    this.onClose();
            }
        });

        // Create editor
        this.code = new CodeEditor('typescript', code.code);
        await this.code.build(code.id + '-editor');

        // On the user changes the code
        let compileTimeoutId = -1;

        this.code.onChange = value => {
            // Set a timeout before transpilation until the user
            // finished typings his code
            clearTimeout(compileTimeoutId);

            compileTimeoutId = setTimeout(() => {
                const config = {
                    module: 'cjs',
                    target: 'es5',
                    experimentalDecorators: true,
                };
    
                code.code = value;
                code.compiledCode = this.code.transpileTypeScript(code.code, code.name.replace(/ /, ''), config);
    
                if (this.onChange)
                    this.onChange();
            }, 500);
        };
    }
}
