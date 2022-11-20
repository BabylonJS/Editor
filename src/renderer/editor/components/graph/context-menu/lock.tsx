import * as React from "react";
import { MaybeElement, MenuItem } from "@blueprintjs/core";

import { Node } from "babylonjs";

import { Editor } from "../../../editor";

import { Icon } from "../../../gui/icon";

import { isNode } from "../tools/tools";

export interface IGraphContextMenuLockProps {
    /**
     * Defines the reference to the object to lock/unlock.
     */
    object: any;
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
}

/**
 * Defines the component used to lock/unlock nodes in a graph.
 * @param props defines the component's props.
 */
export function GraphContextMenuLock(props: IGraphContextMenuLockProps) {
    const selectedNodes = props.editor.graph.state.selectedNodes.filter((n) => isNode(n.nodeData)).map((n) => n.nodeData) as Node[];

    if (!selectedNodes.length) {
        return null;
    }

    let icon: MaybeElement;
    if (isNode(props.object)) {
        icon = props.object.metadata?.isLocked ? <Icon src="check.svg" /> : undefined
    }

    return (
        <MenuItem text="Locked" icon={icon} onClick={() => onClick(props.editor, selectedNodes)} />
    );
}

/**
 * Called on the user clicks the menu item.
 */
function onClick(editor: Editor, nodes: Node[]): void {
    nodes.forEach((n) => {
        n.metadata = n.metadata ?? {};
        n.metadata.isLocked = n.metadata.isLocked ?? false;

        n.metadata.isLocked = !n.metadata.isLocked;
    });

    editor.graph.refresh();
}
