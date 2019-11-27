import { registerNode } from '../graph-node';

/**
 * Registers all the available transforms nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllSceneNodes (object?: any): void {
    /**
     * Node
     */
    registerNode({ name: 'Get Node By Name', description: 'Returns the given node by name', path: 'scene/getnodebyname', ctor: Object, functionRef: (node, target, scene) => {
        node.store.node = node.store.node || scene.getNodeByName(node.getInputData<string>(0) || node.properties['Target Path']);
        return node.store.node;
    }, inputs: [
        { name: 'Name', type: 'string' }
    ], properties: [
        { name: 'Target Path', type: 'string', defaultValue: 'Self', filter: ['mesh', 'light', 'camera'] },
    ], outputs: [
        { name: 'Mesh', type: 'node' }
    ],
    drawBackground: (node, target) => target }, object);

    registerNode({ name: 'Get Mesh By Name', description: 'Returns the given mesh by name', path: 'scene/getmeshbyname', ctor: Object, functionRef: (node, target, scene) => {
        node.store.mesh = node.store.mesh || scene.getMeshByName(node.getInputData<string>(0) || node.properties['Target Path']);
        return node.store.mesh;
    }, inputs: [
        { name: 'Name', type: 'string' }
    ], properties: [
        { name: 'Target Path', type: 'string', defaultValue: 'Self', filter: ['mesh'] },
    ], outputs: [
        { name: 'Mesh', type: 'node,mesh' }
    ],
    drawBackground: (node, target) => target }, object);

    registerNode({ name: 'Get Light By Name', description: 'Returns the given light by name', path: 'scene/getlightbyname', ctor: Object, functionRef: (node, target, scene) => {
        node.store.light = node.store.light || scene.getLightByName(node.getInputData<string>(0) || node.properties['Target Path']);
        return node.store.light;
    }, inputs: [
        { name: 'Name', type: 'string' }
    ], properties: [
        { name: 'Target Path', type: 'string', defaultValue: 'Self', filter: ['light'] },
    ], outputs: [
        { name: 'Light', type: 'node,light' }
    ],
    drawBackground: (node, target) => target }, object);

    registerNode({ name: 'Get Camera By Name', description: 'Returns the given camera by name', path: 'scene/getcamerabyname', ctor: Object, functionRef: (node, target, scene) => {
        node.store.camera = node.store.camera || scene.getCameraByName(node.getInputData<string>(0) || node.properties['Target Path']);
        return node.store.camera;
    }, inputs: [
        { name: 'Name', type: 'string' }
    ], properties: [
        { name: 'Target Path', type: 'string', defaultValue: 'Self', filter: ['camera'] },
    ], outputs: [
        { name: 'Light', type: 'node,camera' }
    ],
    drawBackground: (node, target) => target }, object);

    /**
     * Arrays
     */
    registerNode({ name: 'Meshes Array', description: 'Returns the array of available meshes in scene', path: 'scene/meshesarray', ctor: Object, functionRef: (node, target, scene) => {
        return scene.meshes;
    }, outputs: [
        { name: 'Array', type: 'any[],mesh[]' }
    ] }, object);

    registerNode({ name: 'Lights Array', description: 'Returns the array of available lights in scene', path: 'scene/lightsarray', ctor: Object, functionRef: (node, target, scene) => {
        return scene.lights;
    }, outputs: [
        { name: 'Array', type: 'any[],light[]' }
    ] }, object);

    registerNode({ name: 'Cameras Array', description: 'Returns the array of available cameras in scene', path: 'scene/camerasarray', ctor: Object, functionRef: (node, target, scene) => {
        return scene.cameras;
    }, outputs: [
        { name: 'Array', type: 'any[],camera[]' }
    ] }, object);

    /**
     * Aniumation
     */
    registerNode({ name: 'Animation Ratio', description: 'Returns the current animation ratio', path: 'scene/animationratio', ctor: Object, functionRef: (node, target, scene) => {
        return scene.getAnimationRatio();
    }, outputs: [
        { name: 'Ratio', type: 'number' }
    ] }, object);
}
