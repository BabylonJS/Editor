export type VisiblityPropertyType =
    "number" | "string" | "boolean" |
    "Vector2" | "Vector3" | "Vector4";

/**
 * Sets the decorated member visible in the inspector.
 * @param type the property type.
 * @param name optional name to be shown in the editor's inspector.
 */
export function visibleInInspector(type: VisiblityPropertyType, name?: string): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._InspectorValues = ctor._InspectorValues ?? [];
        ctor._InspectorValues.push({
            type,
            name: name ?? propertyKey.toString(),
            propertyKey: propertyKey.toString(),
        });
    };
}

/**
 * Sets the decorated member linked to a child node.
 * @param nodeName defines the name of the node in children to retrieve.
 */
export function fromChildren(nodeName: string): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._ChildrenValues = ctor._ChildrenValues ?? [];
        ctor._ChildrenValues.push({
            nodeName: nodeName ?? propertyKey.toString(),
            propertyKey: propertyKey.toString(),
        });
    };
}

/**
 * Augmentify global.
 */
declare global {
    export function visibleInInspector(type: VisiblityPropertyType, name?: string): any;
    export function fromChildren(nodeName: string): any;
}

(global as any).visibleInInspector = visibleInInspector;
(global as any).fromChildren = fromChildren;
