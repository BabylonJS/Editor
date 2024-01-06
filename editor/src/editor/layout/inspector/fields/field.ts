import { ReactNode } from "react";

export interface IEditorInspectorFieldProps<T = unknown> {
    object: T;
    property: string;

    label?: ReactNode;
}

export function setInspectorEffectivePropertyValue(object: any, property: string, newValue: any): void {
    const parts = property.split('.');

    let value = object;

    for (let i = 0; i < parts.length - 1; ++i) {
        value = value[parts[i]];
    }

    value[parts[parts.length - 1]] = newValue;
}

export function getInspectorPropertyValue(object: any, property: string) {
    const parts = property.split('.');

    let value = object;

    for (let i = 0; i < parts.length; ++i) {
        value = value[parts[i]];
    }

    return value;
}
