import { Nullable } from "../../../shared/types";

import {
    Scene, SerializationHelper, SceneLoader,
    Color4, Color3, Vector3, Texture,
    CannonJSPlugin, OimoJSPlugin, AmmoJSPlugin, BabylonFileLoaderConfiguration, IPhysicsEnginePlugin,
} from "babylonjs";

export class ProjectHelpers {
    /**
     * Exports the settings of the given scene.
     * @param scene the scene reference to export settings.
     */
    public static ExportSceneSettings(scene: Scene): any {
        const serializationObject: any = { };
        
        // Scene
        serializationObject.useDelayedTextureLoading = scene.useDelayedTextureLoading;
        serializationObject.autoClear = scene.autoClear;
        serializationObject.clearColor = scene.clearColor.asArray();
        serializationObject.ambientColor = scene.ambientColor.asArray();
        serializationObject.gravity = scene.gravity.asArray();
        serializationObject.collisionsEnabled = scene.collisionsEnabled;

        // Fog
        serializationObject.fogEnabled = scene.fogEnabled;
        if (scene.fogMode && scene.fogMode !== 0) {
            serializationObject.fogMode = scene.fogMode;
            serializationObject.fogColor = scene.fogColor.asArray();
            serializationObject.fogStart = scene.fogStart;
            serializationObject.fogEnd = scene.fogEnd;
            serializationObject.fogDensity = scene.fogDensity;
        }

        //Physics
        if (scene.isPhysicsEnabled()) {
            let physicEngine = scene.getPhysicsEngine();

            if (physicEngine) {
                serializationObject.physicsEnabled = true;
                serializationObject.physicsGravity = physicEngine.gravity.asArray();
                serializationObject.physicsEngine = physicEngine.getPhysicsPluginName();
            }
        }

        // Image processing
        serializationObject.imageProcessingConfiguration = scene.imageProcessingConfiguration.serialize();

        // Animations
        SerializationHelper.AppendSerializedAnimations(scene, serializationObject);

        // Flags
        serializationObject.postProcessesEnabled = scene.postProcessesEnabled;

        // Animation Groups
        if (scene.animationGroups && scene.animationGroups.length > 0) {
            serializationObject.animationGroups = [];
            for (let animationGroupIndex = 0; animationGroupIndex < scene.animationGroups.length; animationGroupIndex++) {
                const animationGroup = scene.animationGroups[animationGroupIndex];

                serializationObject.animationGroups.push(animationGroup.serialize());
            }
        }

        // Environment Intensity
        serializationObject.environmentTexture = scene.environmentTexture?.serialize();
        serializationObject.environmentIntensity = scene.environmentIntensity;

        // Components
        for (const component of scene._serializableComponents) {
            component.serialize(serializationObject);
        }

        return serializationObject;
    }

    /**
     * Imports the scene settings according to the given parsed scene settings.
     * @param scene the scene reference to configure.
     * @param parsedData the data coming from the exported project containing the scene's settings.
     * @param rootUrl the root url where to find the assets (textures, etc.).
     */
    public static ImportSceneSettings(scene: Scene, parsedData: any, rootUrl: string): void {
        // Scene
        if (parsedData.useDelayedTextureLoading !== undefined && parsedData.useDelayedTextureLoading !== null) {
            scene.useDelayedTextureLoading = parsedData.useDelayedTextureLoading && !SceneLoader.ForceFullSceneLoadingForIncremental;
        }
        if (parsedData.autoClear !== undefined && parsedData.autoClear !== null) {
            scene.autoClear = parsedData.autoClear;
        }
        if (parsedData.clearColor !== undefined && parsedData.clearColor !== null) {
            scene.clearColor = Color4.FromArray(parsedData.clearColor);
        }
        if (parsedData.ambientColor !== undefined && parsedData.ambientColor !== null) {
            scene.ambientColor = Color3.FromArray(parsedData.ambientColor);
        }
        if (parsedData.gravity !== undefined && parsedData.gravity !== null) {
            scene.gravity = Vector3.FromArray(parsedData.gravity);
        }

        // Fog
        scene.fogEnabled = parsedData.fogEnabled;
        if (parsedData.fogMode && parsedData.fogMode !== 0) {
            scene.fogMode = parsedData.fogMode;
            scene.fogColor = Color3.FromArray(parsedData.fogColor);
            scene.fogStart = parsedData.fogStart;
            scene.fogEnd = parsedData.fogEnd;
            scene.fogDensity = parsedData.fogDensity;
        }

        if (parsedData.physicsEnabled) {
            if (!scene.getPhysicsEngine()) {
                let physicsPlugin: Nullable<IPhysicsEnginePlugin> = null;
                if (parsedData.physicsEngine === "cannon") {
                    physicsPlugin = new CannonJSPlugin(undefined, undefined, BabylonFileLoaderConfiguration.LoaderInjectedPhysicsEngine);
                } else if (parsedData.physicsEngine === "oimo") {
                    physicsPlugin = new OimoJSPlugin(undefined, BabylonFileLoaderConfiguration.LoaderInjectedPhysicsEngine);
                } else if (parsedData.physicsEngine === "ammo") {
                    physicsPlugin = new AmmoJSPlugin(undefined, BabylonFileLoaderConfiguration.LoaderInjectedPhysicsEngine, undefined);
                }

                if (physicsPlugin) {
                    scene.enablePhysics(Vector3.Zero(), physicsPlugin);
                }
            }

            const physicsEngine = scene.getPhysicsEngine();
            if (physicsEngine) {
                physicsEngine.setGravity(Vector3.FromArray(parsedData.physicsGravity));
            }
        }

        // Image processing
        SerializationHelper.Parse(() => scene.imageProcessingConfiguration, parsedData.imageProcessingConfiguration, scene, null);

        // Flags
        scene.postProcessesEnabled = parsedData.postProcessesEnabled;

        // Environment
        if (parsedData.environmentIntensity !== undefined) { scene.environmentIntensity = parsedData.environmentIntensity; }
        if (parsedData.environmentTexture !== undefined) { scene.environmentTexture = Texture.Parse(parsedData.environmentTexture, scene, rootUrl); }

        // Collisions, if defined. otherwise, default is true
        if (parsedData.collisionsEnabled !== undefined && parsedData.collisionsEnabled !== null) {
            scene.collisionsEnabled = parsedData.collisionsEnabled;
        }

        if (parsedData.autoAnimate) {
            scene.beginAnimation(scene, parsedData.autoAnimateFrom, parsedData.autoAnimateTo, parsedData.autoAnimateLoop, parsedData.autoAnimateSpeed || 1.0);
        }
    }
}