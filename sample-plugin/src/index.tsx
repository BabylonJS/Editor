import * as React from "react";
import { Editor, IPlugin } from "babylonjs-editor";

import { Toolbar } from "./toolbar";

/**
 * Registers the plugin by returning the IPlugin content.
 * @param editor defines the main reference to the editor.
 */
export const registerEditorPlugin = (editor: Editor): IPlugin => {
    return {
        // Export all tolbar elements
        toolbarElements: [
            { buttonLabel: "Sample Plugin", buttonIcon: "airplane", content: <Toolbar editor={editor} /> }
        ],
    };
}
