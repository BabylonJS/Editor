import { Node, AbstractMesh, Vector3, Vector2, Light } from 'babylonjs';
import { registerNode } from './graph-node';
import { registerTypeNode } from './graph-type-node';

/**
 * Registers all the available nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllNodes (object?: any): void {
    // Types
    registerTypeNode('types/number', 'Number', 'Represents a number', () => 0);
    registerTypeNode('types/string', 'String', 'Represents a string', () => 'new string');
    registerTypeNode('types/vector3', 'Vector2', 'Represents a Vector 2D', () => Vector2.Zero());
    registerTypeNode('types/vector3', 'Vector3', 'Represents a Vector3D', () => Vector3.Zero());

    // Properties
    registerNode({ name: 'Get Property', description: '', path: 'utils/getproperty', ctor: Node, inputs: [], properties: [
        { name: 'Property Path', type: 'string', defaultValue: 'name' }
    ],
    outputs: [
        { type: 'any', name: 'value', propertyPath: 'propertyPath', propertyName: 'Property Path' }
    ] }, object);

    // Transforms
    registerNode({ name: 'Transform', description: 'Gets the current transformation of the node', path: 'node/transform', ctor: AbstractMesh, inputs: [], outputs: 
    object instanceof AbstractMesh ? [
        { name: 'position', type: 'vec3', propertyPath: 'position' },
        { name: 'rotation', type: 'vec3', propertyPath: 'rotation' },
        { name: 'scaling', type: 'vec3', propertyPath: 'scaling' }
    ] :
    object instanceof Light ? [
        { name: 'position', type: 'vec3', propertyPath: 'position' }
    ] : [] }, object);

    // Abstract mesh functions.
    registerNode({ name: 'Get Mesh Direction', description: 'Returns the current direction of the node.', path: 'node/getdirection', ctor: AbstractMesh, functionName: 'getDirection', inputs: [
        { name: 'localAxis', type: 'vec3' } 
    ], outputs: [
        { name: 'vec3', type: 'vec3' }
    ], parameters: [
        { inputName: 'localAxis', type: 'vec3' }
    ] }, object);

    registerNode({ name: 'Set Mesh Direction', description: 'Sets the current direction of the node.', path: 'node/setdirection', ctor: AbstractMesh, functionName: 'setDirection', inputs: [
        { name: 'localAxis', type: 'vec3' } 
    ], parameters: [
        { inputName: 'localAxis', type: 'vec3' }
    ] }, object);
}
