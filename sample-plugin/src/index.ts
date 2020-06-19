import { Editor, IPlugin } from "babylonjs-editor";

/**
 * Registers the plugin by returning the IPlugin content.
 * @param editor defines the main reference to the editor.
 */
export const registerEditorPlugin = (editor: Editor): IPlugin => {
    console.log(editor);
    return {
        toolbarElements: [],
    };
}
