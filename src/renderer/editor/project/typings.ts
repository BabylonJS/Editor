import { Undefinable, IStringDictionary } from "../../../shared/types";

export interface IWorkSpace {
    /**
     * Defines the local path to the latest opened project.
     */
    lastOpenedScene: string;
    /**
     * The port of the server used when testing the game.
     */
    serverPort: number;
    /**
     * Defines wether or not the final scene should be generated on the project is saved.
     */
    generateSceneOnSave: boolean;
    /**
     * Defines wether or not the project should be watched (webpack).
     */
    watchProject: boolean;
    /**
     * Defines wether or not the workspace has been loaded for the first time.
     */
    firstLoad: boolean;
    /**
     * Defines wether or not incremental loading is used when generating the final scenes.
     */
    useIncrementalLoading?: boolean;
    /**
     * Defines the dictionary that contains the preferences of external plugins in the editor.
     */
    pluginsPreferences?: Undefinable<IStringDictionary<any>>;
}

export interface IProject {
    /**
     * Defines the list of the files associated to the project.
     */
    filesList: string[];

    /**
     * Defines the list of scene's cameras.
     */
    cameras: string[];
    /**
     * Defines the list of scene's textures.
     */
    textures: string[];
    /**
     * Defines the list of scene's materials.
     */
    materials: {
        /**
         * Defines the list of ids of meshes that have this material assigned.
         */
        bindedMeshes: string[];
        /**
         * Defines the JSON representation of the material.
         */
        json: string;
        /**
         * Defines wether or not the material is a multi material.
         */
        isMultiMaterial: boolean;
    }[];
    /**
     * Defines the list of scene's meshes.
     */
    meshes: string[];
    /**
     * Defines the list of scene's transform nodes.
     */
    transformNodes: string[];
    /**
     * Defines the list of scene's particle systems.
     */
    particleSystems?: string[];
    /**
     * Defines the list of scene's lights
     */
    lights: {
        /**
         * Defines the JSON representation of the light
         */
        json: string;
        /**
         * Defines the JSON representation of the shadow generator of the light.
         */
        shadowGenerator: Undefinable<string>;
    }[];
    /**
     * Defines the list of scene's sounds.
     */
    sounds?: string[];
    /**
     * Saves the scene's settings.
     */
    scene: any;
    /**
     * Defines all the informations about assets.
     */
    assets: {
        /**
         * Defines all the informations about the meshes assets.
         */
        meshes: string[];
        /**
         * Defines all the informations about the prefabs assets.
         */
        prefabs: Undefinable<string[]>;
        /**
         * Defines all the graphs available in the project.
         */
        graphs: Undefinable<string[]>;
    };
    /**
     * Defines some useful datas
     */
    project: {
        /**
         * Defines the current configuration of the editor camera.
         */
        camera: any
    };
    /**
     * Defines the configurations of all post-processes.
     */
    postProcesses: {
        /**
         * Defines the configuration of the SSAO.
         */
        ssao: {
            /**
             * Defines wether or not SSAO is enabled.
             */
            enabled: boolean;
            /**
             * Defines the JSON representation of the post-process
             */
            json: any;
        };
        /**
         * Defines the configuration of the SSR post-process
         */
        screenSpaceReflections?: {
            /**
             * Defines wether or not SSR is enabled.
             */
            enabled: boolean;
            /**
             * Defines the JSON representation of the post-process
             */
            json: any;
        }
        /**
         * Defines the configuration of the default pipeline.
         */
        default: {
            /**
             * Defines wether or not Default Pipeline is enabled.
             */
            enabled: boolean;
            /**
             * Defines the JSON representation of the post-process
             */
            json: any;
        };
        /**
         * Defines the configuration of the motion blur post-process.
         */
        motionBlur?: {
            /**
             * Defines wether or not motion blur is enabled.
             */
            enabled: boolean;
            /**
             * Defines the JSON representation of the post-process
             */
            json: any;
        }
    };
}

/**
 * Defines partial typings of the .babylon file nodes.
 */
export interface IBabylonFileNode {
    id: string;
    parentId: Undefinable<string>;
    metadata: any;
}

/**
 * Defines partial typings of the .babylon file.
 */
export interface IBabylonFile {
    meshes: (IBabylonFileNode & {
        materialId: Undefinable<string>;
        instances: (IBabylonFileNode & {

        })[];
    })[];
    lights: (IBabylonFileNode & {

    })[];
    particleSystems: [];
}