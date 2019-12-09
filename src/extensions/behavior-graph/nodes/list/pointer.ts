import { Scene, AbstractMesh, PointerEventTypes, PointerInfo } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { IGraphNode } from '../types';
import { registerNode } from '../graph-node';

/**
 * Registers all the available pointer nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllPointerNodes (object?: any): void {
    const checkPointerEvent = ((node: IGraphNode, target: AbstractMesh, scene: Scene, ev: PointerInfo, type: PointerEventTypes): boolean => {
        if (ev.type !== type)
            return;
        
        const pick = scene.pick(scene.pointerX, scene.pointerY);
        return pick.pickedMesh === target;
    });

    registerNode({ name: 'Pointer Down', description: 'Triggers on the node has been clicked.', path: 'events/pointerdown', ctor: AbstractMesh, functionRef: (node, target: AbstractMesh, scene) => {
        node.store.observer = node.store.observer || scene.onPointerObservable.add(ev => {
            checkPointerEvent(node, target, scene, ev, PointerEventTypes.POINTERDOWN) && node.triggerSlot(0);
        });
    }, outputs: [
        { name: 'Clicked', type: LiteGraph.EVENT }
    ], onStop: (node, target, scene) => {
        node.store.observer && scene.onPointerObservable.remove(node.store.observer);
    } }, object);

    registerNode({ name: 'Pointer Move', description: 'Triggers on the pointer moves on the node.', path: 'events/pointermove', ctor: AbstractMesh, functionRef: (node, target: AbstractMesh, scene) => {
        node.store.observer = node.store.observer || scene.onPointerObservable.add(ev => {
            checkPointerEvent(node, target, scene, ev, PointerEventTypes.POINTERMOVE) && node.triggerSlot(0);
        });
    }, outputs: [
        { name: 'Moved', type: LiteGraph.EVENT }
    ], onStop: (node, target, scene) => {
        node.store.observer && scene.onPointerObservable.remove(node.store.observer);
    } }, object);

    registerNode({ name: 'Pointer Up', description: 'Triggers on the pointer is up on the node.', path: 'events/pointerup', ctor: AbstractMesh, functionRef: (node, target: AbstractMesh, scene) => {
        node.store.observer = node.store.observer || scene.onPointerObservable.add(ev => {
            checkPointerEvent(node, target, scene, ev, PointerEventTypes.POINTERUP) && node.triggerSlot(0);
        });
    }, outputs: [
        { name: 'Up', type: LiteGraph.EVENT }
    ], onStop: (node, target, scene) => {
        node.store.observer && scene.onPointerObservable.remove(node.store.observer);
    } }, object);

    registerNode({ name: 'Pointer Over', description: 'Triggers on the pointer is over the node.', path: 'events/pointerover', ctor: AbstractMesh, functionRef: (node, target: AbstractMesh, scene) => {
        node.store.wasOver = node.store.wasOver || false;
        node.store.observer = node.store.observer || scene.onPointerObservable.add(ev => {
            node.store.wasOver = checkPointerEvent(node, target, scene, ev, PointerEventTypes.POINTERMOVE);
        });
        if (node.store.wasOver)
            node.triggerSlot(0);
    }, outputs: [
        { name: 'Over', type: LiteGraph.EVENT }
    ], onStop: (node, target, scene) => {
        node.store.observer && scene.onPointerObservable.remove(node.store.observer);
    } }, object);

    registerNode({ name: 'Pointer Out', description: 'Triggers on the pointer is out of the node.', path: 'events/pointerout', ctor: AbstractMesh, functionRef: (node, target: AbstractMesh, scene) => {
        node.store.wasOver = node.store.wasOver || false;
        node.store.observer = node.store.observer || scene.onPointerObservable.add(ev => {
            const isOver = node.store.wasOver;
            node.store.wasOver = checkPointerEvent(node, target, scene, ev, PointerEventTypes.POINTERMOVE);
            if (isOver && !node.store.wasOver)
                node.triggerSlot(0);
        });
    }, outputs: [
        { name: 'Out', type: LiteGraph.EVENT }
    ], onStop: (node, target, scene) => {
        node.store.observer && scene.onPointerObservable.remove(node.store.observer);
    } }, object);
}
