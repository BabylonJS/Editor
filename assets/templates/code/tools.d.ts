interface IScript {
    start: () => void;
    update: () => void;
}

interface ICustomMaterial extends CustomMaterial {

}

interface ICustomPostProcess extends CustomPostProcess {

}

/**
 * Main interface
 */
interface BehaviorCodeTools {
    getCustomScript (object: any, name: string): IScript;
    getCustomMaterial (name: string): ICustomMaterial;
    getCustomPostProcess (name: string): ICustomPostProcess;
    getFileByName (name: string): File;
}
