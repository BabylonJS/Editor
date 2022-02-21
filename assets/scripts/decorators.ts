import { PointerEventTypes, KeyboardEventTypes } from "@babylonjs/core";

export type VisiblityPropertyType =
    "number" | "string" | "boolean" |
    "Vector2" | "Vector3" | "Vector4" |
    "Color3" | "Color4" |
    "KeyMap";

export interface IVisibleInInspectorOptions {
    /**
     * Defines the section of the inspector.
     */
    section?: string;
}

/**
 * Sets the decorated member visible in the inspector.
 * @param type the property type.
 * @param name optional name to be shown in the editor's inspector.
 * @param defaultValue optional default value set in the TS code.
 * @param options defines the optional object defining the options of the decorated property.
 */
export function visibleInInspector(type: VisiblityPropertyType, name?: string, defaultValue?: any, options?: IVisibleInInspectorOptions): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._InspectorValues = ctor._InspectorValues ?? [];
        ctor._InspectorValues.push({
            type,
            name: name ?? propertyKey.toString(),
            propertyKey: propertyKey.toString(),
            defaultValue,
            options,
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
 * Sets the decorated member linked to a particle system which has the current Mesh attached.
 * @param particleSystemname the name of the attached particle system to retrieve.
 */
export function fromParticleSystems(particleSystemname?: string): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._ParticleSystemValues = ctor._ParticleSystemValues ?? [];
        ctor._ParticleSystemValues.push({
            particleSystemName: particleSystemname ?? propertyKey.toString(),
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
export function onKeyboardEvent(key: number | number[] | string | string[], type?: KeyboardEventTypes): any {
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
