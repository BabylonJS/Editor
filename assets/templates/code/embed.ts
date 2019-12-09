/**
 * Generated interface defining an attached script
 */
export interface IEmbededScript {
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
export default class GeneratedScripts {
    /**
     * Defines the array of all available scripts.
     */
    public static Scripts: IEmbededScript[] = [];
}

if (window) { window['GeneratedScripts'] = GeneratedScripts; }
