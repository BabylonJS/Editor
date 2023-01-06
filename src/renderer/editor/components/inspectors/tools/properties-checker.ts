import { Color3, Color4, Vector2, Vector3, Vector4, Quaternion, Node } from "babylonjs";

import { IExportedInspectorValue } from "../../../../sandbox/main";

import { Tools } from "../../../tools/tools";
import { undoRedo } from "../../../tools/undo-redo";

/**
 * Checks for the given visible properties in inspector to match the current values set on the given object.
 * @param values defines the array that contains all the visible properties of the given object.
 * @param object defines the reference to the object to configure its default values.
 */
export function checkExportedProperties(values: IExportedInspectorValue[], object: any): void {
    values.forEach((v) => {
        const value = object[v.propertyKey] ?? null;
        const defaultValue = getExportedDefaultValue(v);

        if (value === null) {
            object[v.propertyKey] = defaultValue;
        }

        const nodeFalse = v.type === "Node" && !(object[v.propertyKey] instanceof Node);
        const typeFalse = Tools.GetConstructorName(object[v.propertyKey]).toLowerCase() !== Tools.GetConstructorName(defaultValue).toLowerCase();

        if (nodeFalse && typeFalse) {
            object[v.propertyKey] = defaultValue;
        }
    });
}

/**
 * Resets all the visible properties in inspector to their default values.
 * @param values defines the array of visible properties in inspector to reset to their default values.
 * @param object defines the reference to the object to configure with default values.
 * @param onApplied defines the callback called on the values are applied (undo/redo).
 */
export function resetExportedPropertiesToDefaultValue(values: IExportedInspectorValue[], object: any, onApplied: () => void): void {
    const oldValues = values.map((v) => ({
        propertyKey: v.propertyKey,
        value: object[v.propertyKey],
    }));

    undoRedo.push({
        common: () => onApplied(),
        undo: () => oldValues.forEach((v) => object[v.propertyKey] = v.value),
        redo: () => {
            values.forEach((v) => {
                if ((v.defaultValue ?? null) === null) {
                    return;
                }

                const defaultValue = getExportedDefaultValue(v);
                object[v.propertyKey] = defaultValue;
            });
        },
    });
}

function getExportedDefaultValue(value: IExportedInspectorValue): any {
    let defaultValue = value.defaultValue ?? null;
    if (Tools.GetConstructorName(defaultValue).toLowerCase() !== value.type.toLowerCase()) {
        defaultValue = null!;
    }

    switch (value.type) {
        case "number": return defaultValue ?? 0;
        case "string": return defaultValue ?? "";
        case "boolean": return defaultValue ?? false;

        case "Texture": return null;

        case "Color3": return new Color3(defaultValue?.["r"] ?? 1, defaultValue?.["g"] ?? 1, defaultValue?.["b"] ?? 1);
        case "Color4": return new Color4(defaultValue?.["r"] ?? 1, defaultValue?.["g"] ?? 1, defaultValue?.["b"] ?? 1, defaultValue?.["a"] ?? 1);

        case "Vector2": return new Vector2(defaultValue?.["x"] ?? 0, defaultValue?.["y"] ?? 0);
        case "Vector3": return new Vector3(defaultValue?.["x"] ?? 0, defaultValue?.["y"] ?? 0, defaultValue?.["z"] ?? 0);
        case "Vector4": return new Vector4(defaultValue?.["x"] ?? 0, defaultValue?.["y"] ?? 0, defaultValue?.["z"] ?? 0, defaultValue?.["w"] ?? 0);

        case "Quaternion": return new Quaternion(defaultValue?.["x"] ?? 0, defaultValue?.["y"] ?? 0, defaultValue?.["z"] ?? 0, defaultValue?.["w"] ?? 0);

        case "Node": return null;

        default: return null;
    }
}