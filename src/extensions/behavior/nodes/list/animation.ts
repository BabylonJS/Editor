import { Node } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { registerNode } from '../graph-node';

/**
 * Registers all the available animation nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllAnimationNodes (object?: any): void {
    registerNode({ name: 'Play Animations', description: 'Plays the animations of the current node.', path: 'animation/play', ctor: Node, functionRef: (node, target: Node) => {
        const scene = target.getScene();
        scene.beginAnimation(
            target,
            node.properties['From'],
            node.properties['To'],
            node.properties['Loop'],
            node.properties['Speed'],
            () => node.triggerSlot(0),
            null, null, null,
            () => node.triggerSlot(1)
        );
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT }
    ], properties: [
        { name: 'From', type: 'number', defaultValue: 0 },
        { name: 'To', type: 'number', defaultValue: 60 },
        { name: 'Speed', type: 'number', defaultValue: 1 },
        { name: 'Loop', type: 'boolean', defaultValue: false }
    ], outputs: [
        { name: 'On End', type: LiteGraph.EVENT },
        { name: 'On Loop', type: LiteGraph.EVENT }
    ] }, object);

    registerNode({ name: 'Stop Animations', description: 'Stops the currently playing animations of the current node.', path: 'animation/stop', ctor: Node, functionRef: (node, target: Node) => {
        const scene = target.getScene();
        scene.stopAnimation(target);
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT }
    ] }, object);
}
