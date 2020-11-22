import { Undefinable } from "../../../shared/types";

import { IObjectInspector } from "../components/inspector";

import { Editor } from "../editor";

import { IPluginToolbar } from "./toolbar";

export interface IPlugin {
    /**
     * Defines the list of all toolbar elements to add when the plugin has been loaded.
     */
    toolbar?: Undefinable<IPluginToolbar[]>;
    /**
     * Defines the list of all inspector elements.
     */
    inspectors?: Undefinable<IObjectInspector[]>;

    /**
     * If implemented, should return an object (plain JSON object) that will be saved
     * in the workspace file. This will be typically used to store preferences of the plugin
     * work a given workspace and not globally.
     * If implemented, the preferences will be saved in the .editorworkspace file each time the user
     * saves the project.
     */
    getWorkspacePreferences?: () => any;
    /**
     * When the plugin saved preferences (@see .getWorkspacePreferences) this function
     * will be called giving the plain JSON representation of the user's preferences for
     * the current plugin.
     */
    setWorkspacePreferences?: (preferences: any) => void;

    /**
     * Called on the plugin is being disposed.
     */
    onDispose?: () => void;
}

/**
 * Defines the signature of the function that is exported by the editor's plugin.
 */
export type registerEditorPlugin = (editor: Editor) => IPlugin;
