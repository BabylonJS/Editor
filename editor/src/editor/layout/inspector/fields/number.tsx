import { useState } from "react";

import { Scalar } from "babylonjs";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorNumberFieldProps extends IEditorInspectorFieldProps {
    min?: number;
    max?: number;

    step?: number;

    onChange?: (value: number) => void;
}

export function EditorInspectorNumberField(props: IEditorInspectorNumberFieldProps) {
    const [pointerDown, setPointerDown] = useState(false);

    const [value, setValue] = useState<string>(getInspectorPropertyValue(props.object, props.property)?.toString() ?? "");
    const [oldValue, setOldValue] = useState<string>(getInspectorPropertyValue(props.object, props.property)?.toString() ?? "");

    const step = props.step ?? 0.01;
    const digitCount = props.step?.toString().split(".")[1]?.length ?? 2;

    const hasMinMax = props.min !== undefined && props.max !== undefined;
    const ratio = hasMinMax ? (Scalar.InverseLerp(props.min!, props.max!, parseFloat(value)) * 100).toFixed(0) : 0;

    return (
        <div className="flex gap-2 items-center px-2">
            {props.label &&
                <div className="w-1/2 text-ellipsis overflow-hidden whitespace-nowrap">
                    {props.label}
                </div>
            }

            <input
                type="text"
                value={value}
                onChange={(ev) => {
                    setValue(ev.currentTarget.value);

                    let float = parseFloat(ev.currentTarget.value);
                    if (!isNaN(float)) {
                        if (props.min !== undefined && float < props.min) {
                            float = props.min;
                            setValue(float.toString());
                        }

                        if (props.max !== undefined && float > props.max) {
                            float = props.max;
                            setValue(float.toString());
                        }

                        setInspectorEffectivePropertyValue(props.object, props.property, float);
                        props.onChange?.(float);
                    }
                }}
                style={{
                    cursor: pointerDown ? "ew-resize" : "auto",
                    background: hasMinMax ? `linear-gradient(to right, hsl(var(--muted-foreground) / 0.5) ${ratio}%, hsl(var(--muted-foreground) / 0.1) ${ratio}%, hsl(var(--muted-foreground) / 0.1) 100%)` : undefined,
                }}
                className="px-5 py-2 rounded-lg bg-muted-foreground/10 outline-none w-full"
                onKeyUp={(ev) => ev.key === "Enter" && ev.currentTarget.blur()}
                onBlur={(ev) => {
                    if (ev.currentTarget.value !== oldValue && !props.noUndoRedo) {
                        const oldValueFloat = parseFloat(oldValue);
                        const newValueFloat = parseFloat(ev.currentTarget.value);

                        if (!isNaN(oldValueFloat) && !isNaN(newValueFloat)) {
                            registerSimpleUndoRedo({
                                object: props.object,
                                property: props.property,

                                oldValue: oldValueFloat,
                                newValue: newValueFloat,
                            });

                            setOldValue(ev.currentTarget.value);
                        }
                    }
                }}
                onPointerDown={(ev) => {
                    setPointerDown(true);

                    document.body.style.cursor = "ew-resize";

                    let v = parseFloat(value);
                    if (isNaN(v)) {
                        v = 0;
                    }

                    if (props.min !== undefined && v < props.min) {
                        v = props.min;
                    }

                    if (props.max !== undefined && v > props.max) {
                        v = props.max;
                    }

                    const oldV = v;

                    let startX = ev.clientX;

                    let mouseUpListener: () => void;
                    let mouseMoveListener: (ev: MouseEvent) => void;

                    document.body.addEventListener("mousemove", mouseMoveListener = (ev) => {
                        v += (ev.clientX - startX) * step;
                        startX = ev.clientX;

                        if (props.min !== undefined && v < props.min) {
                            v = props.min;
                        }

                        if (props.max !== undefined && v > props.max) {
                            v = props.max;
                        }

                        setValue(v.toFixed(digitCount));
                        setInspectorEffectivePropertyValue(props.object, props.property, v);
                        props.onChange?.(v);
                    });

                    document.body.addEventListener("mouseup", mouseUpListener = () => {
                        setPointerDown(false);
                        setValue(v.toFixed(digitCount));

                        if (v !== oldV && !props.noUndoRedo) {
                            if (!isNaN(v) && !isNaN(oldV)) {
                                registerSimpleUndoRedo({
                                    object: props.object,
                                    property: props.property,

                                    oldValue: oldV,
                                    newValue: v,
                                });

                                setOldValue(v.toFixed(digitCount));
                            }
                        }

                        document.body.style.cursor = "auto";

                        document.body.removeEventListener("mouseup", mouseUpListener);
                        document.body.removeEventListener("mousemove", mouseMoveListener);
                    });
                }}
            />
        </div>
    );
}
