import { Undefinable } from "../../../shared/types";

import { IPluginToolbar } from "./toolbar";
import { Editor } from "../editor";

export interface IPlugin {
    /**
     * Defines the list of all toolbar elements to add when the plugin has been loaded.
     */
    toolbarElements?: Undefinable<IPluginToolbar[]>;
}

/**
 * Defines the signature of the function that is exported by the editor's plugin.
 */
export type registerEditorPlugin = (editor: Editor) => IPlugin;
