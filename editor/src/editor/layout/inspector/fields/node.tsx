import { DragEvent, useState } from "react";

import { HiOutlineTrash } from "react-icons/hi2";

import { Scene, Node } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorNodeFieldProps extends IEditorInspectorFieldProps {
    scene: Scene;
    onChange?: (value: Node | null) => void;
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

		setDragOver(false);

		handleSetNode(
			props.scene.getNodeById(data[0]),
		);
	}

	function handleSetNode(node: Node | null) {
		setValue(node);
		setInspectorEffectivePropertyValue(props.object, props.property, node);

		if (node !== value) {
			props.onChange?.(node);

			registerSimpleUndoRedo({
				object: props.object,
				property: props.property,

				oldValue: value,
				newValue: node,
			});
		}
	}

	return (
		<div className="flex gap-2 items-center px-2">
			{props.label &&
                <div className="w-32 text-ellipsis overflow-hidden whitespace-nowrap">
                	{props.label}
                </div>
			}

			<div
				onDragOver={(ev) => handleDragOver(ev)}
				onDragLeave={(ev) => handleDragLeave(ev)}
				onDrop={(ev) => handleDrop(ev)}
				className={`
                    flex p-2 rounded-lg text-center
                    ${dragOver ? "bg-background" : " bg-secondary"}
                    transition-all duration-300 ease-in-out
                `}
			>
				<div className="w-48 text-ellipsis overflow-hidden whitespace-nowrap">
					{value?.name ?? "None"}
				</div>

				<Button
					variant="ghost"
					className="w-6 h-6 p-1"
					onClick={() => handleSetNode(null)}
				>
					<HiOutlineTrash className="w-5 h-5" />
				</Button>
			</div>
		</div>
	);
}
