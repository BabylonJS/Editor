import { ReactNode } from "react";

export interface IEditorInspectorFieldProps<T = unknown> {
    object: T;
    property: string;

    label?: ReactNode;
    tooltip?: ReactNode;

    noUndoRedo?: boolean;
}
