import { Scene } from 'babylonjs';
import { LGraph, LGraphCanvas } from 'litegraph.js';

import Extensions from '../extensions';
import Extension from '../extension';

import { GetPosition, SetPosition } from './graph-nodes/position';

// Interfaces
export interface BehaviorGraph {
    graph: any;
    name: string;
    active: boolean;
}

export interface BehaviorMetadata {
    node: string;
    metadatas: BehaviorGraph[];
}

// Code extension class
export default class GraphExtension extends Extension<BehaviorMetadata[]> {
    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = [];
    }

    /**
     * On apply the extension
     */
    public onApply (data: BehaviorMetadata[]): void {

    }

    /**
     * Called by the editor when serializing the scene
     */
    public onSerialize (): BehaviorMetadata[] {
        return [];
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public onLoad (data: BehaviorMetadata[]): void {

    }

    /**
     * 
     * @param graph the graph to register
     */
    public static RegisterNodes (graph: LGraph, node?: any): void {
        GetPosition.Register(graph, node);
        SetPosition.Register(graph, node);
    }
}

// Register
Extensions.Register('BehaviorGraphExtension', GraphExtension);
