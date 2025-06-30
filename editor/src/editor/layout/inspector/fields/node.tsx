import { DragEvent, useEffect, useState } from "react";

import { MdOutlineInfo } from "react-icons/md";
import { HiOutlineTrash } from "react-icons/hi2";

import { Scene, Node, IParticleSystem, Sound } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

import { getSoundById } from "../../../../tools/sound/tools";
import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorNodeFieldProps<T = Node | IParticleSystem | Sound> extends IEditorInspectorFieldProps {
	scene: Scene;
	onChange?: (value: T | null) => void;
}

export function EditorInspectorNodeField<T extends Node | IParticleSystem | Sound>(props: IEditorInspectorNodeFieldProps<T>) {
	const [dragOver, setDragOver] = useState(false);
	const [value, setValue] = useState<T | null>(null);

	useEffect(() => {
		const nodeOrId = getInspectorPropertyValue(props.object, props.property) ?? null;
		if (nodeOrId) {
			if (typeof nodeOrId === "string") {
				setValue(
					getObjectById(nodeOrId),
				);
			} else {
				setValue(nodeOrId as T);
			}
		} else {
			setValue(null);
		}
	}, [props.object, props.property]);

	function getObjectById(id: string): T | null {
		return props.scene.getNodeById(id) as T
			?? props.scene.particleSystems?.find((ps) => ps.id === id) as T
			?? getSoundById(id, props.scene) as T;
	}

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
			getObjectById(data[0]),
		);
	}

	function handleSetNode(node: T | null) {
		if (node === value) {
			return;
		}

		setValue(node);
		setInspectorEffectivePropertyValue(props.object, props.property, node);

		props.onChange?.(node);

		registerSimpleUndoRedo({
			object: props.object,
			property: props.property,

			oldValue: value,
			newValue: node,
		});
	}

	return (
		<div className="flex gap-2 items-center px-2">
			{props.label &&
				<div className="flex items-center gap-2 w-1/2 text-ellipsis overflow-hidden whitespace-nowrap">
					<div>
						{props.label}
					</div>

					{props.tooltip &&
						<TooltipProvider delayDuration={0}>
							<Tooltip>
								<TooltipTrigger>
									<MdOutlineInfo size={24} />
								</TooltipTrigger>
								<TooltipContent className="bg-muted text-muted-foreground text-sm p-2">
									{props.tooltip}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					}
				</div>
			}

			<div
				onDragOver={(ev) => handleDragOver(ev)}
				onDragLeave={(ev) => handleDragLeave(ev)}
				onDrop={(ev) => handleDrop(ev)}
				className={`
                    flex items-center px-5 py-1.5 rounded-lg w-full
                    ${dragOver ? "bg-background" : " bg-secondary"}
                    transition-all duration-300 ease-in-out
                `}
			>
				<div className="flex-1 text-center text-ellipsis overflow-hidden whitespace-nowrap">
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
