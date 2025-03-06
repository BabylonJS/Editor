import { DragEvent, useState } from "react";

import { Scene, Node } from "babylonjs";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorNodeFieldProps extends IEditorInspectorFieldProps {
    scene: Scene;
}

export function EditorInspectorNodeField(props: IEditorInspectorNodeFieldProps) {
    const [dragOver, setDragOver] = useState(false);
    const [value, setValue] = useState<Node | null>(getInspectorPropertyValue(props.object, props.property) ?? null);

    function handleDragOver(ev: DragEvent<HTMLDivElement>) {
        ev.preventDefault();
        ev.stopPropagation();

        setDragOver(true);
    }

    function handleDragLeave(ev: DragEvent<HTMLDivElement>) {
        ev.preventDefault();
        ev.stopPropagation();

        setDragOver(false);
    }

    function handleDrop(ev: DragEvent<HTMLDivElement>) {
        const data = JSON.parse(ev.dataTransfer.getData("graph/node")) as string[];
        if (!data) {
            return;
        }

        const node = props.scene.getNodeById(data[0]);
        if (node) {
            setValue(node);
            setInspectorEffectivePropertyValue(props.object, props.property, node);

            if (node !== value) {
                registerSimpleUndoRedo({
                    object: props.object,
                    property: props.property,

                    oldValue: value,
                    newValue: node,
                });
            }
        }
    }

    return (
        <div className="flex gap-2 items-center px-2">
            {props.label &&
                <div className="w-1/2 text-ellipsis overflow-hidden whitespace-nowrap">
                    {props.label}
                </div>
            }

            <div
                onDragOver={(ev) => handleDragOver(ev)}
                onDragLeave={(ev) => handleDragLeave(ev)}
                onDrop={(ev) => handleDrop(ev)}
                className={`
                    w-full p-2 rounded-lg text-center
                    ${dragOver ? "bg-background" : " bg-secondary"}
                    transition-all duration-300 ease-in-out
                `}
            >
                {value?.name ?? "None"}
            </div>
        </div>
    );
}
