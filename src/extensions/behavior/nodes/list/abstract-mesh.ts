import { Space, AbstractMesh } from 'babylonjs';

import { registerNode } from '../graph-node';

/**
 * Registers all the available AbstractMesh nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllAbstractMeshNodes (object?: any): void {
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

     registerNode({ name: 'Translate', description: 'Translates the current node in the given axis, distance and space', path: 'node/translate', ctor: AbstractMesh, functionRef: 'translate', inputs: [	
        { name: 'Axis', type: 'vec3' },	
        { name: 'Distance', type: 'number' }	
    ], properties: [	
        { name: 'Space', type: 'number', defaultValue: Space.LOCAL, enums: ['BONE', 'LOCAL', 'WORLD'], enumsTarget: Space }	
    ], parameters: [	
        { inputName: 'Axis', type: 'vec3' },	
        { inputName: 'Distance', type: 'number' },	
        { propertyName: 'Space', type: 'number' }	
    ] }, object);
}
