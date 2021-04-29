import { Undefinable, IStringDictionary } from "../../../shared/types";

import { KTXToolsType } from "../tools/ktx";

/**
 * Defines the type the possible values of the physics engine type string
 * store in the workspace JSON file.
 */
export type PhysicsEngineType = "cannon" | "oimo" | "ammo";

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
     * Defines the physics engine that should be used by the project.
     */
    physicsEngine?: PhysicsEngineType;
    /**
     * Defines the dictionary that contains the preferences of external plugins in the editor.
     */
    pluginsPreferences?: Undefinable<IStringDictionary<any>>;

    /**
     * Defines the options of the KTX2 compression tool.
     */
    ktx2CompressedTextures?: {
        /**
         * Defines wether or not ktx2 compressed texture is enabled or not.
         */
        enabled?: boolean;
        /**
         * Defines the path to the PVRTexToolCLI program executed to 
         */
        pvrTexToolCliPath?: string;
        /**
         * Defines the optional format forced to be used when exporting the scene.
         */
        forcedFormat?: "automatic" | KTXToolsType;

        /**
         * Defines the options of the ASTC format.
         */
        astcOptions?: {
            /**
             * Defines the quality of the ASTC generated textures.
             */
            quality?: "astcveryfast" | "astcfast" | "astcmedium" | "astcthorough" | "astcexhaustive";
        };

        /**
         * Defines the options of the PVRTC format.
         */
        pvrtcOptions?: {
            /**
             * Defines the quality of the PVRTC generated textures.
             */
            quality?: "pvrtcfastest" | "pvrtcfast" | "pvrtclow" | "pvrtcnormal" | "pvrtchigh" | "pvrtcveryhigh" | "pvrtcthorough" | "pvrtcbest";
        };

        /**
         * Defines the options of the ETC1 format
         */
        ect1Options?: {
            /**
             * Defines wether or not ETC1 is enabled.
             */
            enabled?: boolean;
            /**
             * Defines the quality of the ETC1 generated textures.
             */
            quality: "etcfast" | "etcnormal" | "etcslow";
        };

        /**
         * Defines the options of the ETC2 format
         */
        ect2Options?: {
            /**
             * Defines wether or not ETC2 is enabled.
             */
            enabled?: boolean;
            /**
             * Defines the quality of the ETC2 generated textures.
             */
            quality: "etcfast" | "etcnormal" | "etcslow";
        };
    };
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
     * Defines the list of all scene's morph target managers.
     */
    morphTargetManagers?: string[];
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

    /**
     * Defines wether or not the physics is enabled in the project.
     */
    physicsEnabled?: boolean;
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