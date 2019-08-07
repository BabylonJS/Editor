import { LiteGraph } from 'litegraph.js';
import { GraphNode, registerNode } from '../graph-node';

/**
 * Registers all the available properties nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllPropertiesNodes (object?: any): void {
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

    registerNode({ name: 'Variable', description: 'Sets a variable node taken from the avaialable node variables.', path: 'utils/variable', ctor: Object, functionRef: (node) => {
        node.graph.variables = node.graph.variables || [];
        const v = node.graph.variables.find(v => v.name === node.properties['Variable']);
        if (!v) {
            console.warn(`No variable found for name "${node.properties['Variable']}"`)
            return undefined;
        }

        const i = node.getInputData<any>(0);
        if (i !== null && i !== undefined)
            v.value = i;

        return GraphNode.nodeToOutput(v.value);
    }, inputs: [
        { name: 'Set Value', type: undefined }
    ], outputs: [
        { name: 'Get Value', type: undefined }
    ], properties: [
        { name: 'Variable', type: 'string', defaultValue: '' }
    ] }, object);
}
