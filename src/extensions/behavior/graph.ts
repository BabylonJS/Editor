import { Scene, AbstractMesh, Light, Camera, Vector3 } from 'babylonjs';
import { LGraph, LiteGraph } from 'litegraph.js';

import Extensions from '../extensions';
import Extension from '../extension';

import { AssetElement } from '../typings/asset';

import { GetPosition, SetPosition } from './graph-nodes/node/position';
import { GetRotation, SetRotation } from './graph-nodes/node/rotation';
import { GetScale, SetScale } from './graph-nodes/node/scale';
import { GetAmbientColor, SetAmbientColor } from './graph-nodes/scene/ambient-color';
import { GetClearColor, SetClearColor } from './graph-nodes/scene/clear-color';
import { RenderLoop, RenderStart } from './graph-nodes/render/engine';
import { GetProperty, SetProperty } from './graph-nodes/properties/property';
import { Condition } from './graph-nodes/logic/condition';
import { PointerOver, PointerDown, PointerOut } from './graph-nodes/event/pointer';
import { PlayAnimations, StopAnimations } from './graph-nodes/action/animation';
import { Number, String, Boolean } from './graph-nodes/basic/const';
import { Color } from './graph-nodes/basic/color';

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
    // Public members
    public id: string = 'GraphExtension';
    public assetsCaption: string = 'Graphs';

    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = [];
    }

    /**
     * On get all the assets to be drawn in the assets component
     */
    public onGetAssets<BehaviorCode> (): AssetElement<BehaviorCode>[] {
        const result: AssetElement<BehaviorCode>[] = [];
        const data = this.onSerialize();

        data.forEach(d => {
            d.metadatas.forEach(d => {
                result.push({
                    name: d.name,
                    data: <any> d
                });
            });
        });

        return result;
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
            const node = d.node === 'Scene' ? this.scene : this.scene.getNodeByName(d.node);
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

                // On ready
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
        const add = (objects: (AbstractMesh | Light | Camera | Scene)[]) => {
            objects.forEach(o => {
                if (o.metadata && o.metadata.behaviorGraph)
                    result.push(o.metadata.behaviorGraph);
            });
        };

        add([this.scene]);
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
            const node = d.node === 'Scene' ? this.scene : this.scene.getNodeByName(d.node);
            if (!node)
                return;

            node.metadata = node.metadata || { };
            node.metadata.behaviorGraph = d;
        });
    }

    /**
     * Clears all the additional nodes available for Babylon.js
     */
    public static ClearNodes (): void {
        const available = [
            'node', 'scene', 'core', 'logic',
            'basic/script', 'basic/const',
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
     * @param object the object which is attached
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
        Number.Register('basic/number', Number);
        String.Register('basic/string', String);
        Boolean.Register('basic/boolean', Boolean);

        Color.Register('basic/color', Color);

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

        GetProperty.Register('property/get', GetProperty);
        SetProperty.Register('property/set', SetProperty);

        if (!object || object instanceof Scene) {
            GetClearColor.Register('scene/getclearcolor', GetClearColor);
            SetClearColor.Register('scene/setclearcolor', SetClearColor);

            GetAmbientColor.Register('scene/getambientcolor', GetAmbientColor);
            SetAmbientColor.Register('scene/setambientcolor', SetAmbientColor);
        }

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
