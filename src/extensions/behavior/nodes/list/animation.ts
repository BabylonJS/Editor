import { Node, Animation } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { registerNode, GraphNode } from '../graph-node';

/**
 * Registers all the available animation nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllAnimationNodes (object?: any): void {
    registerNode({ name: 'Play Animations', description: 'Plays the animations of the current node.', path: 'animation/play', ctor: Node, functionRef: (node, target: Node, scene) => {
        if (node.store.playing) return;
        node.store.playing = true;

        scene.beginAnimation(
            target,
            node.properties['From'],
            node.properties['To'],
            node.properties['Loop'],
            node.properties['Speed'],
            () => {
                node.triggerSlot(0);
                node.store.playing = false;
            },
            null, null, null,
            () => node.triggerSlot(1)
        );
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT }
    ], properties: [
        { name: 'Target Path', type: 'string', defaultValue: 'Self' },
        { name: 'From', type: 'number', defaultValue: 0 },
        { name: 'To', type: 'number', defaultValue: 60 },
        { name: 'Speed', type: 'number', defaultValue: 1 },
        { name: 'Loop', type: 'boolean', defaultValue: false }
    ], outputs: [
        { name: 'On End', type: LiteGraph.EVENT },
        { name: 'On Loop', type: LiteGraph.EVENT }
    ], widgets: [
        { type: 'number', name: 'From', value: 0, callback: (v, g, n) => n.properties['From'] = v },
        { type: 'number', name: 'To', value: 60, callback: (v, g, n) => n.properties['To'] = v },
        { type: 'number', name: 'Speed', value: 0, callback: (v, g, n) => n.properties['Speed'] = v },
        { type: 'toggle', name: 'Loop', value: false, callback: (v, g, n) => n.properties['Loop'] = v }
    ], drawBackground: (node, target) => target }, object);

    registerNode({ name: 'Stop Animations', description: 'Stops the currently playing animations of the current node.', path: 'animation/stop', ctor: Node, functionRef: (node, target: Node, scene) => {
        scene.stopAnimation(target);
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT }
    ], properties: [
        { name: 'Target Path', type: 'string', defaultValue: 'Self' }
    ], drawBackground: (node, target) => target }, object);

    registerNode({ name: 'Interpolate Value', description: 'Interpolates the ', path: 'animation/interpolatevalue', ctor: Node, functionRef: (node, target: Node, scene) => {
        if (node.store.playing) return;
        node.store.playing = true;
        
        const targetValue = node.getInputData(1);
        if (targetValue === undefined) return;

        const propertyPath = node.properties['Property Path'];
        const property = GraphNode.GetProperty<any>(target, propertyPath);
        const ctor1 = GraphNode.GetConstructorName(property).toLowerCase();
        const ctor2 = GraphNode.GetConstructorName(targetValue).toLowerCase();
        if (ctor1 !== ctor2) {
            console.warn(`Cannot interpolate values of two different types. property: "${ctor1}", target value: "${ctor2}"`);
            return;
        }

        let animationType = Animation.ANIMATIONTYPE_FLOAT;
        switch (ctor1) {
            case 'vector2': animationType = Animation.ANIMATIONTYPE_VECTOR2; break;
            case 'vector3': animationType = Animation.ANIMATIONTYPE_VECTOR3; break;
            case 'color3': animationType = Animation.ANIMATIONTYPE_COLOR3; break;
            case 'color4': animationType = Animation.ANIMATIONTYPE_COLOR4; break;
        }

        const animation = new Animation(propertyPath, propertyPath, 60, animationType, Animation.ANIMATIONLOOPMODE_CONSTANT, false);
        animation.setKeys([
            { frame: 0, value: property.clone ? property.clone() : property },
            { frame: 60 * node.properties['Duration (seconds)'], value: targetValue }
        ]);
        scene.stopAnimation(target, propertyPath, n => n === target);
        scene.beginDirectAnimation(target, [animation], 0, 60, false, node.properties['Speed'], () => node.store.playing = false);
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Target Value', type: 'number,vec2,vec3,col3' }
    ], properties: [
        { name: 'Target Path', type: 'string', defaultValue: 'Self' },
        { name: 'Property Path', type: 'string', defaultValue: 'name' },
        { name: 'Speed', type: 'number', defaultValue: 1 },
        { name: 'Duration (seconds)', type: 'number', defaultValue: 1 }
    ], outputs: [
        { name: 'Current Value', type: 'number,vec2,vec3,vec4,col3,col4' }
    ], widgets: [
        { type: 'number', name: 'Speed', value: 1, callback: (v, g, n) => n.properties['Speed'] = v },
        { type: 'number', name: 'Duration (seconds)', value: 1, callback: (v, g, n) => n.properties['Duration (seconds)'] = v }
    ], drawBackground: (node, target) => `${target}'s ${node.properties['Property Path']}` }, object);
}
