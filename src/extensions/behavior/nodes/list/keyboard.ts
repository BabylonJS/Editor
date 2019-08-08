import { Node, KeyboardInfo, KeyboardEventTypes } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { registerNode } from '../graph-node';
import { IGraphNode } from '../types';

/**
 * Registers all the available keyboard nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllKeyboardNodes (object?: any): void {
    const checkKeyboardEvent = ((node: IGraphNode, target: Node, ev: KeyboardInfo, type: KeyboardEventTypes): boolean => {
        if (ev.type !== type)
            return;
        
        const hasControl = ev.event.ctrlKey || ev.event.metaKey;
        const isKey = ev.event.key.toLowerCase() === node.properties['Key'].toLowerCase();
        return (isKey && !node.properties['Check Control']) || (isKey && node.properties['Check Control'] && hasControl);
    });

    registerNode({ name: 'Keyboard Down', description: 'Triggers on a keyboard key is down', path: 'events/keyboarddown', ctor: Node, functionRef: (node, target: Node, scene) => {
        node.store.wasDown = node.store.wasDown || false;
        node.store.observer = node.store.observer || scene.onKeyboardObservable.add(ev => {
            node.store.wasDown = checkKeyboardEvent(node, target, ev, KeyboardEventTypes.KEYDOWN);
        });
        if (node.store.wasDown)
            node.triggerSlot(0);
    }, outputs: [
        { name: 'Key Down', type: LiteGraph.EVENT }
    ], properties: [
        { name: 'Key', type: 'string', defaultValue: 'a' },
        { name: 'Check Control', type: 'boolean', defaultValue: false }
    ] }, object);

    registerNode({ name: 'Keyboard Up', description: 'Triggers on a keyboard key is up', path: 'events/keyboardup', ctor: Node, functionRef: (node, target: Node, scene) => {
        node.store.observer = node.store.observer || scene.onKeyboardObservable.add(ev => {
            checkKeyboardEvent(node, target, ev, KeyboardEventTypes.KEYUP) && node.triggerSlot(0);
        });
    }, outputs: [
        { name: 'Key Up', type: LiteGraph.EVENT }
    ], properties: [
        { name: 'Key', type: 'string', defaultValue: 'a' },
        { name: 'Check Control', type: 'boolean', defaultValue: false }
    ] }, object);
}
