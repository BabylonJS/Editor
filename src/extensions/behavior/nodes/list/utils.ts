import { Vector3, Vector4, Vector2, Color3, Color4 } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { registerNode, GraphNode } from '../graph-node';
import Extensions from '../../../extensions';

/**
 * Registers all the available utils nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllUtilsNodes (object?: any): void {
    /**
     * Utils
     */
    registerNode({ name: 'Bypass Type', description: 'Removes the type of the input', path: 'utils/bypass', ctor: Object, inputs: [
        { name: 'In', type: undefined }
    ], outputs: [
        { name: 'Out', type: undefined, inputName: 'In' }
    ] }, object);

    registerNode({ name: 'Time', description: 'Returns the current time in milliseconds or seconds', path: 'utils/time', ctor: Object, functionRef: (node, target: Node) => {
        node.setOutputData(1, node.graph.globaltime);
        return node.graph.globaltime * 1000;
    }, outputs: [
        { name: 'ms', type: 'number' },
        { name: 'sec', type: 'number' },
    ], drawBackground: (node) => (node.graph.globaltime * 1000).toString() }, object);

    registerNode({ name: 'Log', description: 'Logs the given message', path: 'utils/log', ctor: Object, functionRef: (node) => {
        console[node.properties['Level'].toLowerCase()](node.properties['Message'], node.getInputData(1));
    } , inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Message', type: undefined }
    ], properties: [
        { name: 'Message', type: 'string', defaultValue: 'My Message' },
        { name: 'Level', type: 'string', defaultValue: 'Info', enums: ['Info', 'Warn', 'Error'] }
    ], drawBackground: (node) => `${node.properties['Level']}: ${node.properties['Message']}, ${(node.getInputData(1) || '').toString()}` }, object);

    registerNode({ name: 'Set Timeout', description: 'Triggers the next node(s) after x milliseconds', path: 'utils/settimeout', ctor: Object, functionRef: (node) => {
        node.store.ids = node.store.ids || [];

        const ms = node.getInputData<number>(1) || node.properties['Time (ms)'];
        const id = setTimeout(() => node.triggerSlot(0), ms);

        node.store.ids.push(id);
        node.setOutputData(1, id);
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Time (ms)', type: 'number' }
    ], properties: [
        { name: 'Time (ms)', type: 'number', defaultValue: 1000 }
    ], outputs: [
        { name: 'Time out', type: LiteGraph.EVENT },
        { name: 'Id', type: 'number' }
    ], onStop: (node) => {
        node.store.ids && node.store.ids.forEach(id => clearTimeout(id));
    } }, object);

    registerNode({ name: 'Clear Timeout', description: 'Clears the given timeout Id', path: 'utils/cleartimeout', ctor: Object, functionRef: (node) => {
        clearTimeout(node.getInputData<number>(1));
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Id', type: 'number' }  
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

    /**
     * Colors to RGB(A)
     */
    registerNode({ name: 'Color 3 to RGB', description: 'Takes a color as parameter and ouputs its r, g and b', path: 'utils/col3torgb', ctor: Object, functionRef: (node) => {
        const c = GraphNode.nodeToOutput<Color3>(node.getInputData(0), true);
        if (c) {
            node.setOutputData(1, c.g);
            node.setOutputData(2, c.b);
        }
        return c.r;
    }, inputs: [
        { name: 'In Color', type: 'col3' }
    ], outputs: [
        { name: 'r', type: 'number' },
        { name: 'g', type: 'number' },
        { name: 'b', type: 'number' }
    ], onGetInputs: () => [["pos", "vec3"]] }, object);

    registerNode({ name: 'Color 4 to RGBA', description: 'Takes a color as parameter and ouputs its r, g, b and a', path: 'utils/col4torgba', ctor: Object, functionRef: (node) => {
        const c = GraphNode.nodeToOutput<Color4>(node.getInputData(0), true);
        if (c) {
            node.setOutputData(1, c.g);
            node.setOutputData(2, c.b);
            node.setOutputData(3, c.a);
        }
        return c.r;
    }, inputs: [
        { name: 'In Color', type: 'col4' }
    ], outputs: [
        { name: 'r', type: 'number' },
        { name: 'g', type: 'number' },
        { name: 'b', type: 'number' },
        { name: 'a', type: 'number' }
    ] }, object);

    /**
     * Vector merger: XY(Z)(W) to 2d, 3d or 4d vectors
     */
    registerNode({ name: 'Vector Merger', description: 'Exposes the XYZW properties to merge into 2d, 3d or 4d vectors.', path: 'utils/vectormerger', ctor: Object, functionRef: (node) => {
        node.store.vector2 = node.store.vector2 || new Vector2(0, 0);
        node.store.vector3 = node.store.vector3 || new Vector3(0, 0, 0);
        node.store.vector4 = node.store.vector4 || new Vector4(0, 0, 0, 0);

        node.store.vector2.x = node.store.vector3.x = node.store.vector4.x = node.getInputData(0);
        node.store.vector2.y = node.store.vector3.y = node.store.vector4.y = node.getInputData(1);
        node.store.vector3.z = node.store.vector4.z = node.getInputData(2);
        node.store.vector4.w = node.getInputData(3);

        node.setOutputData(1, node.store.vector3.asArray());
        node.setOutputData(2, node.store.vector4.asArray());

        return node.store.vector2;
    }, inputs: [
        { name: 'x', type: 'number' },
        { name: 'y', type: 'number' },
        { name: 'z', type: 'number' },
        { name: 'w', type: 'number' }
    ], outputs: [
        { name: 'Vector 2', type: 'vec2' },
        { name: 'Vector 3', type: 'vec3' },
        { name: 'Vector 4', type: 'vec4' }
    ] }, object);

    /**
     * Extensions
     */
    registerNode({ name: 'Send Script Message', description: 'Sends a message to the given target by giving the method name and a parameter', path: 'utils/sendmessage', ctor: Object, functionRef: (node, target) => {
        const input = node.getInputData(1);
        Extensions.Tools.sendMessage(target, node.properties['Method Name'], input);
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Value', type: undefined }
    ], outputs: [

    ], properties: [
        { name: 'Target Path', type: 'string', defaultValue: 'Self' },
        { name: 'Method Name', type: 'string', defaultValue: '' }
    ], drawBackground: (node) => `${node.properties['Target Path']}.${node.properties['Method Name']}` }, object);
}
