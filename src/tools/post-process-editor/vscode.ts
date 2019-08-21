import Editor, { CodeEditor, VSCodeSocket } from 'babylonjs-editor';
import { PostProcessCreatorMetadata } from '../../extensions/post-process-editor/post-process-editor';

export default class PostProcessVSCode {
    /**
     * Called on the the behavior code editor is opened.
     */
    public static OnUpdate: (d: PostProcessCreatorMetadata, needsUpdate: boolean) => void = null;

    /**
     * Called on the user modifies a script in VSCode.
     * @param d the behavior code structure being modified in VSCode.
     * @param editor the editor reference.
     */
    public static async Update (d: PostProcessCreatorMetadata, editor: Editor): Promise<void> {
        // Get effective script modified in the vscode editor
        const effective = editor.core.scene.metadata.PostProcessCreator.find(s => s.id === d.id);
        const compiledCode = d.code ? await CodeEditor.TranspileTypeScript(d.code, d.name.replace(/ /, ''), {
            module: 'cjs',
            target: 'es5',
            experimentalDecorators: true,
        }) : null;

        let needsUpdate = true;

        if (!effective) {
            // Just refresh
            VSCodeSocket.RefreshPostProcess(editor.core.scene.metadata.PostProcessCreator);
            return;
        }
        else {
            if (d.code && effective.code === d.code) needsUpdate = false;
            if (d.pixel && effective.pixel === d.pixel) needsUpdate = false;
            if (d.config && effective.config === d.config) needsUpdate = false;

            // Just update
            d.code && (effective.code = d.code);
            d.pixel && (effective.pixel = d.pixel);
            d.config && (effective.config = d.config);
            compiledCode && (effective.compiledCode = compiledCode);
        }

        this.OnUpdate && this.OnUpdate(d, needsUpdate);
    }
}
