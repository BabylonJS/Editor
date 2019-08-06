import { Vector2, Vector3, Vector4 } from 'babylonjs';
import { registerTypeNode } from '../graph-type-node';

/**
 * Registers all the available type nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllTypeNodes (object?: any): void {
    registerTypeNode('types/number', 'Number', 'Represents a number', () => 0);
    registerTypeNode('types/string', 'String', 'Represents a string', () => 'new string');
    registerTypeNode('types/vector2', 'Vector2', 'Represents a Vector 2D', () => Vector2.Zero());
    registerTypeNode('types/vector3', 'Vector3', 'Represents a Vector3D', () => Vector3.Zero());
    registerTypeNode('types/vector4', 'Vector4', 'Represents a Vector4D', () => Vector4.Zero());
}
