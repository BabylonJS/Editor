import { AbstractMesh, Light } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { registerNode } from '../graph-node';

/**
 * Registers all the available transforms nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllTransformsNodes (object?: any): void {
    registerNode({ name: 'Transform', description: 'Gets the current transformation of the node', path: 'node/transform', ctor: AbstractMesh, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Position', type: 'vec3', propertyPath: 'position' },
        { name: 'Rotation', type: 'vec3', propertyPath: 'rotation' },
        { name: 'Scaling', type: 'vec3', propertyPath: 'scaling' }
    ], outputs: 
    object instanceof AbstractMesh ? [
        { name: 'Position', type: 'vec3', propertyPath: 'position' },
        { name: 'Rotation', type: 'vec3', propertyPath: 'rotation' },
        { name: 'Scaling', type: 'vec3', propertyPath: 'scaling' }
    ] :
    object instanceof Light ? [
        { name: 'Position', type: 'vec3', propertyPath: 'position' }
    ] : [] }, object);
}
