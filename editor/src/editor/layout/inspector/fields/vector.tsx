import { IEditorInspectorFieldProps } from "./field";
import { EditorInspectorNumberField } from "./number";

export function EditorInspectorVectorField(props: IEditorInspectorFieldProps) {
    return (
        <div className="flex gap-2 items-center px-2">
            <div>
                {props.label}
            </div>

            <div className="flex gap-2">
                <EditorInspectorNumberField object={props.object} property={`${props.property}.x`} />
                <EditorInspectorNumberField object={props.object} property={`${props.property}.y`} />
                <EditorInspectorNumberField object={props.object} property={`${props.property}.z`} />
            </div>
        </div>
    );
}
