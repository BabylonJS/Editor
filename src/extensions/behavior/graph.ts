import { Scene, AbstractMesh, Light, Camera, Vector3 } from 'babylonjs';
import { LGraph, LiteGraph } from 'litegraph.js';

import Extensions from '../extensions';
import Extension from '../extension';

import { GetPosition, SetPosition } from './graph-nodes/node/position';
import { GetRotation, SetRotation } from './graph-nodes/node/rotation';
import { GetScale, SetScale } from './graph-nodes/node/scale';
import { RenderLoop } from './graph-nodes/core/engine';
import { GetProperty, SetProperty } from './graph-nodes/basic/set-property';

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
        this.datas = data;

        // Register
        GraphExtension.RegisterNodes();

        // For each node
        this.datas.forEach(d => {
            const node = this.scene.getNodeByName(d.node);
            if (!node)
                return;

            // For each graph
            d.metadatas.forEach(m => {
                if (!m.active)
                    return;
                
                const graph = new LGraph();
                graph.scriptObject = node;
                graph.scriptScene = this.scene;

                graph.configure(m.graph);

                this.scene.onReadyObservable.addOnce(() => {
                    graph.start();
                });
            });
        });
    }

    /**
     * Called by the editor when serializing the scene
     */
    public onSerialize (): BehaviorMetadata[] {
        const result: BehaviorMetadata[] = [];
        const add = (objects: (AbstractMesh | Light | Camera)[]) => {
            objects.forEach(o => {
                if (o.metadata && o.metadata['behaviorGraph'])
                    result.push(o.metadata['behaviorGraph']);
            });
        };

        add(this.scene.meshes);
        add(this.scene.lights);
        add(this.scene.cameras);

        return result;
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public onLoad (data: BehaviorMetadata[]): void {
        this.datas = data;
        
        // For each node
        this.datas.forEach(d => {
            const node = this.scene.getNodeByName(d.node);
            if (!node)
                return;

            node.metadata = node.metadata || { };
            node.metadata['behaviorGraph'] = d;
        });
    }

    /**
     * Clears all the additional nodes available for Babylon.js
     */
    public static ClearNodes (): void {
        const available = ['node', 'scene', 'core', 'basic/script'];
        const keys = Object.keys(LiteGraph.registered_node_types);

        keys.forEach(k => {
            const split = k.split('/');
            if (available.indexOf(split[0]) !== -1 || available.indexOf(k) !== -1)
                delete LiteGraph.registered_node_types[k];
        });
    }

    /**
     * Registers all the additional nodes available for Babylon.js
     * @param object the object being 
     */
    public static RegisterNodes (object?: any): void {
        // Unregister all except:
        const available = ['node', 'scene', 'math', 'math3d', 'basic'];
        const keys = Object.keys(LiteGraph.registered_node_types);

        keys.forEach(k => {
            const split = k.split('/');
            if (available.indexOf(split[0]) === -1)
                delete LiteGraph.registered_node_types[k];
        });

        // Register custom
        RenderLoop.Register('core/renderloop', RenderLoop);

        GetProperty.Register('basic/getproperty', GetProperty);
        SetProperty.Register('basic/setproperty', SetProperty);

        if (!object || object.position && object.position instanceof Vector3) {
            GetPosition.Register('node/getposition', GetPosition);
            SetPosition.Register('node/setposition', SetPosition);
        }

        if (!object || object.rotation && object.rotation instanceof Vector3) {
            GetRotation.Register('node/getrotation', GetRotation);
            SetRotation.Register('node/setrotation', SetRotation);
        }

        if (!object || object.scaling && object.scaling instanceof Vector3) {
            GetScale.Register('node/getscale', GetScale);
            SetScale.Register('node/setscale', SetScale);
        }
    }
}

// Register
Extensions.Register('BehaviorGraphExtension', GraphExtension);
