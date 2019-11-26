import { Space, AbstractMesh } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { registerNode } from '../graph-node';

/**
 * Registers all the available AbstractMesh nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllAbstractMeshNodes (object?: any): void {
    /**
     * Get mesh direction
     */
    registerNode({ name: 'Get Mesh Direction', description: 'Returns the current direction of the node.', path: 'node/getdirection', ctor: AbstractMesh, functionRef: 'getDirection', inputs: [	
        { name: 'localAxis', type: 'vec3' }	
    ], outputs: [	
        { name: 'vec3', type: 'vec3' }	
    ], parameters: [	
        { inputName: 'localAxis', type: 'vec3' }	
    ] }, object);	

    /**
     * Set mesh direction
     */
     registerNode({ name: 'Set Mesh Direction', description: 'Sets the current direction of the node.', path: 'node/setdirection', ctor: AbstractMesh, functionRef: 'setDirection', inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'localAxis', type: 'vec3' }	
    ], parameters: [
        { inputName: 'localAxis', type: 'vec3' }	
    ] }, object);
}
