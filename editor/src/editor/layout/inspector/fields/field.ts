import { ReactNode } from "react";

export interface IEditorInspectorFieldProps<T = any> {
    object: T;
    property: string;

    label?: ReactNode;
    tooltip?: ReactNode;

    noUndoRedo?: boolean;
}
