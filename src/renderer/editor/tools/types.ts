import { Undefinable } from "../../../shared/types";

export interface IObjectModified<T> {
    /**
     * Defines the reference to the object that has been modified.
     */
    object: T;
    /**
     * Defines the path as a string of the modified property.
     * @example "position.x"
     * @example "name"
     */
    path: string;
}

export interface IEditorPreferences {
    /**
     * Defines the path of the terminal to execute when opening the terminal in the editor.
     */
    terminalPath?: string;
    /**
     * Defines the current zoom value of the editor.
     */
    zoom?: string;
    /**
     * Defines the current hardware scaling level.
     */
    scalingLevel?: number;

    /**
     * Defines the list of all position snapping values.
     */
    positionGizmoSnapping?: number[];
    /**
     * Defines the list of all registered plugins for the editor.
     */
    plugins?: Undefinable<IRegisteredPlugin[]>;
    /**
     * Defines wether or not the developer mode is activated. When activated, the editor will install
     * the React dev tools and other dev tools useful to debug plugins.
     */
    developerMode?: Undefinable<boolean>;
}

export interface IRegisteredPlugin {
    /**
     * Defines the name of the plugin.
     */
    name: string;
    /**
     * Defines the path to the plugin.
     */
    path: string;
    /**
     * Defines wether or not the plugin is enabled.
     */
    enabled: boolean;
    /**
     * Defines wether or not the plugin comes from NPM.
     */
    fromNpm?: boolean;
}
