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
    getCustomScript (objectName: string | BABYLON.Node | BABYLON.Scene | BABYLON.ParticleSystem, name: string): IScript;
    getCustomMaterial (name: string): ICustomMaterial;
    getCustomPostProcess (name: string): ICustomPostProcess;
    getConstructor (name: string): any;
    getFileByName (name: string): File;
    getFileUrl (filename: string, oneTimeOnly?: boolean): string;
    getPathFinder (name: string): PathFinder;
    instantiatePrefab<T extends BABYLON.Node> (name: string): T;
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
