import { AbstractMesh, Node, Vector3 } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { GraphNode, registerNode } from '../graph-node';

/**
 * Registers all the available transforms nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllTransformsNodes (object?: any): void {
    /**
     * Transform
     */
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

    /**
     * Set Parent
     */
    registerNode({ name: 'Set Parent', description: 'Sets the new parent of the node', path: 'node/setparent', ctor: Node, functionRef: (node, target, scene) => {
        const parent = node.getInputData<AbstractMesh>(1) || target;
        if (parent !== node.graph.scriptObject)
            node.graph.scriptObject.parent = parent;
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'Parent', type: 'mesh' }
    ], properties: [
        { name: 'Target Path', type: 'string', defaultValue: 'Self' }
    ] }, object);
}
