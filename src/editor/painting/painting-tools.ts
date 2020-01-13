import Editor from '../editor';
import { IStringDictionary } from '../typings/typings';

import MeshPainter from './mesh-painter';
import TerrainPainter from './terrain-painter';

export interface IPaintingTool {
    /**
     * Gets wether or not the tool is enabled.
     */
    enabled: boolean;
    /**
     * Sets wether or not the tool is enabled.
     * @param enabled wether or not the tool is enabled.
     */
    setEnabled (enabled: boolean): void;
}

export interface PaintingToolStore {
    /**
     * The constructor refernce of the tool.
     */
    ctor: (new (editor: Editor) => IPaintingTool);
    /**
     * The instanceo of the tool.
     */
    instance: IPaintingTool;
}

export enum AvailablePaintingTools {
    MeshPainter = "MeshPainter",
    TerrainPainter = "TerrainPainter"
}

export default class PaintingTools {
    /**
     * Defines all the available tools.
     */
    public static Constructors: IStringDictionary<PaintingToolStore> = { };

    /**
     * The reference of the last tool used.
     */
    public lastTool: IPaintingTool = null;

    /**
     * Constructor.
     * @param editor the editor reference.
     */
    constructor (public editor: Editor) {
        this.addTool(AvailablePaintingTools.MeshPainter, MeshPainter);
        this.addTool(AvailablePaintingTools.TerrainPainter, TerrainPainter);
    }

    /**
     * Adds a new available tool on the fly by giving its name and its constructor.
     * @param name the name of the tool to add.
     * @param ctor the constructor reference of the tool.
     */
    public addTool (name: string, ctor: new (editor: Editor) => IPaintingTool): void {
        if (PaintingTools.Constructors[name])
            return;

        PaintingTools.Constructors[name] = {
            ctor: ctor,
            instance: null
        };
    }

    /**
     * Returns the given tool reference.
     * @param name the name of the tool to get.
     */
    public getTool (name: string): IPaintingTool {
        const store = PaintingTools.Constructors[name];
        if (!store)
            return null;

        if (!store.instance)
            store.instance = new store.ctor(this.editor);

        return store.instance;
    }

    /**
     * Enables the given tool.
     * @param name the name of the tool to enable.
     */
    public enableTool (name: string): IPaintingTool {
        if (this.lastTool && this.lastTool !== PaintingTools.Constructors[name].instance)
            this.lastTool.setEnabled(false);
        
        const tool = this.lastTool = this.getTool(name);
        tool.setEnabled(!tool.enabled);

        return tool;
    }
}
