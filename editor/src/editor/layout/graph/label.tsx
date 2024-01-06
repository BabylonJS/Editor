import { DragEvent, useState } from "react";
import { TreeNodeInfo } from "@blueprintjs/core";

import { Scene } from "babylonjs";

import { isNode } from "../../../tools/guards/nodes";

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
        props.editor.layout.graph._forEachNode(
            props.editor.layout.graph.state.nodes,
            (n) => n.isSelected && selectedNodes.push(n),
        );

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

        if (!isNode(props.object) && !(props.object instanceof Scene)) {
            return;
        }

        const node = ev.dataTransfer.getData("graph/node");
        if (!node) {
            return;
        }

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
                n.nodeData.parent = props.object instanceof Scene
                    ? null
                    : props.object;
            }
        });

        props.editor.layout.graph.refresh();
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
