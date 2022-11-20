import * as React from "react";
import { MenuItem } from "@blueprintjs/core";

import { Node } from "babylonjs";

import { Editor } from "../../../editor";

import { Icon } from "../../../gui/icon";

import { removeNodes } from "../tools/remove";

export interface IGraphLabelProps {
    /**
     * Defines the reference to the object to rename.
     */
    object: any;
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
}

/**
 * Defines the component used to remove a node from the graph.
 * @param props defines the component's props.
 */
export function GraphContextMenuRemove(props: IGraphLabelProps) {
    const selectedNodes = props.editor.graph.state.selectedNodes.map((n) => n.nodeData) as Node[];

    if (!selectedNodes.length || !selectedNodes.find((n) => !n.metadata?.isLocked)) {
        return null;
    }

    return (
        <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => onClick(props.editor, selectedNodes)} />
    );
}

/**
 * Called on the user clicks on the "remove" menu item.
 */
function onClick(editor: Editor, nodes: any[]): void {
    removeNodes(editor, nodes);
}
