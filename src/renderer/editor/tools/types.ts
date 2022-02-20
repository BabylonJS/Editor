import { Undefinable, IStringDictionary, Nullable } from "../../../shared/types";

import { Material, Geometry, Skeleton, SubMesh, Mesh } from "babylonjs";

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
     * Defines wether or not an overlay should be drawn on the user puts his mouse
     * over an element in the preview.
     */
    noOverlayOnDrawElement?: boolean;

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

    /**
     * Defines the optional CSS properties for custom rendering in editor's graph.
     */
    editorGraphStyles?: React.CSSProperties;

    /**
     * Any other key
     */
    [index: string]: any;
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
    heightMap?: {
        /**
         * Defines the buffer of the height map texture.
         */
        texture: number[];
        /**
         * Defines the width of the texture.
         */
        textureWidth: number;
        /**
         * Defines the height of the texture.
         */
        textureHeight: number;
        /**
         * Defines the options of the heightmap when being applied.
         * @see VertexData.CreateGroundFromHeightMap for more information.
         */
        options: {
            minHeight: number;
            maxHeight: number;
            colorFilter: number[];
        };
    };
    /**
     * Defines the objects that are waiting to be updated.
     */
    _waitingUpdatedReferences?: {
        /**
         * Defines the geometry object containing the components to update.
         */
        geometry?: {
            /**
             * Defines the updated geometry reference.
             */
            geometry: Nullable<Geometry>;
            /**
             * Defines the updated skeleton reference.
             */
            skeleton: Nullable<Skeleton>;
            /**
             * Defines the list of new sub-meshes.
             */
            subMeshes: SubMesh[];
            /**
             * Defines the handler to call in order to apply the updated material reference.
             */
            handler?: (mesh: Mesh, withSkeleton: boolean) => unknown | Promise<unknown>;
        };
        /**
         * Defines the material object containing the component's to update.
         */
        material?: {
            /**
             * Defines wether or not the material comes from a gltf mesh file.
             */
            isGltf: boolean;
            /**
             * Defines the reference to the material to update.
             */
            material: Nullable<Material>;
            /**
             * Defines the handler to call in order to apply the updated material reference.
             */
            handler?: (mesh: Mesh) => unknown | Promise<unknown>;
        };
    };
}

export interface ITransformNodeMetadata extends ICommonMetadata {
    /**
     * Defines the original data of the source file.
     */
    originalSourceFile?: IOriginalSourceFileMetadata;
}

export interface IGroundMetadata {
    /**
     * Defines the options available when the ground is associated to a height map.
     */
    heightMap?: {
        /**
         * Defines the buffer used to store the texture's pixels.
         */
        texture?: number[];
        /**
         * Defines the width of the texture.
         */
        textureWidth?: number;
        /**
         * Defines the height of the texture.
         */
        textureHeight?: number;
        /**
         * Defines the options passed to the height map generator of Babylon.JS.
         */
        options?: {
            /**
             * Defines the minimum height applied on the height map.
             */
            minHeight: number;
            /**
             * Defines the maximum height applied on the height map.
             */
            maxHeight: number;
            /**
             * Defines the color filter applied on the height map.
             */
            colorFilter: number[];
        };
    }
}

export interface IMaterialMetadata {
    /**
     * Defines the relative path in the project of the material asset.
     */
    editorPath?: string;
    /**
     * Defines the original data of the source file.
     */
    originalSourceFile?: IOriginalSourceFileMetadata;
}
