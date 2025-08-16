import { dirname, join } from "path/posix";

import { DragEvent, useState } from "react";
import { MdOutlineQuestionMark } from "react-icons/md";

import { XMarkIcon } from "@heroicons/react/20/solid";

import { Mesh, Color3 } from "babylonjs";

import { registerUndoRedo } from "../../../../../tools/undoredo";

import { projectConfiguration } from "../../../../../project/configuration";

import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSectionField } from "../../fields/section";
import { EditorInspectorColorField } from "../../fields/color";

export interface IGroundMeshGeometryInspectorProps {
	proxy: any;
	object: Mesh;
}

export function GroundMeshGeometryInspector(props: IGroundMeshGeometryInspectorProps) {
	const [dragOver, setDragOver] = useState(false);

	function handleDragOver(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		setDragOver(true);
	}

	function handleDragLeave(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		setDragOver(false);
	}

	function handleOnDrop(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		setDragOver(false);
		if (projectConfiguration.path) {
			let texturePath = JSON.parse(ev.dataTransfer.getData("assets"))[0];
			texturePath = texturePath.replace(join(dirname(projectConfiguration.path!), "/"), "");

			const oldHeightMapTexturePath = props.object.metadata.heightMapTexturePath;

			registerUndoRedo({
				executeRedo: true,
				undo: () => (props.proxy.heightMapTexturePath = oldHeightMapTexturePath),
				redo: () => (props.proxy.heightMapTexturePath = texturePath),
			});
		}
	}

	const o = {
		colorFilter: Color3.FromArray(props.proxy.colorFilter),
	};

	return (
		<EditorInspectorSectionField title="Ground">
			<EditorInspectorNumberField object={props.proxy} property="width" label="Width" step={0.1} />
			<EditorInspectorNumberField object={props.proxy} property="height" label="Height" step={0.1} />
			<EditorInspectorNumberField object={props.proxy} property="subdivisions" label="Subdivisions" step={1} min={1} />

			<div
				onDrop={handleOnDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				className={`flex items-start gap-2 p-2 rounded-lg ${dragOver ? "bg-muted-foreground/75 dark:bg-muted-foreground/20" : "bg-muted-foreground/10 dark:bg-muted-foreground/5"} transition-all duration-300 ease-in-out`}
			>
				<div className="flex items-center justify-center w-24 h-24">
					{props.proxy.heightMapTexturePath ? (
						<img className="w-full h-full aspect-square object-contain" src={join(dirname(projectConfiguration.path ?? ""), props.proxy.heightMapTexturePath)} />
					) : (
						<div className="flex items-center justify-center bg-background rounded-lg w-full h-full">
							<MdOutlineQuestionMark className="w-8 h-8" />
						</div>
					)}
				</div>

				<div className="flex flex-1 flex-col gap-2">
					<div className="px-2">HeightMap Properties</div>
					<EditorInspectorNumberField object={props.proxy} property="alphaFilter" label="Alpha Filter" step={1} min={0} max={255} />
				</div>

				<div
					onClick={() => (props.proxy.heightMapTexturePath = null)}
					className="flex justify-center items-center h-full w-14 hover:bg-muted-foreground rounded-lg transition-all duration-300"
				>
					<XMarkIcon className="w-6 h-6" />
				</div>
			</div>

			<EditorInspectorColorField
				noUndoRedo
				object={o}
				property="colorFilter"
				label="Filter"
				onChange={(color) => {
					props.proxy.colorFilter = color.asArray();
				}}
				onFinishChange={(color, oldColor) => {
					registerUndoRedo({
						executeRedo: true,
						undo: () => (props.proxy.colorFilter = oldColor.asArray()),
						redo: () => (props.proxy.colorFilter = color.asArray()),
					});
				}}
			/>

			<EditorInspectorNumberField object={props.proxy} property="minHeight" label="Min Height" step={1} />
			<EditorInspectorNumberField object={props.proxy} property="maxHeight" label="Max Height" step={1} />
			<EditorInspectorNumberField object={props.proxy} property="smoothFactor" label="Smooth Factor" step={1} min={0} max={128} />
		</EditorInspectorSectionField>
	);
}
