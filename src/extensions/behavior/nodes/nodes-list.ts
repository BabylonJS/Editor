import { Node, AbstractMesh, Vector4, Vector3, Vector2, Light, PointerEventTypes, PointerInfo, KeyboardEventTypes, KeyboardInfo } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { GraphNode, registerNode } from './graph-node';
import { registerTypeNode } from './graph-type-node';
import { IGraphNode } from './types';

/**
 * Registers all the available nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllNodes (object?: any): void {
    /*****************************************************************************************************************************************
     * Types
     *****************************************************************************************************************************************/
    registerTypeNode('types/number', 'Number', 'Represents a number', () => 0);
    registerTypeNode('types/string', 'String', 'Represents a string', () => 'new string');
    registerTypeNode('types/vector2', 'Vector2', 'Represents a Vector 2D', () => Vector2.Zero());
    registerTypeNode('types/vector3', 'Vector3', 'Represents a Vector3D', () => Vector3.Zero());
    registerTypeNode('types/vector4', 'Vector4', 'Represents a Vector4D', () => Vector4.Zero());

    /*****************************************************************************************************************************************
     * Utils
     *****************************************************************************************************************************************/
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

    /*****************************************************************************************************************************************
     * Math
     *****************************************************************************************************************************************/
    registerNode({ name: 'Scale', description: 'Scales', path: 'math/scale', ctor: Object, functionRef: (node) => {
        // Vector
        const vec = GraphNode.nodeToOutput<Vector2 | Vector3 | Vector4>(node.getInputData<number>(1));
        vec && node.setOutputData(1, GraphNode.inputToNode(vec.scale(node.properties['Amount'])));
        // Number
        return node.getInputData<number>(0) * node.properties['Amount'];
    }, properties: [
        { name: 'Amount', type: 'number', defaultValue: 1 }
    ], inputs: [
        { name: 'Number', type: 'number' },
        { name: 'Vector', type: 'vec2,vec3,vec4' }
    ], outputs: [
        { name: 'Scaled number', type: 'number' },
        { name: 'Scaled vector', type: 'vec2,vec3,vec4' }
    ] }, object);

    registerNode({ name: 'Operation', description: 'Performs an operation (+, -, *, /)', path: 'math/operation', ctor: Object, functionRef: (node) => {
        const a = node.getInputData<number>(0);
        const b = node.getInputData<number>(1);
        switch (node.properties['Operator']) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return a / b;
            default: return 0; // Should not happen
        }
    }, properties: [
        { name: 'Operator', type: 'string', defaultValue: '+', enums: ['+', '-', '*', '/'] }
    ], inputs: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' }
    ], outputs: [
        { name: 'Result', type: 'number' }
    ] }, object);

    registerNode({ name: 'Vector Operation', description: 'Performs a vector operation (+, -, *, /)', path: 'math/vectoroperation', ctor: Object, functionRef: (node) => {
        const a = GraphNode.nodeToOutput<any>(node.getInputData(0));
        const b = GraphNode.nodeToOutput<any>(node.getInputData(1));
        switch (node.properties['Operator']) {
            case '+': return a.add(b);
            case '-': return a.subtract(b);
            case '*': return a.multiply(b);
            case '/': return a.divide(b);
            default: return 0; // Should not happen
        }
    }, inputs: [
        { name: 'vec1', type: 'vec2,vec3,vec4' },
        { name: 'vec2', type: 'vec2,vec3,vec4' }
    ], outputs: [
        { name: 'Result', type: 'vec2,vec3,vec4' }
    ], properties: [
        { name: 'Operator', type: 'string', defaultValue: '+', enums: ['+', '-', '*', '/'] }
    ] }, object);

    registerNode({ name: 'Fract', description: 'Computes the fractional part of the input vector.', path: 'math/fract', ctor: Object, functionRef: (node) => {
        return (GraphNode.nodeToOutput<Vector2 | Vector3 | Vector4>(node.getInputData(0)).fract());
    } , inputs: [
        { name: 'Vector', type: 'vec2,vec3,vec4' }
    ], outputs: [
        { name: 'Result', type: 'vec2,vec3,vec4' }
    ] }, object);

    registerNode({ name: 'Negate', description: 'Computes the negation of the input value.', path: 'math/negate', ctor: Object, functionRef: (node) => {
        const v = GraphNode.nodeToOutput<any>(node.getInputData(0));
        const ctor = GraphNode.GetConstructorName(v).toLowerCase();
        switch (ctor) {
            case 'number': return -v;
            case 'vector2':
            case 'vector3':
            case 'vector4':
                return v.negate();
            default: debugger; break; // Should not happen
        }
    } , inputs: [
        { name: 'Input', type: 'number,vec2,vec3,vec4' }
    ], outputs: [
        { name: 'Result', type: 'number,vec2,vec3,vec4' }
    ] }, object);

    registerNode({ name: 'Condition', description: 'Check the inputs and compares to trigger the appropriate slot.', path: 'math/condition', ctor: Object, functionRef: (node) => {
        const a = node.getInputData(0);
        const b = node.getInputData(1);
        if (a === b) node.triggerSlot(0);
        if (a !== b) node.triggerSlot(1);
        if (a >= b) node.triggerSlot(2);
        if (a <= b) node.triggerSlot(3);
        if (a > b) node.triggerSlot(4);
        if (a < b) node.triggerSlot(5);
    }, inputs: [
        { name: 'a', type: 'number,boolean' },
        { name: 'b', type: 'number,boolean' }
    ], outputs: [
        { name: 'a == b', type: LiteGraph.EVENT },
        { name: 'a != b', type: LiteGraph.EVENT },
        { name: 'a >= b', type: LiteGraph.EVENT },
        { name: 'a <= b', type: LiteGraph.EVENT },
        { name: 'a > b', type: LiteGraph.EVENT },
        { name: 'a < b', type: LiteGraph.EVENT }
    ] }, object);

    registerNode({ name: 'Cosinus', description: 'Performs a cosinus operation', path: 'math/cos', ctor: Object, functionRef: (node) => {
        return Math.cos(node.getInputData<number>(0));
    }, inputs: [
        { name: 'In', type: 'number' }
    ], outputs: [
        { name: 'Out', type: 'number' }
    ] }, object);

    registerNode({ name: 'Sinus', description: 'Performs a sinus operation', path: 'math/sin', ctor: Object, functionRef: (node) => {
        return Math.sin(node.getInputData<number>(0));
    }, inputs: [
        { name: 'In', type: 'number' }
    ], outputs: [
        { name: 'Out', type: 'number' }
    ] }, object);

    /*****************************************************************************************************************************************
     * Properties
     *****************************************************************************************************************************************/
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

    /*****************************************************************************************************************************************
     * Transforms
     *****************************************************************************************************************************************/
    registerNode({ name: 'Transform', description: 'Gets the current transformation of the node', path: 'node/transform', ctor: AbstractMesh, inputs: [], outputs: 
    object instanceof AbstractMesh ? [
        { name: 'position', type: 'vec3', propertyPath: 'position' },
        { name: 'rotation', type: 'vec3', propertyPath: 'rotation' },
        { name: 'scaling', type: 'vec3', propertyPath: 'scaling' }
    ] :
    object instanceof Light ? [
        { name: 'position', type: 'vec3', propertyPath: 'position' }
    ] : [] }, object);

    /*****************************************************************************************************************************************
     * Pointer
     *****************************************************************************************************************************************/
    const checkPointerEvent = ((node: IGraphNode, target: AbstractMesh, ev: PointerInfo, type: PointerEventTypes): boolean => {
        const scene = target.getScene();
        if (ev.type !== type)
            return;
        
        const pick = scene.pick(scene.pointerX, scene.pointerY);
        return pick.pickedMesh === target;
    });

    registerNode({ name: 'Pointer Down', description: 'Triggers on the node has been clicked.', path: 'events/pointerdown', ctor: AbstractMesh, functionRef: (node, target: AbstractMesh) => {
        const scene = target.getScene();
        node.store.observer = node.store.observer || scene.onPointerObservable.add(ev => {
            checkPointerEvent(node, target, ev, PointerEventTypes.POINTERDOWN) && node.triggerSlot(0);
        });
    }, outputs: [
        { name: 'Clicked', type: LiteGraph.EVENT }
    ] }, object);

    registerNode({ name: 'Pointer Move', description: 'Triggers on the pointer moves on the node.', path: 'events/pointermove', ctor: AbstractMesh, functionRef: (node, target: AbstractMesh) => {
        const scene = target.getScene();
        node.store.observer = node.store.observer || scene.onPointerObservable.add(ev => {
            checkPointerEvent(node, target, ev, PointerEventTypes.POINTERMOVE) && node.triggerSlot(0);
        });
    }, outputs: [
        { name: 'Moved', type: LiteGraph.EVENT }
    ] }, object);

    registerNode({ name: 'Pointer Up', description: 'Triggers on the pointer is up on the node.', path: 'events/pointerup', ctor: AbstractMesh, functionRef: (node, target: AbstractMesh) => {
        const scene = target.getScene();
        node.store.observer = node.store.observer || scene.onPointerObservable.add(ev => {
            checkPointerEvent(node, target, ev, PointerEventTypes.POINTERUP) && node.triggerSlot(0);
        });
    }, outputs: [
        { name: 'Moved', type: LiteGraph.EVENT }
    ] }, object);

    registerNode({ name: 'Pointer Over', description: 'Triggers on the pointer is over the node.', path: 'events/pointerover', ctor: AbstractMesh, functionRef: (node, target: AbstractMesh) => {
        const scene = target.getScene();
        node.store.wasOver = node.store.wasOver || false;
        node.store.observer = node.store.observer || scene.onPointerObservable.add(ev => {
            node.store.wasOver = checkPointerEvent(node, target, ev, PointerEventTypes.POINTERMOVE);
        });
        if (node.store.wasOver)
            node.triggerSlot(0);
    }, outputs: [
        { name: 'Over', type: LiteGraph.EVENT }
    ] }, object);

    registerNode({ name: 'Pointer Out', description: 'Triggers on the pointer is out of the node.', path: 'events/pointerout', ctor: AbstractMesh, functionRef: (node, target: AbstractMesh) => {
        const scene = target.getScene();
        node.store.wasOver = node.store.wasOver || false;
        node.store.observer = node.store.observer || scene.onPointerObservable.add(ev => {
            const isOver = node.store.wasOver;
            node.store.wasOver = checkPointerEvent(node, target, ev, PointerEventTypes.POINTERMOVE);
            if (isOver && !node.store.wasOver)
                node.triggerSlot(0);
        });
    }, outputs: [
        { name: 'Out', type: LiteGraph.EVENT }
    ] }, object);

    /*****************************************************************************************************************************************
     * Keyboard
     *****************************************************************************************************************************************/
    const checkKeyboardEvent = ((node: IGraphNode, target: Node, ev: KeyboardInfo, type: KeyboardEventTypes): boolean => {
        if (ev.type !== type)
            return;
        
        const hasControl = ev.event.ctrlKey || ev.event.metaKey;
        const isKey = ev.event.key.toLowerCase() === node.properties['Key'].toLowerCase();
        return (isKey && !node.properties['Check Control']) || (isKey && node.properties['Check Control'] && hasControl);
    });

    registerNode({ name: 'Keyboard Down', description: 'Triggers on a keyboard key is down', path: 'events/keyboarddown', ctor: Node, functionRef: (node, target: Node) => {
        const scene = target.getScene();
        node.store.wasDown = node.store.wasDown || false;
        node.store.observer = node.store.observer || scene.onKeyboardObservable.add(ev => {
            node.store.wasDown = checkKeyboardEvent(node, target, ev, KeyboardEventTypes.KEYDOWN);
        });
        if (node.store.wasDown)
            node.triggerSlot(0);
    }, outputs: [
        { name: 'Key Down', type: LiteGraph.EVENT }
    ], properties: [
        { name: 'Key', type: 'string', defaultValue: 'a' },
        { name: 'Check Control', type: 'boolean', defaultValue: false }
    ] }, object);

    registerNode({ name: 'Keyboard Up', description: 'Triggers on a keyboard key is up', path: 'events/keyboardup', ctor: Node, functionRef: (node, target: Node) => {
        const scene = target.getScene();
        node.store.observer = node.store.observer || scene.onKeyboardObservable.add(ev => {
            checkKeyboardEvent(node, target, ev, KeyboardEventTypes.KEYUP) && node.triggerSlot(0);
        });
    }, outputs: [
        { name: 'Key Up', type: LiteGraph.EVENT }
    ], properties: [
        { name: 'Key', type: 'string', defaultValue: 'a' },
        { name: 'Check Control', type: 'boolean', defaultValue: false }
    ] }, object);

    /*****************************************************************************************************************************************
     * Abstract mesh functions.
     *****************************************************************************************************************************************/
    registerNode({ name: 'Get Mesh Direction', description: 'Returns the current direction of the node.', path: 'node/getdirection', ctor: AbstractMesh, functionRef: 'getDirection', inputs: [
        { name: 'localAxis', type: 'vec3' }
    ], outputs: [
        { name: 'vec3', type: 'vec3' }
    ], parameters: [
        { inputName: 'localAxis', type: 'vec3' }
    ] }, object);

    registerNode({ name: 'Set Mesh Direction', description: 'Sets the current direction of the node.', path: 'node/setdirection', ctor: AbstractMesh, functionRef: 'setDirection', inputs: [
        { name: 'localAxis', type: 'vec3' }
    ], parameters: [
        { inputName: 'localAxis', type: 'vec3' }
    ] }, object);

    /*****************************************************************************************************************************************
     * Animations
     *****************************************************************************************************************************************/
    registerNode({ name: 'Play Animations', description: 'Plays the animations of the current node.', path: 'animation/play', ctor: Node, functionRef: (node, target: Node) => {
        const scene = target.getScene();
        scene.beginAnimation(
            target,
            node.properties['From'],
            node.properties['To'],
            node.properties['Loop'],
            node.properties['Speed'],
            () => node.triggerSlot(0),
            null, null, null,
            () => node.triggerSlot(1)
        );
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT }
    ], properties: [
        { name: 'From', type: 'number', defaultValue: 0 },
        { name: 'To', type: 'number', defaultValue: 60 },
        { name: 'Speed', type: 'number', defaultValue: 1 },
        { name: 'Loop', type: 'boolean', defaultValue: false }
    ], outputs: [
        { name: 'On End', type: LiteGraph.EVENT },
        { name: 'On Loop', type: LiteGraph.EVENT }
    ] }, object);

    registerNode({ name: 'Stop Animations', description: 'Stops the currently playing animations of the current node.', path: 'animation/stop', ctor: Node, functionRef: (node, target: Node) => {
        const scene = target.getScene();
        scene.stopAnimation(target);
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT }
    ] }, object);
}
