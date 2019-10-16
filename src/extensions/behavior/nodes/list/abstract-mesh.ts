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

    /**
     * Translate
     */
    registerNode({ name: 'Translate', description: 'Translates the current node in the given axis, distance and space', path: 'node/translate', ctor: AbstractMesh, functionRef: 'translate', inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Axis', type: 'vec3' },	
        { name: 'Distance', type: 'number' }
    ], properties: [	
        { name: 'Target Path', type: 'string', defaultValue: 'Self' },
        { name: 'Space', type: 'number', defaultValue: Space.LOCAL, enums: ['BONE', 'LOCAL', 'WORLD'], enumsTarget: Space }
    ], parameters: [	
        { inputName: 'Axis', type: 'vec3' },	
        { inputName: 'Distance', type: 'number' },	
        { propertyName: 'Space', type: 'number' }
    ], outputs: [
        { name: 'New position', type: 'vec3', propertyName: 'position' }
    ], widgets: [
        { name: 'Space', type: 'combo', value: 'LOCAL', callback: (v, g, n) => n.properties['Space'] = Space[v], options: {
            values: ['BONE', 'LOCAL', 'WORLD'],
            onInstanciate: (n, w) => {
                switch (n.properties['Space']) {
                    case Space.BONE: w.value = 'BONE'; break;
                    case Space.LOCAL: w.value = 'LOCAL'; break;
                    case Space.WORLD: w.value = 'WORLD'; break;
                    default: w.value = 'LOCAL'; break;
                }
            }
        } }
    ] }, object);

    registerNode({ name: 'Move With Collisions', description: 'Moves the mesh according to the given displacement by taking care of collisions', path: 'node/movewithcollisions', ctor: AbstractMesh, functionRef: 'moveWithCollisions', inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Displacement', type: 'vec3' }
    ], parameters: [
        { inputName: 'Displacement', type: 'vec3' }
    ], outputs: [
        { name: 'New position', type: 'vec3', propertyName: 'position' }
    ] }, object);
}
