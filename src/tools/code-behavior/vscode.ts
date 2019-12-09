import Editor, { CodeEditor, VSCodeSocket } from 'babylonjs-editor';
import { BehaviorCode } from '../../extensions/behavior-code/code';

export default class BehaviorVSCode {
    /**
     * Called on the the behavior code editor is opened.
     */
    public static OnUpdate: (d: BehaviorCode, needsUpdate: boolean) => void = null;

    /**
     * Called on the user modifies a script in VSCode.
     * @param d the behavior code structure being modified in VSCode.
     * @param editor the editor reference.
     */
    public static async Update (d: BehaviorCode, editor: Editor): Promise<void> {
        // Get effective script modified in the vscode editor
        const scripts = <BehaviorCode[]> editor.core.scene.metadata.behaviorScripts;
        const effective = <BehaviorCode> scripts.find(s => s.id === d.id);
        const compiledCode = await CodeEditor.TranspileTypeScript(d.code, d.name.replace(/ /, ''), {
            module: 'cjs',
            target: 'es5',
            experimentalDecorators: true,
        });

        let needsUpdate = true;

        if (!effective) {
            // Just refresh
            VSCodeSocket.RefreshBehavior(scripts);
            return;
        }
        else {
            needsUpdate = effective.code !== d.code;
            
            // Just update
            effective.code = d.code;
            effective.compiledCode = compiledCode;
        }

        this.OnUpdate && this.OnUpdate(d, needsUpdate);
    }
}
