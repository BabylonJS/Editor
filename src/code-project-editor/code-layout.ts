import { ResizableLayout, IStringDictionary, CodeEditor } from "babylonjs-editor";

import CodeProjectEditor, { Script } from './project-editor';
import CodeEdit from "./code-editor";

export interface OpenedCodeEditor {
    editor: CodeEdit;
    script: Script;
}

export default class CodeLayout {
    // Public members
    public codeEditor: CodeProjectEditor;
    public layout: ResizableLayout;

    public openedCodeEditors: IStringDictionary<OpenedCodeEditor> = { };

    /**
     * Constructor
     * @param codeEditor the code editor reference
     */
    constructor (codeEditor: CodeProjectEditor) {
        this.codeEditor = codeEditor;
    }

    /**
     * Creates the resizable layout
     */
    public async create (): Promise<void> {
        this.layout = new ResizableLayout('CODE-LAYOUT');
        this.layout.panels = [{
            type: 'row',
            content:[
                { type: 'stack', id: 'edit-panel', componentName: 'Codes', isClosable: false, height: 20, content: [] }
            ]
        }];
        this.layout.build('CODE-LAYOUT');
    }

    /**
     * Opens a new code editor
     * @param script the code to modify
     */
    public async openCode (script: Script): Promise<void> {
        // Script?
        const effectiveScript = this.codeEditor.scripts.find(c => c.id === script.id);

        // Return
        if (!effectiveScript)
            return;
        
        // Just show?
        if (this.openedCodeEditors[script.id])
            return this.layout.showPanelTab(script.id);
        
        // Create editor
        const codeEdit = new CodeEdit(this.codeEditor);
        codeEdit.onClose = () => this.closeCode(script.id);
        await codeEdit.create(effectiveScript);

        // Register
        this.openedCodeEditors[script.id] = {
            editor: codeEdit,
            script: script
        };

        // Events
        codeEdit.onChange = () => this.updateTypings();
    }

    /**
     * Closes the code editor identified by the given Id
     * @param codeId the code if to close
     */
    public closeCode (codeId: string): void {
        delete this.openedCodeEditors[codeId];
        this.layout.removePanel(codeId);
    }

    /**
     * Updates the typings
     */
    public updateTypings (): void {
        const extension = this.codeEditor.editor.getExtension<any>('BehaviorExtension');
        if (!extension) // No need to update typings
            return;
        
        const metadatas = extension.onSerialize();

        // Clear extra libs
        for (const k in CodeEditor.CustomLibs) {
            const lib = CodeEditor.CustomLibs[k];
            lib.dispose();
        }

        // Add extra libs
        metadatas.scripts.forEach(s => {
            const isAttached = metadatas.nodes.find(n => n.metadatas.find(m => m.codeId === s.id) !== undefined);
            if (isAttached)
                return;

            const code = `declare module "${s.name}" {${s.code}}`;
            CodeEditor.CustomLibs[s.id + s.name] = window['monaco'].languages.typescript.typescriptDefaults.addExtraLib(code, s.name);
        });
    }
}
