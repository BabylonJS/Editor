import { Vector3, Vector4, Vector2 } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { registerNode, GraphNode } from '../graph-node';

/**
 * Registers all the available utils nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllUtilsNodes (object?: any): void {
    registerNode({ name: 'Bypass Type', description: 'Removes the type of the input', path: 'utils/bypass', ctor: Object, inputs: [
        { name: 'In', type: undefined }
    ], outputs: [
        { name: 'Out', type: undefined, inputName: 'In' }
    ] }, object);

    registerNode({ name: 'Time', description: 'Returns the current time in milliseconds or seconds', path: 'utils/time', ctor: Node, functionRef: (node, target: Node) => {
        node.setOutputData(1, node.graph.globaltime);
        return node.graph.globaltime * 1000;
    }, outputs: [
        { name: 'ms', type: 'number' },
        { name: 'sec', type: 'number' },
    ] }, object);

    registerNode({ name: 'Log', description: 'Logs the given message', path: 'utils/log', ctor: Object, functionRef: (node) => {
        console[node.properties['Level'].toLowerCase()](node.properties['Message'], node.getInputData(1));
    } , inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Message', type: 'string' }
    ], properties: [
        { name: 'Message', type: 'string', defaultValue: 'My Message' },
        { name: 'Level', type: 'string', defaultValue: 'Info', enums: ['Info', 'Warn', 'Error'] }
    ], parameters: [
        { propertyName: 'Level', type: 'string' },
        { propertyName: 'Message', type: 'string' }
    ] }, object);

    /**
     * Vectors to XY(Z)(W)
     */
    registerNode({ name: 'Vector 2D to XY', description: 'Takes a vector as parameter and ouputs its x and y', path: 'utils/vec2toxy', ctor: Object, functionRef: (node) => {
        const v = GraphNode.nodeToOutput<Vector2>(node.getInputData(0));
        if (v)
            node.setOutputData(1, v.y);
        return v.x;
    }, inputs: [
        { name: 'In Vector', type: 'vec2' }
    ], outputs: [
        { name: 'x', type: 'number' },
        { name: 'y', type: 'number' }
    ] }, object);

    registerNode({ name: 'Vector 3D to XYZ', description: 'Takes a vector as parameter and ouputs its x, y and z', path: 'utils/vec3toxyz', ctor: Object, functionRef: (node) => {
        const v = GraphNode.nodeToOutput<Vector3>(node.getInputData(0));
        if (v) {
            node.setOutputData(1, v.y);
            node.setOutputData(2, v.z);
        }
        return v.x;
    }, inputs: [
        { name: 'In Vector', type: 'vec3' }
    ], outputs: [
        { name: 'x', type: 'number' },
        { name: 'y', type: 'number' },
        { name: 'z', type: 'number' }
    ] }, object);

    registerNode({ name: 'Vector 4D to XYZW', description: 'Takes a vector as parameter and ouputs its x, y, z and w', path: 'utils/vec4toxyzw', ctor: Object, functionRef: (node) => {
        const v = GraphNode.nodeToOutput<Vector4>(node.getInputData(0));
        if (v) {
            node.setOutputData(1, v.y);
            node.setOutputData(2, v.z);
            node.setOutputData(3, v.w);
        }
        return v.x;
    }, inputs: [
        { name: 'In Vector', type: 'vec4' }
    ], outputs: [
        { name: 'x', type: 'number' },
        { name: 'y', type: 'number' },
        { name: 'z', type: 'number' },
        { name: 'w', type: 'number' }
    ] }, object);
}
