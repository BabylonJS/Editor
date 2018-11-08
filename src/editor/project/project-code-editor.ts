import Editor from '../editor';
import Tools from '../tools/tools';

import CodeProjectEditor, { Script } from 'babylonjs-editor-code-editor';

/**
 * Options of the project code editor
 */
export interface Options {
    /**
     * The name of the window
     */
    name: string;
    /**
     * The scripts to edit
     */
    scripts: Script[];
    /**
     * Once the editor is opened
     */
    onOpened?: () => void;
    /**
     * Once the user closed the code project editor
     */
    onClose?: () => void;
}

export default class CodeProjectEditorFactory {
    // Public members
    public static Instances: {
        instance: CodeProjectEditor;
        popup: Window;
    }[] = [];

    /**
     * Creates a new project code editor
     * @param editor the editor reference
     * @param options the options of the project code editor
     */
    public static async Create (editor: Editor, options: Options): Promise<CodeProjectEditor> {
        // Create popup
        const url = Tools.IsElectron() ? './code-editor-debug.html' : './code-editor.html';

        const popup = Tools.OpenPopup(url, name, 1280, 800);
        popup.document.title = name;

        // Once loaded, create instance
        return new Promise<CodeProjectEditor>((resolve) => {
            popup.addEventListener('editorloaded', async () => {
                // Create instance
                const codeProjectEditor: CodeProjectEditor = new popup['CodeEditor'](editor);
                await codeProjectEditor.create();

                // Set scripts
                codeProjectEditor.scripts = options.scripts;
                codeProjectEditor.refresh();

                // Open first script by default
                if (options.scripts[0])
                    codeProjectEditor.codeLayout.openCode(options.scripts[0]);

                // Opened
                if (options.onOpened)
                    options.onOpened();

                // Save
                this.Instances.push({ instance: codeProjectEditor, popup: popup });

                // Done
                resolve(codeProjectEditor);
            });

            // On the user closes the code project editor
            popup.addEventListener('beforeunload', () => {
                if (options.onClose)
                    options.onClose();

                // Remove
                for (let i = 0; i < this.Instances.length; i++) {
                    const instance = this.Instances[i];

                    if (instance.popup === popup) {
                        this.Instances.splice(i, 1);
                        break;
                    }
                }
            });
        });
    }

    /**
     * Closes all the code project editors
     */
    public static CloseAll (): void {
        for (const i of this.Instances) {
            i.popup.close();
        }

        this.Instances = [];
    }
}
