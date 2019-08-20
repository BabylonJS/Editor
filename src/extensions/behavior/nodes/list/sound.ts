import { Scene, Sound } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { registerNode, GraphNode } from '../graph-node';

/**
 * Registers all the available sound nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllSoundNodes (object?: any): void {
    const getSound =  ((node: GraphNode, scene: Scene): Sound => {
        const input = node.getInputData<string>(1);
        return scene.getSoundByName(input || node.properties['Sound Name']);
    });

    registerNode({ name: 'Play Sound', description: 'Plays the given sound', path: 'sound/play', ctor: Object, functionRef: (node, target, scene) => {
        const sound = getSound(node, scene);
        if (sound)
            sound.play();
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Sound Name', type: 'string' }
    ], properties: [
        { name: 'Sound Name', type: 'string', defaultValue: 'None' }
    ], drawBackground: (node) => node.properties['Sound Name'] }, object);

    registerNode({ name: 'Pause Sound', description: 'Pauses the given sound', path: 'sound/pause', ctor: Object, functionRef: (node, target, scene) => {
        const sound = getSound(node, scene);
        if (sound)
            sound.pause();
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Sound Name', type: 'string' }
    ], properties: [
        { name: 'Sound Name', type: 'string', defaultValue: 'None' }
    ], drawBackground: (node) => node.properties['Sound Name'] }, object);

    registerNode({ name: 'Stop Sound', description: 'Stops the given sound', path: 'sound/stop', ctor: Object, functionRef: (node, target, scene) => {
        const sound = getSound(node, scene);
        if (sound)
            sound.stop();
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Sound Name', type: 'string' }
    ], properties: [
        { name: 'Sound Name', type: 'string', defaultValue: 'None' }
    ], drawBackground: (node) => node.properties['Sound Name'] }, object);
}
