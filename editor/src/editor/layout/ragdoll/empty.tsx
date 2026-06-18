import { dirname, extname, join } from "path/posix";

import { DragEvent, useState } from "react";

import { showAlert } from "../../../ui/dialog";

import { projectConfiguration } from "../../../project/configuration";

import { RagdollEditor } from "./editor";

const supportedExtensions = [".babylon", ".glb", ".gltf"];

export interface IRagdollEditorEmptyStateProps {
	ragdollEditor: RagdollEditor;
}

export function RagdollEditorEmptyState(props: IRagdollEditorEmptyStateProps) {
	const [dragOver, setDragOver] = useState(false);

	function handleDragOver(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		setDragOver(true);
	}

	function handleDragLeave() {
		setDragOver(false);
	}

	function handleDrop(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		ev.stopPropagation();
		setDragOver(false);

		const absolutePaths = JSON.parse(ev.dataTransfer.getData("assets")) as string[];
		if (!Array.isArray(absolutePaths) || !absolutePaths.length) {
			return;
		}

		const extension = extname(absolutePaths[0]).toLowerCase();
		if (!supportedExtensions.includes(extension)) {
			return showAlert(`Unsupported file type`, `Unsupported file type. Please drop a file with one of the following extensions: ${supportedExtensions.join(", ")}`);
		}

		const rootPath = join(dirname(projectConfiguration.path!), "/");
		const relativePath = absolutePaths[0].replace(rootPath, "");

		props.ragdollEditor.loadAsset(relativePath);
	}

	return (
		<div
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			className={`
                flex flex-col justify-center items-center w-full h-full rounded-lg border border-dashed
                ${dragOver ? "bg-secondary-foreground/35" : ""}
                transition-colors duration-300 ease-in-out    
            `}
		>
			<div className="text-center px-10">No asset assigned. Please drag'n'drop a 3d model file (.babylon, .glb, .gltf, etc.) to get started.</div>
		</div>
	);
}
