import { Observable } from "@babylonjs/core/Misc/observable";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";

import { Control } from "@babylonjs/gui/2D/controls/control";

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
    return (target: any, propertyKey: string | symbol) => {
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
    return (target: any, propertyKey: string | symbol) => {
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
        if (typeof (target[propertyKey]) !== "function") {
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
        if (typeof (target[propertyKey]) !== "function") {
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

/**
 * Sets the decorated member function to be called each time the engine is resized.
 * The decorated function can take 2 arguments:
 *  - width: number defines the new width
 *  - height: number defines the new height
 */
export function onEngineResize(): any {
    return (target: any, propertyKey: string | symbol) => {
        if (typeof (target[propertyKey]) !== "function") {
            throw new Error(`Decorated propery "${propertyKey.toString()}" in class "${target.constructor.name}" must be a function.`);
        }

        const ctor = target.constructor;
        ctor._ResizeValues = ctor._ResizeValues ?? [];
        ctor._ResizeValues.push({
            propertyKey: propertyKey.toString(),
        });
    };
}

/**
 * Sets the component as a GUI component. Loads the GUI data located at the given path
 * and allows to use the @fromControls decorator.
 * @param path defines the path to the GUI data to load and parse.
 */
export function guiComponent(path: string): any {
    return (target: any) => {
        target._GuiPath = path;
    };
}

/**
 * Sets the decorated member linked to a GUI control.
 * Handled only if the component is tagged @guiComponent
 * @param controlName defines the name of the control to retrieve.
 */
export function fromControls(controlName?: string): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._ControlsValues = ctor._ControlsValues ?? [];
        ctor._ControlsValues.push({
            propertyKey: propertyKey.toString(),
            controlName: controlName ?? propertyKey.toString(),
        });
    };
}

type KeyOfType<T, V> = keyof {
    [P in keyof T as T[P] extends V? P: never]: any;
}

function onControlEvent(controlName: string, type: KeyOfType<Control, Observable<any>>): any {
    return (target: any, propertyKey: string | symbol) => {
        if (typeof (target[propertyKey]) !== "function") {
            throw new Error(`Decorated propery "${propertyKey.toString()}" in class "${target.constructor.name}" must be a function.`);
        }

        const ctor = target.constructor;
        ctor._ControlsClickValues = ctor._ControlsClickValues ?? [];
        ctor._ControlsClickValues.push({
            type,
            controlName,
            propertyKey: propertyKey.toString(),
        });
    };
}

/**
 * Sets the decorated member function to be called on the control identified by the given name is clicked.
 * Handled only if the component is tagged @guiComponent
 * @param controlName defines the name of the control to listen the click event.
 */
export function onControlClick(controlName: string): any {
    return onControlEvent(controlName, "onPointerClickObservable");
}

/**
 * Sets the decorated member function to be called on the pointer enters the control identified by the given name.
 * Handled only if the component is tagged @guiComponent
 * @param controlName defines the name of the control to listen the pointer enter event.
 */
export function onControlPointerEnter(controlName: string): any {
    return onControlEvent(controlName, "onPointerEnterObservable");
}

/**
 * Sets the decorated member function to be called on the pointer is out of the control identified by the given name.
 * Handled only if the component is tagged @guiComponent
 * @param controlName defines the name of the control to listen the pointer out event.
 */
export function onControlPointerOut(controlName: string): any {
    return onControlEvent(controlName, "onPointerOutObservable");
}
