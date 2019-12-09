/**
 * Generated interface defining an attached script
 */
export interface IEmbededPostProcess {
    /**
     * The constructor reference of the script.
     */
    ctor: (new (...args: any[]) => any);
    /**
     * The id of the script.
     */
    id: string;
}

/**
 * Generated class that will store all scripts attached to nodes in the editor..
 */
export default class GeneratedPostProcesses {
    /**
     * Defines the array of all available scripts.
     */
    public static Scripts: IEmbededPostProcess[] = [];
}

if (window) { window['GeneratedPostProcesses'] = GeneratedPostProcesses; }
