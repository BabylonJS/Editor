import { DragEvent, MouseEvent, useEffect, useState } from "react";

import { IoMdCube } from "react-icons/io";
import { AiOutlineClose } from "react-icons/ai";

import { AbstractMesh, Scene } from "babylonjs";

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../../../ui/shadcn/ui/context-menu";

import { isAbstractMesh } from "../../../../tools/guards/nodes";

import { INavMeshObstacleConfiguration, INavMeshStaticMeshConfiguration } from "../types";

export interface INavMeshEditorListComponentProps<T> {
	scene: Scene;
	search: string;
	items: T[];

	onCreateItem: (mesh: AbstractMesh) => T;
	onItemsChange: (items: T[], updateNavMesh: boolean) => void;
}

export function NavMeshEditorListComponent<T extends INavMeshStaticMeshConfiguration | INavMeshObstacleConfiguration>(props: INavMeshEditorListComponentProps<T>) {
	const [meshes, setMeshes] = useState<AbstractMesh[]>([]);
	const [selectedMeshes, setSelectedMeshes] = useState<AbstractMesh[]>([]);

	useEffect(() => {
		const result = props.scene.meshes.filter((mesh) => {
			return props.items.find((m) => m.id === mesh.id);
		});

		setMeshes(result);
	}, [props.items]);

	function handleDragOver(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
	}

	function handleDragLeave(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
	}

	function handleDrop(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();

		let needsUpdate = false;

		const result = props.items.slice(0);
		const graphNode = JSON.parse(event.dataTransfer.getData("graph/node")) as string[];

		graphNode.forEach((nodeId) => {
			const node = props.scene.getNodeById(nodeId);
			if (!node || !isAbstractMesh(node)) {
				return;
			}

			const existingMesh = props.items.find((m) => m.id === node.id);
			if (!existingMesh) {
				needsUpdate = true;
				result.push(props.onCreateItem(node));
			}
		});

		if (needsUpdate) {
			props.onItemsChange(result, true);
		}
	}

	function handleMeshClick(ev: MouseEvent<HTMLDivElement>, mesh: AbstractMesh, isContextMenu: boolean) {
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
		} else if (isContextMenu) {
			if (!selectedMeshes.includes(mesh)) {
				setSelectedMeshes([mesh]);
			}
		} else {
			setSelectedMeshes([mesh]);
		}
	}

	function handleRemoveMeshes() {
		const staticMeshes = props.items.slice(0);

		selectedMeshes.forEach((mesh) => {
			const index = staticMeshes.findIndex((m) => m.id === mesh.id);
			if (index !== -1) {
				staticMeshes.splice(index, 1);
			}
		});

		props.onItemsChange(staticMeshes, true);
	}

	function handleSetMeshEnabled(mesh: AbstractMesh) {
		const staticMeshes = props.items.slice(0);
		const configMesh = staticMeshes.find((m) => m.id === mesh.id);

		if (configMesh) {
			configMesh.enabled = !configMesh.enabled;

			props.onItemsChange(staticMeshes, false);
		}
	}

	return (
		<div className="flex flex-1 flex-col w-full h-full" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
			<div className="flex flex-col h-full bg-black/50 text-white/75 rounded-lg overflow-y-auto">
				{meshes
					.filter((mesh) => mesh.name.toLowerCase().includes(props.search.toLowerCase()))
					.map((mesh) => (
						<ContextMenu key={mesh.id}>
							<ContextMenuTrigger>
								<div
									onClick={(ev) => handleMeshClick(ev, mesh, false)}
									onContextMenu={(ev) => handleMeshClick(ev, mesh, true)}
									className={`
                                        flex items-center gap-2 p-2
                                        ${selectedMeshes.includes(mesh) ? "bg-muted" : "hover:bg-muted/35"}
                                        transition-all duration-300 ease-in-out
                                    `}
								>
									<div className="cursor-pointer" onClick={() => handleSetMeshEnabled(mesh)}>
										<IoMdCube className={`w-4 h-4 ${props.items.find((m) => m.id === mesh.id)?.enabled ? "" : "opacity-35"}`} />
									</div>

									{mesh.name}
								</div>
							</ContextMenuTrigger>

							<ContextMenuContent>
								<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => handleRemoveMeshes()}>
									<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove
								</ContextMenuItem>
							</ContextMenuContent>
						</ContextMenu>
					))}
			</div>
		</div>
	);
}
