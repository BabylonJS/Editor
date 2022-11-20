import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { MenuDivider, MenuItem } from "@blueprintjs/core";

import { Editor } from "../../../editor";

import { isNode } from "../tools/tools";
import { moveNodes } from "../tools/move";

export interface IGraphContextMenuCutPastProps {
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
 * Defines the component used to cut/paste nodes in the graph.
 * @param props defines the component's props.
 */
export function GraphContextMenuCutPast(props: IGraphContextMenuCutPastProps) {
    if (!isNode(props.object)) {
        return null;
    }

    return (
        <>
            <MenuDivider />
            <MenuItem text="Cut" onClick={() => onCutClick(props.editor)} />
            <MenuItem text="Paste" disabled={cutNodes === null} onClick={() => onPasteClick(props.editor, props.object)} />
            <MenuDivider />
        </>
    );
}

let cutNodes: Nullable<any[]> = null;

/**
 * Called on the user clicks the "Cut" button.
 */
function onCutClick(editor: Editor): void {
    cutNodes = editor.graph.state.selectedNodes.map((n) => n.nodeData);
}

/**
 * Called on the user clicks the "Paste" button.
 */
function onPasteClick(editor: Editor, object: any): void {
    if (!cutNodes || !isNode(object)) {
        return;
    }

    moveNodes(editor, cutNodes, object, false);
}
