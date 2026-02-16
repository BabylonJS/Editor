import { readJSON } from "fs-extra";
import { basename, extname } from "path/posix";

import { MdOutlineInfo } from "react-icons/md";
import { HiOutlineTrash } from "react-icons/hi2";
import { DragEvent, useEffect, useState } from "react";

import { VisibleInspectorDecoratorAssetPossibleTypes } from "babylonjs-editor-tools";

import { showAlert } from "../../../../ui/dialog";
import { Button } from "../../../../ui/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

import { getProjectAssetsRootUrl } from "../../../../project/configuration";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorAssetFieldProps extends IEditorInspectorFieldProps {
	assetType: VisibleInspectorDecoratorAssetPossibleTypes;
	typeRestriction?: string;

	onChange?: (assetPath: string | null) => void;
}

export function EditorInspectorAssetField(props: IEditorInspectorAssetFieldProps) {
	const [dragOver, setDragOver] = useState(false);
	const [value, setValue] = useState<string | null>(null);

	useEffect(() => {
		const nodeOrId = getInspectorPropertyValue(props.object, props.property) ?? null;
		setValue(nodeOrId);
	}, [props.object, props.property]);

	function handleDragOver(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		ev.stopPropagation();

		if (ev.dataTransfer.types.includes("assets")) {
			setDragOver(true);
		}
	}

	function handleDragLeave(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		ev.stopPropagation();

		setDragOver(false);
	}

	async function handleDrop(ev: DragEvent<HTMLDivElement>) {
		setDragOver(false);

		const data = JSON.parse(ev.dataTransfer.getData("assets")) as string[];
		if (!data) {
			return;
		}

		const rootUrl = getProjectAssetsRootUrl();
		if (!rootUrl) {
			return;
		}

		const relativePath = data[0].replace(rootUrl, "");
		const extension = extname(relativePath).toLowerCase();

		if (props.assetType === "json") {
			try {
				await readJSON(data[0]);
			} catch (e) {
				return showAlert("Can't assign asset", "Only parsable JSON files are supported.");
			}
		}

		if (props.assetType === "gui" && extension !== ".gui") {
			return showAlert("Can't assign asset", "Only GUI files (.gui) are supported.");
		}

		if (props.assetType === "nodeParticleSystemSet" && extension !== ".npss") {
			return showAlert("Can't assign asset", "Only Node Particle System Set files (.npss) are supported.");
		}

		if (props.assetType === "scene" && extension !== ".scene") {
			return showAlert("Can't assign asset", "Only Scene files (.scene) are supported.");
		}

		if (props.assetType === "material") {
			if (extension !== ".material") {
				return showAlert("Can't assign asset", "Only Material files (.material) are supported.");
			}

			if (props.typeRestriction && props.typeRestriction !== "AnyMaterial") {
				const materialData = await readJSON(data[0]);
				const fullTypeRestriction = `BABYLON.${props.typeRestriction}`;

				const customType = materialData.customType ?? "BABYLON.StandardMaterial";
				if (customType !== fullTypeRestriction) {
					return showAlert(
						"Can't assign asset",
						<>
							Only <b>BABYLON.{props.typeRestriction}</b> materials are supported. You tried to drag'n'drop a <b>{customType}</b> material.
						</>
					);
				}
			}
		}

		handleSetAssetRelativePath(relativePath);
	}

	function handleSetAssetRelativePath(path: string | null) {
		if (path === value) {
			return;
		}

		setValue(path);
		setInspectorEffectivePropertyValue(props.object, props.property, path);

		props.onChange?.(path);

		registerSimpleUndoRedo({
			object: props.object,
			property: props.property,

			oldValue: value,
			newValue: path,
		});
	}

	return (
		<div className="flex gap-2 items-center px-2">
			{props.label && (
				<div className="flex items-center gap-2 w-1/3 text-ellipsis overflow-hidden whitespace-nowrap">
					<div>{props.label}</div>

					{props.tooltip && (
						<TooltipProvider delayDuration={0}>
							<Tooltip>
								<TooltipTrigger>
									<MdOutlineInfo size={24} />
								</TooltipTrigger>
								<TooltipContent className="bg-background text-muted-foreground text-sm p-2">{props.tooltip}</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</div>
			)}

			<div
				onDragOver={(ev) => handleDragOver(ev)}
				onDragLeave={(ev) => handleDragLeave(ev)}
				onDrop={(ev) => handleDrop(ev)}
				className={`
                    flex items-center px-5 py-1.5 rounded-lg
                    ${props.label ? "w-2/3" : "w-full"}
                    ${dragOver ? "bg-background scale-110" : " bg-secondary"}
                    transition-all duration-300 ease-in-out
                `}
			>
				<div className="flex-1 text-center text-ellipsis overflow-hidden whitespace-nowrap">{value ? basename(value) : "None"}</div>

				<Button variant="ghost" className="w-6 h-6 p-1" onClick={() => handleSetAssetRelativePath(null)}>
					<HiOutlineTrash className="w-5 h-5" />
				</Button>
			</div>
		</div>
	);
}
