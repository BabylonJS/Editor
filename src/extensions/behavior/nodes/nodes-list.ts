import { Node, AbstractMesh, Vector4, Vector3, Vector2, Light } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { GraphNode, registerNode } from './graph-node';
import { registerTypeNode } from './graph-type-node';

/**
 * Registers all the available nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllNodes (object?: any): void {
    /**
     * Types
     */
    registerTypeNode('types/number', 'Number', 'Represents a number', () => 0);
    registerTypeNode('types/string', 'String', 'Represents a string', () => 'new string');
    registerTypeNode('types/vector3', 'Vector2', 'Represents a Vector 2D', () => Vector2.Zero());
    registerTypeNode('types/vector3', 'Vector3', 'Represents a Vector3D', () => Vector3.Zero());

    /**
     * Utils
     */
    registerNode({ name: 'Bypass Type', description: 'Removes the type of the input', path: 'utils/bypass', ctor: Object, inputs: [
        { name: 'In', type: undefined }
    ], outputs: [
        { name: 'Out', type: undefined, inputName: 'In' }
    ] }, object);

    registerNode({ name: 'Time', description: 'Returns the current time in milliseconds or seconds', path: 'utils/time', ctor: Node, functionRef: (node, target) => {
        const engine = (<Node> target).getEngine();
        node.store.time = ((node.store.time || 0) + engine.getDeltaTime());
        
        node.setOutputData(0, node.store.time);
        node.setOutputData(1, node.store.time / 1000);
    }, outputs: [
        { name: 'ms', type: 'number' },
        { name: 'sec', type: 'number' },
    ] }, object);

    /**
     * Log
     */
    registerNode({ name: 'Log', description: 'Logs the given message', path: 'utils/log', ctor: Object, functionRef: (node) => {
        console[node.properties['Level'].toLowerCase()](node.properties['Message']);
    } , inputs: [
        { name: 'Execute', type: LiteGraph.EVENT }
    ], properties: [
        { name: 'Message', type: 'string', defaultValue: 'My Message' },
        { name: 'Level', type: 'string', defaultValue: 'Info', enums: ['Info', 'Warn', 'Error'] }
    ], parameters: [
        { propertyName: 'Level', type: 'string' },
        { propertyName: 'Message', type: 'string' }
    ] }, object);

    /**
     * Math
     */
    registerNode({ name: 'Scale', description: 'Scales', path: 'math/scale', ctor: Object, functionRef: (node) => {
        // Number
        node.setOutputData(0, node.getInputData<number>(0) * node.properties['Amount']);
        // Vector
        const vec = GraphNode.nodeToOutput<Vector2 | Vector3 | Vector4>(node.getInputData<number>(1));
        vec && node.setOutputData(1, GraphNode.inputToNode(vec.scale(node.properties['Amount'])));
    }, properties: [
        { name: 'Amount', type: 'number', defaultValue: 1 }
    ], inputs: [
        { name: 'Number', type: 'number' },
        { name: 'Vector', type: 'vec2,vec3,vec4' }
    ], outputs: [
        { name: 'Scaled number', type: 'number' },
        { name: 'Scaled vector', type: 'vec2,vec3,vec4' }
    ] }, object);

    /**
     * Properties
     */
    registerNode({ name: 'Get Property', description: 'Gets the property of the current node and returns its value.', path: 'utils/getproperty', ctor: Node, inputs: [], properties: [
        { name: 'Property Path', type: 'string', defaultValue: 'name' }
    ],
    outputs: [
        { type: undefined, name: 'Value', propertyPath: 'propertyPath', propertyName: 'Property Path' }
    ] }, object);

    registerNode({ name: 'Set Property', description: 'Sets the property of the current node to the input value.', path: 'utils/setproperty', ctor: Node, functionRef: (node, target) => {
        const split = node.properties['Property Path'].split('.');
        const input = GraphNode.nodeToOutput(node.getInputData(0));
        const property = GraphNode.GetEffectiveProperty(target, node.properties['Property Path']);
        if (GraphNode.GetConstructorName(input) !== GraphNode.GetConstructorName(property[split[split.length - 1]]))
            return node.setOutputData(0, node.getInputData(0));

        node.setOutputData(0, GraphNode.inputToNode(input));
        return (property[split[split.length - 1]] = input);
    }, inputs: [
        { name: 'In', type: undefined }
    ], properties: [
        { name: 'Property Path', type: 'string', defaultValue: 'name' }
    ], outputs: [
        { type: undefined, name: 'Value', propertyPath: 'propertyPath', propertyName: 'Property Path' }
    ] }, object);

    /**
     * Transforms
     */
    registerNode({ name: 'Transform', description: 'Gets the current transformation of the node', path: 'node/transform', ctor: AbstractMesh, inputs: [], outputs: 
    object instanceof AbstractMesh ? [
        { name: 'position', type: 'vec3', propertyPath: 'position' },
        { name: 'rotation', type: 'vec3', propertyPath: 'rotation' },
        { name: 'scaling', type: 'vec3', propertyPath: 'scaling' }
    ] :
    object instanceof Light ? [
        { name: 'position', type: 'vec3', propertyPath: 'position' }
    ] : [] }, object);

    /**
     * Abstract mesh functions.
     */
    registerNode({ name: 'Get Mesh Direction', description: 'Returns the current direction of the node.', path: 'node/getdirection', ctor: AbstractMesh, functionRef: 'getDirection', inputs: [
        { name: 'localAxis', type: 'vec3' } 
    ], outputs: [
        { name: 'vec3', type: 'vec3' }
    ], parameters: [
        { inputName: 'localAxis', type: 'vec3' }
    ] }, object);

    registerNode({ name: 'Set Mesh Direction', description: 'Sets the current direction of the node.', path: 'node/setdirection', ctor: AbstractMesh, functionRef: 'setDirection', inputs: [
        { name: 'localAxis', type: 'vec3' } 
    ], parameters: [
        { inputName: 'localAxis', type: 'vec3' }
    ] }, object);
}
