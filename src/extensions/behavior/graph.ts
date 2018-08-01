import { Scene, AbstractMesh, Light, Camera, Vector3 } from 'babylonjs';
import { LGraph, LiteGraph } from 'litegraph.js';

import Extensions from '../extensions';
import Extension from '../extension';

import { GetPosition, SetPosition } from './graph-nodes/node/position';
import { GetRotation, SetRotation } from './graph-nodes/node/rotation';
import { GetScale, SetScale } from './graph-nodes/node/scale';
import { RenderLoop, RenderStart } from './graph-nodes/render/engine';
import { GetProperty, SetProperty } from './graph-nodes/basic/property';
import { Condition } from './graph-nodes/logic/condition';
import { PointerOver, PointerDown, PointerOut } from './graph-nodes/event/pointer';
import { PlayAnimations, StopAnimations } from './graph-nodes/action/animation';

import { LiteGraphNode } from './graph-nodes/typings';

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

                // On ready
                this.scene.onReadyObservable.addOnce(() => {
                    graph.start();
                });

                // Render loop
                const nodes = <LiteGraphNode[]> graph._nodes;
                nodes.forEach(n => {
                    if (n instanceof RenderLoop) {
                        this.scene.onAfterRenderObservable.add(() => n.onExecute());
                    }
                    else if (n instanceof RenderStart) {
                        this.scene.onAfterRenderObservable.addOnce(() => n.onExecute());
                    }
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
        const available = [
            'node', 'scene', 'core', 'logic',
            'basic/script',
            'math/compare', 'math/condition', 'math/formula', 'math/converter', 'math/range'
        ];
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
        const available = ['node', 'scene', 'math', 'math3d', 'basic', 'graph', 'logic'];
        const keys = Object.keys(LiteGraph.registered_node_types);

        keys.forEach(k => {
            const split = k.split('/');
            if (available.indexOf(split[0]) === -1 && available.indexOf(k) === -1)
                delete LiteGraph.registered_node_types[k];
        });

        // Register custom
        RenderStart.Register('render/renderstarts', RenderStart);
        RenderLoop.Register('render/renderloop', RenderLoop);

        Condition.Register('logic/condition', Condition);

        if (!object || object instanceof AbstractMesh) {
            PointerOver.Register('event/pointerover', PointerOver);
            PointerDown.Register('event/pointerdown', PointerDown);
            PointerOut.Register('event/pointerout', PointerOut);
        }

        PlayAnimations.Register('action/playanimations', PlayAnimations);
        StopAnimations.Register('action/stopanimations', StopAnimations);

        GetProperty.Register('node/getproperty', GetProperty);
        SetProperty.Register('node/setproperty', SetProperty);

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
