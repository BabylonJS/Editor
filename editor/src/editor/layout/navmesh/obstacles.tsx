import { IoMdCube } from "react-icons/io";
import { AiOutlineClose } from "react-icons/ai";
import { DragEvent, MouseEvent, useEffect, useState } from "react";

import { AbstractMesh } from "babylonjs";

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../../ui/shadcn/ui/context-menu";

import { Editor } from "../../main";

import { isAbstractMesh } from "../../../tools/guards/nodes";

import { NavMeshEditor } from "./editor";

export interface INavMeshEditorObstaclesProps {
	editor: Editor;
	navMeshEditor: NavMeshEditor;
}

export function NavMeshEditorObstacles(props: INavMeshEditorObstaclesProps) {
	const [meshes, setMeshes] = useState<AbstractMesh[]>([]);
	const [selectedMeshes, setSelectedMeshes] = useState<AbstractMesh[]>([]);

	useEffect(() => {
		const result = props.editor.layout.preview.scene.meshes.filter((mesh) => {
			return props.navMeshEditor.configuration.obstacleMeshes.find((m) => m.id === mesh.id);
		});

		setMeshes(result);
	}, [props.navMeshEditor.configuration.obstacleMeshes]);

	function handleDragOver(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
	}

	function handleDragLeave(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
	}

	function handleDrop(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();

		let needsUpdate = false;

		const result = props.navMeshEditor.configuration.obstacleMeshes.slice(0);
		const graphNode = JSON.parse(event.dataTransfer.getData("graph/node")) as string[];

		graphNode.forEach((nodeId) => {
			const node = props.editor.layout.preview.scene.getNodeById(nodeId);
			if (!node || !isAbstractMesh(node)) {
				return;
			}

			const existingMesh = props.navMeshEditor.configuration.obstacleMeshes.find((m) => m.id === node.id);
			if (!existingMesh) {
				needsUpdate = true;
				result.push({
					id: node.id,
					enabled: true,
					type: "box",
				});
			}
		});

		if (needsUpdate) {
			props.navMeshEditor.configuration.obstacleMeshes = result;
			props.navMeshEditor.createDebugObstacles();
		}
	}

	function handleMeshClick(ev: MouseEvent<HTMLDivElement>, mesh: AbstractMesh): void {
		if (ev.ctrlKey || ev.metaKey) {
			const newSelectedMeshes = selectedMeshes.slice();
			if (newSelectedMeshes.includes(mesh)) {
				const index = newSelectedMeshes.indexOf(mesh);
				if (index !== -1) {
					newSelectedMeshes.splice(index, 1);
				}
			} else {
				newSelectedMeshes.push(mesh);
			}

			setSelectedMeshes(newSelectedMeshes);
		} else if (ev.shiftKey) {
			const newSelectedMeshes = selectedMeshes.slice();
			const lastSelectedMesh = newSelectedMeshes[newSelectedMeshes.length - 1];
			if (!lastSelectedMesh) {
				return setSelectedMeshes([mesh]);
			}

			const lastIndex = meshes.indexOf(lastSelectedMesh);
			const currentIndex = meshes.indexOf(mesh);

			const [start, end] = lastIndex < currentIndex ? [lastIndex, currentIndex] : [currentIndex, lastIndex];

			for (let i = start; i <= end; i++) {
				const ag = meshes[i];
				if (!newSelectedMeshes.includes(ag)) {
					newSelectedMeshes.push(ag);
				}
			}

			setSelectedMeshes(newSelectedMeshes);
		} else {
			setSelectedMeshes([mesh]);
		}
	}

	function handleRemoveMeshes() {
		const obstacleMeshes = props.navMeshEditor.configuration.obstacleMeshes.slice(0);

		selectedMeshes.forEach((mesh) => {
			const index = obstacleMeshes.findIndex((m) => m.id === mesh.id);
			if (index !== -1) {
				obstacleMeshes.splice(index, 1);
			}
		});

		props.navMeshEditor.configuration.obstacleMeshes = obstacleMeshes;
		props.navMeshEditor.createDebugObstacles();
	}

	return (
		<ContextMenu>
			<ContextMenuTrigger className="w-full h-full">
				<div className="flex flex-col gap-2 w-full h-full p-2">
					<div className="flex justify-center items-center">Obstacle meshes</div>

					<div className="flex flex-1 flex-col w-full h-full" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
						<div className="flex flex-col h-full bg-black/50 text-white/75 rounded-lg overflow-y-auto">
							{meshes.map((mesh) => (
								<div
									key={mesh.id}
									onClick={(ev) => handleMeshClick(ev, mesh)}
									className={`
								flex items-center gap-2 p-2
								${selectedMeshes.includes(mesh) ? "bg-muted" : "hover:bg-muted/35"}
								transition-all duration-300 ease-in-out
							`}
								>
									<IoMdCube className="w-4 h-4" />
									{mesh.name}
								</div>
							))}
						</div>
					</div>
				</div>
			</ContextMenuTrigger>

			<ContextMenuContent>
				<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => handleRemoveMeshes()}>
					<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
