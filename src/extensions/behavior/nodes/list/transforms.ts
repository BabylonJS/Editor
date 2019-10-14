import { AbstractMesh, Light, Vector3 } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { GraphNode, registerNode } from '../graph-node';

/**
 * Registers all the available transforms nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllTransformsNodes (object?: any): void {
    registerNode({ name: 'Transform', description: 'Gets the current transformation of the node', path: 'node/transform', ctor: AbstractMesh, functionRef: (node, target: AbstractMesh) => {
        const position = GraphNode.nodeToOutput<Vector3>(node.getInputData(1), false);
        const rotation = GraphNode.nodeToOutput<Vector3>(node.getInputData(2), false);
        const scaling = GraphNode.nodeToOutput<Vector3>(node.getInputData(3), false);

        if (position && target.position)
            target.position.copyFrom(position);
        if (rotation && target.rotation)
            target.rotation.copyFrom(rotation);
        if (scaling && target.scaling)
            target.scaling.copyFrom(scaling);

        node.setOutputData(1, rotation ? rotation.asArray() : target.rotation);
        node.setOutputData(2, scaling ? scaling.asArray() : target.scaling);

        return position || target.position;
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Position', type: 'vec3' },
        { name: 'Rotation', type: 'vec3' },
        { name: 'Scaling', type: 'vec3' }
    ], outputs: [
        { name: 'Position', type: 'vec3', },
        { name: 'Rotation', type: 'vec3', },
        { name: 'Scaling', type: 'vec3' }
    ],
    drawBackground: (node, target) => target }, object);
}
