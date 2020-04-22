import { PointerEventTypes, KeyboardEventTypes } from "@babylonjs/core";

export type VisiblityPropertyType =
    "number" | "string" | "boolean" |
    "Vector2" | "Vector3" | "Vector4" |
    "KeyMap";

/**
 * Sets the decorated member visible in the inspector.
 * @param type the property type.
 * @param name optional name to be shown in the editor's inspector.
 * @param defaultValue optional default value set in the TS code.
 */
export function visibleInInspector(type: VisiblityPropertyType, name?: string, defaultValue?: any): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._InspectorValues = ctor._InspectorValues ?? [];
        ctor._InspectorValues.push({
            type,
            name: name ?? propertyKey.toString(),
            propertyKey: propertyKey.toString(),
            defaultValue,
        });
    };
}

/**
 * Sets the decorated member linked to a child node.
 * @param nodeName defines the name of the node in children to retrieve.
 */
export function fromChildren(nodeName?: string): any {
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
 * Sets the decorated member linked to a node in the scene.
 * @param nodeName defines the name of the node in the scene to retrieve.
 */
export function fromScene(nodeName?: string): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._SceneValues = ctor._SceneValues ?? [];
        ctor._SceneValues.push({
            nodeName: nodeName ?? propertyKey.toString(),
            propertyKey: propertyKey.toString(),
        });
    }
}

/**
 * Sets the decorated member function to be called on the given pointer event is fired.
 * @param type the event type to listen to execute the decorated function.
 * @param onlyWhenMeshPicked defines wether or not the decorated function should be called only when the mesh is picked. default true.
 */
export function onPointerEvent(type: PointerEventTypes, onlyWhenMeshPicked: boolean = true): any {
    return (target: any, propertyKey: string | symbol) => {
        if (typeof(target[propertyKey]) !== "function") {
            throw new Error(`Decorated propery "${propertyKey.toString()}" in class "${target.constructor.name}" must be a function.`);
        }

        const ctor = target.constructor;
        ctor._PointerValues = ctor._PointerValues ?? [];
        ctor._PointerValues.push({
            type,
            onlyWhenMeshPicked,
            propertyKey: propertyKey.toString(),
        });
    };
}

/**
 * Sets the decorated member function to be called on the given keyboard key(s) is/are pressed.
 * @param key the key or array of key to listen to execute the decorated function.
 */
export function onKeyboardEvent(key: number | number[], type?: KeyboardEventTypes): any {
    return (target: any, propertyKey: string | symbol) => {
        if (typeof(target[propertyKey]) !== "function") {
            throw new Error(`Decorated propery "${propertyKey.toString()}" in class "${target.constructor.name}" must be a function.`);
        }

        const ctor = target.constructor;
        ctor._KeyboardValues = ctor._KeyboardValues ?? [];
        ctor._KeyboardValues.push({
            type,
            keys: Array.isArray(key) ? key : [key],
            propertyKey: propertyKey.toString(),
        });
    };
}

/**
 * Augmentify global.
 */
declare global {
    /**
     * Sets the decorated member visible in the inspector.
     * @param type the property type.
     * @param name optional name to be shown in the editor's inspector.
     * @param defaultValue optional default value set in the TS code.
     */
    export function visibleInInspector(type: VisiblityPropertyType, name?: string, defaultValue?: any): any;
    /**
     * Sets the decorated member linked to a child node.
     * @param nodeName defines the name of the node in children to retrieve.
     */
    export function fromChildren(nodeName: string): any;
    /**
     * Sets the decorated member linked to a node in the scene.
     * @param nodeName defines the name of the node in the scene to retrieve.
     */
    export function fromScene(nodeName: string): any;
    /**
     * Sets the decorated member function to be called on the given pointer event is fired.
     * @param type the event type to listen to execute the decorated function.
     * @param onlyWhenMeshPicked defines wether or not the decorated function should be called only when the mesh is picked. default true.
     */
    export function onPointerEvent(type: PointerEventTypes, onlyWhenMeshPicked?: boolean): any;
    /**
     * Sets the decorated member function to be called on the given keyboard key(s) is/are pressed.
     * @param key the key or array of key to listen to execute the decorated function.
     */
    export function onKeyboardEvent(key: number | number[], type?: KeyboardEventTypes): any;
}

(global as any).visibleInInspector = visibleInInspector;
(global as any).fromChildren = fromChildren;
(global as any).fromScene = fromScene;
(global as any).onPointerEvent = onPointerEvent;
(global as any).onKeyboardEvent = onKeyboardEvent;
