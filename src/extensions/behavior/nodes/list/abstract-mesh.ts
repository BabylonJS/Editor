import { LiteGraph } from 'litegraph.js';
import { GraphNode, registerNode } from '../graph-node';

/**
 * Registers all the available AbstractMesh nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllAbstractMeshNodes (object?: any): void {
    registerNode({ name: 'Get Property', description: 'Gets the property of the current node and returns its value.', path: 'utils/getproperty', ctor: Node, properties: [
        { name: 'Property Path', type: 'string', defaultValue: 'name' }
    ],
    outputs: [
        { type: undefined, name: 'Value', propertyPath: 'propertyPath', propertyName: 'Property Path' }
    ] }, object);

    registerNode({ name: 'Set Property', description: 'Sets the property of the current node to the input value.', path: 'utils/setproperty', ctor: Node, functionRef: (node, target) => {
        const split = node.properties['Property Path'].split('.');
        const input = GraphNode.nodeToOutput(node.getInputData(1));
        const property = GraphNode.GetEffectiveProperty(target, node.properties['Property Path']);
        if (GraphNode.GetConstructorName(input) !== GraphNode.GetConstructorName(property[split[split.length - 1]]))
            return node.getInputData(1);

        return (property[split[split.length - 1]] = input);
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'In', type: undefined }
    ], properties: [
        { name: 'Property Path', type: 'string', defaultValue: 'name' }
    ], outputs: [
        { type: undefined, name: 'Value', propertyPath: 'propertyPath', propertyName: 'Property Path' }
    ] }, object);
}
