import * as React from "react";
import { Editor, IPlugin } from "babylonjs-editor";

import { Toolbar } from "./toolbar";

/**
 * Registers the plugin by returning the IPlugin content.
 * @param editor defines the main reference to the editor.
 */
export const registerEditorPlugin = (editor: Editor): IPlugin => {
    return {
        /**
         * Defines the list of all toolbar elements to add when the plugin has been loaded.
         */
        toolbar: [
            { buttonLabel: "Sample Plugin", buttonIcon: "airplane", content: <Toolbar editor={editor} /> }
        ],

        /**
         * If implemented, should return an object (plain JSON object) that will be saved
         * in the workspace file. This will be typically used to store preferences of the plugin
         * work a given workspace and not globally.
         * If implemented, the preferences will be saved in the .editorworkspace file each time the user
         * saves the project.
         */
        getWorkspacePreferences: () => {
            return { myProperty: "I'm preferences of the plugin" };
        },

        /**
         * When the plugin saved preferences (@see .getWorkspacePreferences) this function
         * will be called giving the plain JSON representation of the user's preferences for
         * the current plugin.
         */
        setWorkspacePreferences: (preferences: any) => {
            console.log(preferences);
        },

        /**
         * Called on the plugin is being disposed.
         */
        onDispose: () => {
            console.log("Disposed plugin");
        },
    };
}
