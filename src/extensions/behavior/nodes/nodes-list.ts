import { AbstractMesh, Vector3, Vector2 } from 'babylonjs';
import { registerNode, registerTypeNode } from './graph-node';

/**
 * Registers all the available nodes.
 */
export function registerAllNodes (): void {
    // Types
    registerTypeNode('types/number', 'Number', 'Represents a number', () => 0);
    registerTypeNode('types/string', 'String', 'Represents a string', () => 'new string');
    registerTypeNode('types/vector3', 'Vector2', 'Represents a Vector 2D', () => Vector2.Zero());
    registerTypeNode('types/vector3', 'Vector3', 'Represents a Vector3D', () => Vector3.Zero());

    // Functions
    registerNode({ name: 'Get Mesh Direction', description: 'Returns the current direction of the node.', path: 'node/getdirection', ctor: AbstractMesh, functionName: 'getDirection', inputs: [
        { name: 'localAxis', type: 'vec3' } 
    ], outputs: [
        { name: 'vec3', type: 'vec3' }
    ], parameters: [
        { inputName: 'localAxis', type: 'vec3' }
    ] });

    registerNode({ name: 'Set Mesh Direction', description: 'Sets the current direction of the node.', path: 'node/setdirection', ctor: AbstractMesh, functionName: 'setDirection', inputs: [
        { name: 'localAxis', type: 'vec3' } 
    ], parameters: [
        { inputName: 'localAxis', type: 'vec3' }
    ] });
}

const abstractMesh: AbstractMesh = null;