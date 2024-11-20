import { extname } from "path/posix";

import { DragEvent, useState } from "react";

import { Node, TransformNode } from "babylonjs";

import { isScene } from "../../../tools/guards/scene";
import { isSound } from "../../../tools/guards/sound";
import { registerUndoRedo } from "../../../tools/undoredo";
import { isInstancedMesh, isMesh, isNode, isTransformNode } from "../../../tools/guards/nodes";

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
            }
        });

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                nodesToMove.forEach((n) => {
                    if (n.nodeData && oldHierarchyMap.has(n.nodeData)) {
                        if (isNode(n.nodeData)) {
                            return n.nodeData.parent = oldHierarchyMap.get(n.nodeData) as Node;
                        }

                        if (isSound(n.nodeData)) {
                            const oldSoundNode = oldHierarchyMap.get(n.nodeData);

                            if (oldSoundNode) {
                                return n.nodeData.attachToMesh(oldSoundNode as TransformNode);
                            } else {
                                n.nodeData.detachFromMesh();
                                n.nodeData.spatialSound = false;
                                return n.nodeData["_connectedTransformNode"] = null;
                            }
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
                            return n.nodeData.parent = isScene(props.object) ? null : newParent;
                        }

                        if (isSound(n.nodeData)) {
                            if (isTransformNode(newParent) || isMesh(newParent) || isInstancedMesh(newParent)) {
                                return n.nodeData.attachToMesh(newParent);
                            }

                            if (isScene(newParent)) {
                                n.nodeData.detachFromMesh();
                                n.nodeData.spatialSound = false;
                                return n.nodeData["_connectedTransformNode"] = null;
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
        >
            {props.name}
        </div>
    );
}
