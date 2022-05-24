import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";

export type VisiblityPropertyType =
    "number" | "string" | "boolean" |
    "Vector2" | "Vector3" | "Vector4" |
    "Color3" | "Color4" |
    "Texture" |
    "KeyMap";

export interface IVisibleInInspectorOptions {
    /**
     * Defines the section of the inspector.
     */
    section?: string;

    /**
     * In case of numbers, defines the minimum value.
     */
    min?: number;
    /**
     * In case of numbers, defines the maximum value.
     */
    max?: number;
    /**
     * In case of numbers, defines the step applied in the editor.
     */
    step?: number;
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
            options,
            defaultValue,
            propertyKey: propertyKey.toString(),
            name: name ?? propertyKey.toString(),
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
            propertyKey: propertyKey.toString(),
            nodeName: nodeName ?? propertyKey.toString(),
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
            propertyKey: propertyKey.toString(),
            nodeName: nodeName ?? propertyKey.toString(),
        });
    };
}

/**
 * Sets the decorated member linked to a particle system which has the current Mesh attached.
 * @param particleSystemName defines the name of the attached particle system to retrieve.
 */
export function fromParticleSystems(particleSystemName?: string): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._ParticleSystemValues = ctor._ParticleSystemValues ?? [];
        ctor._ParticleSystemValues.push({
            propertyKey: propertyKey.toString(),
            particleSystemName: particleSystemName ?? propertyKey.toString(),
        });
    };
}

/**
 * Sets the decorated member linked to an animation group.
 * @param animationGroupName defines the name of the animation group to retrieve.
 */
export function fromAnimationGroups(animationGroupName?: string): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._AnimationGroupValues = ctor._AnimationGroupValues ?? [];
        ctor._AnimationGroupValues.push({
            propertyKey: propertyKey.toString(),
            animationGroupName: animationGroupName ?? propertyKey.toString(),
        });
    };
}

/**
 * Sets the decorated member linked to a sound.
 * @param soundName defines the name of the sound to retrieve.
 * @param type defines the type of sound to retrieve. "global" means "not spatial". By default, any sound matching the given name is retrieved.
 */
export function fromSounds(soundName?: string, type?: "global" | "spatial"): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._SoundValues = ctor._SoundValues ?? [];
        ctor._SoundValues.push({
            type,
            propertyKey: propertyKey.toString(),
            soundName: soundName ?? propertyKey.toString(),
        });
    };
}

/**
 * Sets the decorated member linked to a material.
 * @param materialName defines the name of the material to retrieve.
 */
export function fromMaterials(materialName?: string): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._MaterialsValues = ctor._MaterialsValues ?? [];
        ctor._MaterialsValues.push({
            propertyKey: propertyKey.toString(),
            nodeName: materialName ?? propertyKey.toString(),
        });
    };
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
            propertyKey: propertyKey.toString(),
            keys: Array.isArray(key) ? key : [key],
        });
    };
}
