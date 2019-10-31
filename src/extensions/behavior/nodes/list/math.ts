import { Vector2, Vector3, Vector4, Scalar } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { GraphNode, registerNode } from '../graph-node';

/**
 * Registers all the available math nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllMathNodes (object?: any): void {
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
    ], drawBackground: (node) => node.properties['Amount'].toString() }, object);

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
    ], drawBackground: (node) => {
        switch (node.properties['Operator']) {
            case '+': return 'Add';
            case '-': return 'Subtract';
            case '*': return 'Multiply';
            case '/': return 'Divide';
            default: return ''; // Should not happen
        }
     } }, object);

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
    ], drawBackground: (node) => node.properties['Operator'] }, object);

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
        const a = node.getInputData(1);
        const b = node.getInputData(2);
        if (a === b) node.triggerSlot(0);
        if (a !== b) node.triggerSlot(1);
        if (a >= b) node.triggerSlot(2);
        if (a <= b) node.triggerSlot(3);
        if (a > b) node.triggerSlot(4);
        if (a < b) node.triggerSlot(5);
    }, inputs: [
        { name: 'Execute', type: LiteGraph.EVENT },
        { name: 'a', type: 'number,boolean,string' },
        { name: 'b', type: 'number,boolean,string' }
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

    registerNode({ name: 'Tangent', description: 'Performs a tangent operation', path: 'math/tan', ctor: Object, functionRef: (node) => {
        return Math.tan(node.getInputData<number>(0));
    }, inputs: [
        { name: 'In', type: 'number' }
    ], outputs: [
        { name: 'Out', type: 'number' }
    ] }, object);

    registerNode({ name: 'Abs', description: 'Returns the absolute position of the input number', path: 'math/abs', ctor: Object, functionRef: (node) => {
        return (Math.abs(node.getInputData(0)) || 0);
    }, inputs: [
        { name: 'In', type: 'number' }
    ], outputs: [
        { name: 'Out', type: 'number' }
    ] }, object);

    registerNode({ name: 'Random', description: 'Returns a random number in the given range', path: 'math/random', ctor: Object, functionRef: (node) => {
        const random = Math.random();
        node.setOutputData(0, random * (node.properties['Max'] - node.properties['Min']) + node.properties['Min']);
    }, outputs: [
        { name: 'Value', type: 'number' }
    ], properties: [
        { name: 'Min', defaultValue: 0, type: 'number' },
        { name: 'Max', defaultValue: 1, type: 'number' }
    ] }, object);

    registerNode({ name: 'Floor', description: 'Floors the given number of vector', path: 'math/floor', ctor: Object, functionRef: (node) => {
        // Number
        node.setOutputData(0, Math.floor(node.getInputData<number>(0) || 0));

        // Vector
        const vec = GraphNode.nodeToOutput<Vector2 | Vector3 | Vector4>(node.getInputData(1));
        if (vec)
            node.setOutputData(1, vec.floor());
    }, inputs: [
        { name: 'Input Number', type: 'number' },
        { name: 'Input Vector', type: 'vec2,vec3,vec4' }
    ], outputs: [
        { name: 'Number Result', type: 'number' },
        { name: 'Vector Result', type: 'vec2,vec3,vec4' }
    ] }, object);

    registerNode({ name: 'Exp', description: 'Returns e (the base of natural logarithms) raised to the given power', path: 'math/exp', ctor: Object, functionRef: (node) => {
        const i = node.getInputData<number>(0);
        if (i === null || i === undefined)
            node.setOutputData(0, Math.exp(node.properties['Power']));
        else
            node.setOutputData(0, Math.exp(i));
    }, inputs: [
        { name: 'Power', type: 'number' }
    ], outputs: [
        { name: 'Result', type: 'number' }
    ], properties: [
        { name: 'Power', defaultValue: 1, type: 'number' }
    ] }, object);

    registerNode({ name: 'Clamp', description: 'Clamps the given value in the given interval [min, max]', path: 'math/clamp', ctor: Object, functionRef: (node) => {
        const val = node.getInputData<number>(0);
        if (val === null || val === undefined)
            return;

        node.setOutputData(0, Scalar.Clamp(val, node.properties['Min'], node.properties['Max']));
    }, inputs: [
        { name: 'Value', type: 'number' },
        { name: 'Min', type: 'number' },
        { name: 'Max', type: 'number' }
    ], outputs: [
        { name: 'Result', type: 'number' }
    ] }, object);
}
