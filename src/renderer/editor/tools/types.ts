import { Undefinable, IStringDictionary } from "../../../shared/types";

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

export enum EditorPlayMode {
    /**
     * Opens the game in a new panel of the Editor.
     */
    EditorPanelBrowser = 0,
    /**
     * Opens the game in a new window using the integrated browser.
     */
    IntegratedBrowser,
    /**
     * Opens the game in an external browser (see user's prefs).
     */
    ExternalBrowser,
}

export interface IAttachedScriptMetadata {
    /**
     * Defines the name of the script.
     */
    name?: string;
    /**
     * Defines the dictionary of all editable properties.
     */
    properties?: IStringDictionary<{
        type: string;
        value?: number | boolean | string |
                { x: number; y: number; z?: number; w?: number; } |
                { r: number; g: number; b: number; a?: number; }
    }>;
}

export interface IOriginalSourceFileMetadata {
    /**
     * Defines the id of the mesh in the scene file.
     */
    id: string;
    /**
     * Defines the name of the mesh in the scene file.
     */
    name: string;
    /**
     * Defines the name of the scene file.
     */
    sceneFileName: string;
}

export interface ICommonMetadata {
    /**
     * Defines wether or not the mesh is pickable.
     */
    isPickable?: boolean;
    /**
     * Defines wether or not the node is exportable.
     */
    doNotExport?: boolean;
    /**
     * Defines wether or not the mesh is locked.
     */
    isLocked?: boolean;

    /**
     * Defines the overall script properties of the object (scene or node).
     */
    script?: IAttachedScriptMetadata;
}

export interface IMeshMetadata extends ICommonMetadata {
    /**
     * In case the mesh is exported as binary format, this defines wether or not
     * the geometry for THIS mesh should be kept inline.
     */
    keepGeometryInline?: boolean;

    /**
     * Defines the original data of the source file.
     */
    originalSourceFile?: IOriginalSourceFileMetadata;
}

export interface IMaterialMetadata {
    /**
     * Defines the original data of the source file.
     */
    originalSourceFile?: IOriginalSourceFileMetadata;
}
