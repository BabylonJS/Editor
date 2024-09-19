import { IEditorInspectorFieldProps } from "./field";
import { EditorInspectorNumberField } from "./number";

export interface IEditorInspectorVectorFieldProps extends IEditorInspectorFieldProps {
    step?: number;
    asDegrees?: boolean;

    onChange?: () => void;
}

export function EditorInspectorVectorField(props: IEditorInspectorVectorFieldProps) {
    return (
        <div className="flex gap-2 items-center px-2">
            <div>
                {props.label}
            </div>

            <div className="flex gap-2">
                <EditorInspectorNumberField object={props.object} property={`${props.property}.x`} noUndoRedo={props.noUndoRedo} asDegrees={props.asDegrees} step={props.step} onChange={() => props.onChange?.()} />
                <EditorInspectorNumberField object={props.object} property={`${props.property}.y`} noUndoRedo={props.noUndoRedo} asDegrees={props.asDegrees} step={props.step} onChange={() => props.onChange?.()} />
                <EditorInspectorNumberField object={props.object} property={`${props.property}.z`} noUndoRedo={props.noUndoRedo} asDegrees={props.asDegrees} step={props.step} onChange={() => props.onChange?.()} />
            </div>
        </div>
    );
}
