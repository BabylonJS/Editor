import { registerNode } from '../graph-node';

/**
 * Registers all the available transforms nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllSceneNodes (object?: any): void {
    registerNode({ name: 'Get Mesh By Name', description: 'Returns the given mesh by name', path: 'scene/getmeshbyname', ctor: Object, functionRef: (node, target, scene) => {
        node.store.mesh = node.store.mesh || scene.getMeshByName(node.getInputData<string>(0) || node.properties['Target Path']);
        return node.store.mesh;
    }, inputs: [
        { name: 'Name', type: 'string' }
    ], properties: [
        { name: 'Target Path', type: 'string', defaultValue: 'Self' },
    ], outputs: [
        { name: 'Mesh', type: 'mesh' }
    ],
    drawBackground: (node, target) => target }, object);
}
