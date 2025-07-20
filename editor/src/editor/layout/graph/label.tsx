import { extname } from "path/posix";

import { DragEvent, useEffect, useRef, useState } from "react";

import { useEventListener } from "usehooks-ts";

import { Node, TransformNode, AbstractMesh } from "babylonjs";

import { Input } from "../../../ui/shadcn/ui/input";

import { isScene } from "../../../tools/guards/scene";
import { isSound } from "../../../tools/guards/sound";
import { registerUndoRedo } from "../../../tools/undoredo";
import { isAnyParticleSystem } from "../../../tools/guards/particles";
import { isAbstractMesh, isInstancedMesh, isMesh, isNode, isTransformNode } from "../../../tools/guards/nodes";

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
	const [doubleClicked, setDoubleClicked] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setName(props.name);
	}, [props.name]);

	useEffect(() => {
		if (doubleClicked) {
			setTimeout(() => {
				inputRef.current?.select();
				inputRef.current?.focus();
			}, 0);
		}
	}, [doubleClicked]);

	useEventListener("keyup", (ev) => {
		if (ev.key === "Escape" && doubleClicked) {
			setName(props.name);
			setDoubleClicked(false);
		}

		if (ev.key === "Enter" && doubleClicked) {
			handleInputNameBlurred();
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
			return dropNodeFromGraph();
		}

		const asset = ev.dataTransfer.getData("assets");
		if (asset) {
			return handleAssetsDropped();
		}
	}

	function dropNodeFromGraph() {
		const nodesToMove = props.editor.layout.graph.getSelectedNodes();

		const newParent = props.object;
		const oldHierarchyMap = new Map<unknown, unknown>();

		nodesToMove.forEach((n) => {
			if (n.nodeData) {
				if (isNode(n.nodeData)) {
					return oldHierarchyMap.set(n.nodeData, n.nodeData.parent);
				}

				if (isSound(n.nodeData)) {
					return oldHierarchyMap.set(n.nodeData, n.nodeData["_connectedTransformNode"]);
				}

				if (isAnyParticleSystem(n.nodeData)) {
					return oldHierarchyMap.set(n.nodeData, n.nodeData.emitter);
				}
			}
		});

		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				nodesToMove.forEach((n) => {
					if (n.nodeData && oldHierarchyMap.has(n.nodeData)) {
						if (isNode(n.nodeData)) {
							return (n.nodeData.parent = oldHierarchyMap.get(n.nodeData) as Node);
						}

						if (isSound(n.nodeData)) {
							const oldSoundNode = oldHierarchyMap.get(n.nodeData);

							if (oldSoundNode) {
								return n.nodeData.attachToMesh(oldSoundNode as TransformNode);
							}

							n.nodeData.detachFromMesh();
							n.nodeData.spatialSound = false;
							return (n.nodeData["_connectedTransformNode"] = null);
						}

						if (isAnyParticleSystem(n.nodeData)) {
							return (n.nodeData.emitter = oldHierarchyMap.get(n.nodeData) as AbstractMesh);
						}
					}
				});
			},
			redo: () => {
				nodesToMove.forEach((n) => {
					if (n.nodeData === props.object) {
						return;
					}

					if (n.nodeData && oldHierarchyMap.has(n.nodeData)) {
						if (isNode(n.nodeData)) {
							return (n.nodeData.parent = isScene(props.object) ? null : newParent);
						}

						if (isSound(n.nodeData)) {
							if (isTransformNode(newParent) || isMesh(newParent) || isInstancedMesh(newParent)) {
								return n.nodeData.attachToMesh(newParent);
							}

							if (isScene(newParent)) {
								n.nodeData.detachFromMesh();
								n.nodeData.spatialSound = false;
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
					if (isScene(props.object) || isTransformNode(props.object) || isMesh(props.object) || isInstancedMesh(props.object)) {
						applySoundAsset(props.editor, props.object, absolutePath).then(() => {
							props.editor.layout.graph.refresh();
						});
					}
					break;
			}
		});
	}

	function handleDoubleClick() {
		if (props.object.name) {
			setDoubleClicked(!doubleClicked);
		}
	}

	function handleInputNameBlurred() {
		registerUndoRedo({
			executeRedo: true,
			undo: () => (props.object.name = props.name),
			redo: () => (props.object.name = name),
		});

		setDoubleClicked(false);
		props.editor.layout.graph.refresh();
	}

	return (
		<div
			draggable
			className={`
                ml-2 p-1 w-full
                ${over ? "bg-muted" : ""}
                ${props.object.metadata?.doNotSerialize ? "text-foreground/35 line-through" : ""}
                transition-all duration-300 ease-in-out
            `}
			onDragStart={(ev) => handleDragStart(ev)}
			onDragOver={(ev) => handleDragOver(ev)}
			onDragLeave={(ev) => handleDragLeave(ev)}
			onDrop={(ev) => handleDrop(ev)}
			onDoubleClick={() => handleDoubleClick()}
			onBlur={() => handleInputNameBlurred()}
		>
			{doubleClicked ? (
				<Input
					value={name}
					ref={inputRef}
					className="w-fit h-7"
					onCopy={(ev) => ev.stopPropagation()}
					onPaste={(ev) => ev.stopPropagation()}
					onChange={(ev) => setName(ev.currentTarget.value)}
				/>
			) : (
				props.name
			)}
		</div>
	);
}
