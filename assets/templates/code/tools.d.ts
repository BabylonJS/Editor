interface IScript {
    start?: () => void;
    update?: () => void;
    [index: string]: any;
}

declare type ScriptConstructor = new () => IScript;
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
    getFileByName (name: string): File;
    getFileUrl (filename: string, oneTimeOnly?: boolean): string;
    getPathFinder (name: string): PathFinder;
}
