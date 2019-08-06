import { LiteGraph } from 'litegraph.js';
import { registerNode } from '../graph-node';

/**
 * Registers all the available utils nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllUtilsNodes (object?: any): void {
    registerNode({ name: 'Bypass Type', description: 'Removes the type of the input', path: 'utils/bypass', ctor: Object, inputs: [
        { name: 'In', type: undefined }
    ], outputs: [
        { name: 'Out', type: undefined, inputName: 'In' }
    ] }, object);

    registerNode({ name: 'Time', description: 'Returns the current time in milliseconds or seconds', path: 'utils/time', ctor: Node, functionRef: (node, target: Node) => {
        node.setOutputData(1, node.graph.globaltime);
        return node.graph.globaltime * 1000;
    }, outputs: [
        { name: 'ms', type: 'number' },
        { name: 'sec', type: 'number' },
    ] }, object);

    registerNode({ name: 'Log', description: 'Logs the given message', path: 'utils/log', ctor: Object, functionRef: (node) => {
        console[node.properties['Level'].toLowerCase()](node.properties['Message']);
    } , inputs: [
        { name: 'Execute', type: LiteGraph.EVENT }
    ], properties: [
        { name: 'Message', type: 'string', defaultValue: 'My Message' },
        { name: 'Level', type: 'string', defaultValue: 'Info', enums: ['Info', 'Warn', 'Error'] }
    ], parameters: [
        { propertyName: 'Level', type: 'string' },
        { propertyName: 'Message', type: 'string' }
    ] }, object);
}
