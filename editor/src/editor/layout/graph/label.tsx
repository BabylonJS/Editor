import { extname } from "path/posix";

import { DragEvent, useState } from "react";
import { TreeNodeInfo } from "@blueprintjs/core";

import { isNode } from "../../../tools/guards/nodes";
import { isScene } from "../../../tools/guards/scene";

import { applyTextureAssetToObject } from "../preview/texture";
import { applyMaterialAssetToObject } from "../preview/material";

import { Editor } from "../../main";

export interface IEditorGraphLabelProps {
    name: string;
    object: any;
    editor: Editor;
}

export function EditorGraphLabel(props: IEditorGraphLabelProps) {
    const [over, setOver] = useState(false);

    function handleDragStart(ev: DragEvent<HTMLDivElement>) {
        const selectedNodes: TreeNodeInfo[] = [];
        props.editor.layout.graph._forEachNode(props.editor.layout.graph.state.nodes, (n) => {
            if (n.isSelected || n.nodeData === props.object) {
                selectedNodes.push(n);
            }
        });

        ev.dataTransfer.setData("graph/node", JSON.stringify(selectedNodes.map((n) => n.id)));

        if (!selectedNodes.find((n) => n.nodeData === props.object)) {
            props.editor.layout.graph.setSelectedNode(props.object);
        }
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
        const nodesToMove: TreeNodeInfo[] = [];
        props.editor.layout.graph._forEachNode(
            props.editor.layout.graph.state.nodes,
            (n) => n.isSelected && nodesToMove.push(n),
        );

        nodesToMove.forEach((n) => {
            if (n.nodeData === props.object) {
                return;
            }

            if (n.nodeData && isNode(n.nodeData)) {
                n.nodeData.parent = isScene(props.object)
                    ? null
                    : props.object;
            }
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
            }
        });
    }

    return (
        <div
            draggable
            className={`ml-2 p-1 w-full ${over ? "bg-muted" : ""} transition-all duration-300 ease-in-out`}
            onDragStart={(ev) => handleDragStart(ev)}
            onDragOver={(ev) => handleDragOver(ev)}
            onDragLeave={(ev) => handleDragLeave(ev)}
            onDrop={(ev) => handleDrop(ev)}
        >
            {props.name}
        </div>
    );
}
