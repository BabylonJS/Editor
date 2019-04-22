import { Editor, CodeEditor } from 'babylonjs-editor';

import Extensions from '../extensions/extensions';
import CodeExtension from '../extensions/behavior/code';

export default class Helpers {
    /**
     * Updates the typings for monaco basing on custom behavior scripts (not attached scripts)
     * @param editor the editor reference
     * @param editedData the data being updated to avoid typings duplication
     */
    public static UpdateMonacoTypings (editor: Editor, editedData: any = null, onlyNonAttached: boolean = false): void {
        // Manage extra libs
        const scripts = editor.core.scene.metadata.behaviorScripts;
        const extension = <CodeExtension> Extensions.RequestExtension(editor.core.scene, 'BehaviorExtension');

        if (scripts && extension) {
            const datas = extension.onSerialize();

            // Remove libraries
            for (const k in CodeEditor.CustomLibs) {
                const lib = CodeEditor.CustomLibs[k];
                lib.dispose();
            }

            CodeEditor.CustomLibs = { };
        
            // Add libraries
            scripts.forEach(s => {
                if (s === editedData)
                    return;

                if (onlyNonAttached) {
                    // Check if attached, then don't share declaration
                    const isAttached = datas.nodes.find(n => n.metadatas.find(m => m.codeId === s.id) !== undefined);

                    if (isAttached)
                        return;
                }

                const code = `declare module "${s.name}" {${s.code}}`;
                CodeEditor.CustomLibs[s.name] = window['monaco'].languages.typescript.typescriptDefaults.addExtraLib(code, s.name);
            });
        }
    }
}
