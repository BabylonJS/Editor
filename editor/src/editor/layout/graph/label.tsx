import { extname } from "path/posix";

import { DragEvent, useEffect, useRef, useState } from "react";

import { FaLock } from "react-icons/fa";
import { useEventListener } from "usehooks-ts";

import { TransformNode, AbstractMesh, Vector3 } from "babylonjs";

import { Input } from "../../../ui/shadcn/ui/input";

import { isDarwin } from "../../../tools/os";
import { isScene } from "../../../tools/guards/scene";
import { isSound } from "../../../tools/guards/sound";
import { registerUndoRedo } from "../../../tools/undoredo";
import { isAnyParticleSystem } from "../../../tools/guards/particles";
import { isNodeSerializable, isNodeLocked } from "../../../tools/node/metadata";
import { isAbstractMesh, isInstancedMesh, isMesh, isNode, isTransformNode } from "../../../tools/guards/nodes";
import { applyNodeParentingConfiguration, applyTransformNodeParentingConfiguration, IOldNodeHierarchyConfiguration } from "../../../tools/node/parenting";

import { applySoundAsset } from "../preview/import/sound";
import { applyTextureAssetToObject } from "../preview/import/texture";
import { applyMaterialAssetToObject } from "../preview/import/material";

import { Editor } from "../../main";

export interface IEditorGraphLabelProps {
	name: string;
	object: any;
	editor: Editor;
}

