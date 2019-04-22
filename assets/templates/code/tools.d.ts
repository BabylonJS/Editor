interface IScript {
    start?: () => void;
    update?: () => void;
    dispose?: () => void;
    [index: string]: any;
}

declare type ScriptConstructor = new (...args: any[]) => IScript;
declare type CustomizableParams = number | string |
                                  BABYLON.Vector3 | BABYLON.Vector2 | BABYLON.Vector4 |
                                  BABYLON.Color3 | BABYLON.Color4;

/**
 * Exports the given scripts
 * @param ctor the constructor reference of the script
 * @param params the parameters being visible in the editor to be customized using the edition tool
 */
declare var exportScript: (ctor: ScriptConstructor, params?: { [index: string]: CustomizableParams }) => ScriptConstructor | { ctor: ScriptConstructor };

interface ICustomMaterial {
    code: CustomMaterial;
    material: BABYLON.PushMaterial;
}

interface ICustomPostProcess {
    code: CustomPostProcess;
    postprocess: BABYLON.PostProcess;
}

/**
 * Main interface
 */
interface BehaviorCodeTools {
    /**
     * Returns a custom material by giving its name
     * @param name the name of the custom material
     */
    getCustomScript<T extends IScript> (objectName: string | any, name: string): T;
    /**
     * Returns a custom script given by its object attached to
     * and the name of the script
     * @param object the object containing the script
     * @param name the name of the script
     */
    getCustomMaterial (name: string): ICustomMaterial;
    /**
     * Returns the constructor of a script which has the given name
     * @param name the name of the script
     */
    getCustomPostProcess (name: string): ICustomPostProcess;
    /**
     * Returns the post-process by giving its name
     * @param name the name of the post-process
     */
    getConstructor (name: string): any;
    /**
     * Returns a file given by its name
     * @param name the name of the file
     */
    getFileByName (name: string): File;
    /**
     * Returns an object url for the given file
     * @param filename the reachable by the created URL
     * @param oneTimeOnly if the URL should be requested only one time
     */
    getFileUrl (filename: string, oneTimeOnly?: boolean): string;
    /**
     * Returns the given path finder according to the given name
     * @param name the name of the path finder
     */
    getPathFinder (name: string): PathFinder;
    /**
     * Instantiate a prefab identified by the given name
     * @param name the name of the prefab to instantiate
     */
    instantiatePrefab<T> (name: string): T;
    /**
     * Calls the given method with the given parameters on the given object which has scripts providing the given method
     * @param object the object reference where to send the message by calling the given method name
     * @param methodName the method name to call with the given parameters
     * @param params the parameters to send to the script attached to the given object
     */
    sendMessage (object: any, methodName: string, ...params: any[]): void;
}

/**
 * Declaration
 */
declare var scene: BABYLON.Scene;
declare var mesh: BABYLON.Mesh;
declare var pointlight: BABYLON.PointLight;
declare var camera: BABYLON.Camera;
declare var universalcamera: BABYLON.UniversalCamera;
declare var spotlight: BABYLON.SpotLight;
declare var dirlight: BABYLON.DirectionalLight;
declare var hemlight: BABYLON.HemisphericLight;
declare var groundmesh: BABYLON.GroundMesh;
declare var particleSystem: BABYLON.ParticleSystem;
declare var gpuParticleSystem: BABYLON.GPUParticleSystem;

declare var tools: BehaviorCodeTools;
