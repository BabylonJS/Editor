import { ReactNode } from "react";

export interface IEditorInspectorFieldProps<T = any> {
    object: T;
    property: string;

    label?: ReactNode;
    tooltip?: ReactNode;

    noUndoRedo?: boolean;
}

// TODO: remove export
export let inspectorSearch = "";

/**
 * Sets the new search value used to filter fields in inspector.
 * @param search defines the new search value to filter fields in inspector.
 */
export function setInspectorSearch(search: string) {
    inspectorSearch = search;
}

// TODO: implement filter of fields in inspector.