export function EditorGraphLabel(props: IEditorGraphLabelProps) {
	const [over, setOver] = useState(false);

	const [name, setName] = useState("");
	const [renaming, setRenaming] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setName(props.name);
	}, [props.name]);

	useEffect(() => {
		if (renaming) {
			setTimeout(() => {
				inputRef.current?.select();
				inputRef.current?.focus();
			}, 0);
		}
	}, [renaming]);

	useEventListener("keyup", (ev) => {
		const graph = props.editor.layout.graph;
		const canRename = graph.state.isFocused && graph.isNodeSelected(props.object);

		if (ev.key === "Escape" && renaming) {
			setName(props.name);
			setRenaming(false);
		}

		if (ev.key === "F2" && !isDarwin() && canRename) {
			handleRenameObject();
		}

		if (ev.key === "Enter") {
			if (renaming) {
				handleInputNameBlurred();
			} else if (isDarwin() && canRename) {
				handleRenameObject();
			}
		}
	});

	function handleDragStart(ev: DragEvent<HTMLDivElement>) {
		const selectedNodes = props.editor.layout.graph.getSelectedNodes();
		const alreadySelected = selectedNodes.find((n) => n.nodeData === props.object);

		if (!alreadySelected) {
			selectedNodes.splice(0, selectedNodes.length, props.object);
		}

		if (!alreadySelected) {
			if (ev.ctrlKey || ev.metaKey) {
				props.editor.layout.graph.addToSelectedNodes(props.object);
			} else {
				props.editor.layout.graph.setSelectedNode(props.object);
			}
		}

		ev.dataTransfer.setData("graph/node", JSON.stringify(selectedNodes.map((n) => n.id)));
	}

	function handleDragOver(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		ev.stopPropagation();

		setOver(true);
	}

	function handleDragLeave(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		setOver(false);
	}

	function handleDrop(ev: DragEvent<HTMLDivElement>) {
		ev.preventDefault();
		ev.stopPropagation();

		setOver(false);

		if (!isNode(props.object) && !isScene(props.object)) {
			return;
		}

		const node = ev.dataTransfer.getData("graph/node");
		if (node) {
			return dropNodeFromGraph(ev.shiftKey);
		}

		const asset = ev.dataTransfer.getData("assets");
		if (asset) {
			return handleAssetsDropped();
		}
	}

	function dropNodeFromGraph(shift: boolean) {
		const nodesToMove = props.editor.layout.graph.getSelectedNodes();

		const newParent = props.object;
		const oldHierarchyMap = new Map<unknown, unknown>();

		nodesToMove.forEach((n) => {
			if (n.nodeData && n.nodeData !== newParent) {
				if (isNode(n.nodeData) && n.nodeData.parent !== newParent) {
					const descendants = n.nodeData.getDescendants(false);
					if (descendants.includes(newParent)) {
						return;
					}

					return oldHierarchyMap.set(n.nodeData, {
						parent: n.nodeData.parent,
						position: n.nodeData["position"]?.clone(),
						rotation: n.nodeData["rotation"]?.clone(),
						scaling: n.nodeData["scaling"]?.clone(),
						rotationQuaternion: n.nodeData["rotationQuaternion"]?.clone(),
					} as IOldNodeHierarchyConfiguration);
				}

				if (isSound(n.nodeData)) {
					return oldHierarchyMap.set(n.nodeData, n.nodeData["_connectedTransformNode"]);
				}

				if (isAnyParticleSystem(n.nodeData)) {
					return oldHierarchyMap.set(n.nodeData, n.nodeData.emitter);
				}
			}
		});

		if (!oldHierarchyMap.size) {
			return;
		}

		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				nodesToMove.forEach((n) => {
					if (n.nodeData && oldHierarchyMap.has(n.nodeData)) {
						if (isNode(n.nodeData)) {
							return applyNodeParentingConfiguration(n.nodeData, oldHierarchyMap.get(n.nodeData) as IOldNodeHierarchyConfiguration);
						}

						if (isSound(n.nodeData)) {
							const oldSoundNode = oldHierarchyMap.get(n.nodeData);

							if (oldSoundNode) {
								return n.nodeData.attachToMesh(oldSoundNode as TransformNode);
							}

							n.nodeData.detachFromMesh();
							n.nodeData.spatialSound = false;
							n.nodeData.setPosition(Vector3.Zero());
							return (n.nodeData["_connectedTransformNode"] = null);
						}

						if (isAnyParticleSystem(n.nodeData)) {
							return (n.nodeData.emitter = oldHierarchyMap.get(n.nodeData) as AbstractMesh);
						}
					}
				});
			},
			redo: () => {
				const tempTransfromNode = new TransformNode("tempParent", props.editor.layout.preview.scene);

				try {
					nodesToMove.forEach((n) => {
						if (n.nodeData === props.object) {
							return;
						}

						if (n.nodeData && oldHierarchyMap.has(n.nodeData)) {
							if (isNode(n.nodeData)) {
								if (shift) {
									return applyTransformNodeParentingConfiguration(n.nodeData, newParent, tempTransfromNode);
								}

								return (n.nodeData.parent = isScene(props.object) ? null : newParent);
							}

							if (isSound(n.nodeData)) {
								if (isTransformNode(newParent) || isMesh(newParent) || isInstancedMesh(newParent)) {
									return n.nodeData.attachToMesh(newParent);
								}

								if (isScene(newParent)) {
									n.nodeData.detachFromMesh();
									n.nodeData.spatialSound = false;
									n.nodeData.setPosition(Vector3.Zero());
									return (n.nodeData["_connectedTransformNode"] = null);
								}
							}

							if (isAnyParticleSystem(n.nodeData)) {
								if (isAbstractMesh(newParent)) {
									return (n.nodeData.emitter = newParent);
								}
							}
						}
					});
				} catch (e) {
					console.error(e);
				}

				tempTransfromNode.dispose(false, true);
			},
		});

		props.editor.layout.graph.refresh();
	}

	function handleAssetsDropped() {
		const absolutePaths = props.editor.layout.assets.state.selectedKeys;

		absolutePaths.forEach(async (absolutePath) => {
			const extension = extname(absolutePath).toLowerCase();

			switch (extension) {
				case ".material":
					applyMaterialAssetToObject(props.editor, props.object, absolutePath);
					break;

				case ".env":
				case ".jpg":
				case ".png":
				case ".webp":
				case ".bmp":
				case ".jpeg":
					applyTextureAssetToObject(props.editor, props.object, absolutePath);
					break;

				case ".mp3":
				case ".ogg":
				case ".wav":
				case ".wave":
					if (isScene(props.object) || isMesh(props.object) || isInstancedMesh(props.object)) {
						applySoundAsset(props.editor, props.object, absolutePath).then(() => {
							props.editor.layout.graph.refresh();
						});
					}
					break;
			}
		});
	}

	function handleRenameObject() {
		if (props.object.name) {
			setRenaming(!renaming);
		}
	}

	function handleInputNameBlurred() {
		registerUndoRedo({
			executeRedo: true,
			undo: () => (props.object.name = props.name),
			redo: () => (props.object.name = name),
		});

		setRenaming(false);

		props.editor.layout.graph.refresh();
		props.editor.layout.inspector.forceUpdate();
	}

	function getLabel() {
		if (renaming) {
			return (
				<Input
					value={name}
					ref={inputRef}
					className="w-fit h-7"
					onCopy={(ev) => ev.stopPropagation()}
					onPaste={(ev) => ev.stopPropagation()}
					onChange={(ev) => setName(ev.currentTarget.value)}
				/>
			);
		}

		const label = (
			<div
				className={`
					${!isNodeSerializable(props.object) ? "line-through" : ""}
					${!isNodeSerializable(props.object) || isNodeLocked(props.object) ? "text-foreground/35" : ""}
					transition-all duration-300 ease-in-out
				`}
			>
				{props.name}
			</div>
		);

		if (isNodeLocked(props.object)) {
			return (
				<div className="flex gap-2 items-center justify-between">
					{label}
					<FaLock className="w-4 h-4 opacity-50 mr-2" />
				</div>
			);
		}

		return label;
	}

	return (
		<div
			draggable
			className={`
                ml-2 p-1 w-full
                ${over ? "bg-muted px-2 py-2 rounded-lg" : ""}
				transition-all duration-300 ease-in-out
            `}
			onDragStart={(ev) => handleDragStart(ev)}
			onDragOver={(ev) => handleDragOver(ev)}
			onDragLeave={(ev) => handleDragLeave(ev)}
			onDrop={(ev) => handleDrop(ev)}
			onBlur={() => handleInputNameBlurred()}
		>
			{getLabel()}
		</div>
	);
}
