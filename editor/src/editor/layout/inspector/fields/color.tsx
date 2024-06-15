import { useState } from "react";
import { Button, Popover } from "@blueprintjs/core";

import { Color3, Color4 } from "babylonjs";

import { Color } from "@jniac/color-xplr";

import { ColorPicker } from "../../../../ui/color-picker";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue } from "../../../../tools/property";

import { EditorInspectorNumberField } from "./number";
import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorColorFieldProps extends IEditorInspectorFieldProps {
    onChange?: (value: Color3 | Color4) => void;
}

export function EditorInspectorColorField(props: IEditorInspectorColorFieldProps) {
    const color = getInspectorPropertyValue(props.object, props.property) as Color3 | Color4;

    const [value, setValue] = useState(color);
    const [oldValue, setOldValue] = useState(color?.clone());

    function getPopoverContent() {
        return (
            <ColorPicker
                color={value.toHexString(false)}
                alpha={color instanceof Color4}
                onFinish={(color) => handleColorPickerChange(color)}
                onChange={(newColor) => color.set(newColor.r, newColor.g, newColor.b, newColor.a)}
            />
        );
    }

    function handleColorPickerChange(newColor: Color) {
        color.set(newColor.r, newColor.g, newColor.b, newColor.a);
        setValue(color.clone());

        if (color && !oldValue.equals(color as any) && !props.noUndoRedo) {
            const newColor = color.clone();

            registerUndoRedo({
                undo: () => color.set(oldValue.r, oldValue.g, oldValue.b, (oldValue as any).a),
                redo: () => color.set(newColor.r, newColor.g, newColor.b, (newColor as any).a),
            });

            setOldValue(color.clone());
        }
    }

    function handleChanelChange(value: number, channel: "r" | "g" | "b" | "a") {
        color[channel] = value;
        setValue(color.clone());
    }

    return (
        <div className="flex gap-2 items-center px-2">
            <div>
                {props.label}
            </div>

            <div className="flex gap-2">
                <EditorInspectorNumberField object={props.object} property={`${props.property}.r`} min={0} max={1} onChange={(v) => handleChanelChange(v, "r")} />
                <EditorInspectorNumberField object={props.object} property={`${props.property}.g`} min={0} max={1} onChange={(v) => handleChanelChange(v, "g")} />
                <EditorInspectorNumberField object={props.object} property={`${props.property}.b`} min={0} max={1} onChange={(v) => handleChanelChange(v, "b")} />

                <Popover minimal usePortal fill hasBackdrop interactionKind="click" position="left" content={getPopoverContent()}>
                    <Button
                        style={{
                            backgroundColor: `rgba(${value.r * 255}, ${value.g * 255}, ${value.b * 255}, ${(value as Color4).a ?? 1})`,
                        }}
                        className="h-full aspect-square rounded-lg p-1"
                    />
                </Popover>
            </div>
        </div>
    );
}
