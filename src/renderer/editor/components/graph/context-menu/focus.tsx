import * as React from "react";
import { MenuItem } from "@blueprintjs/core";

import { Editor } from "../../../editor";

import { PreviewFocusMode } from "../../preview";

import { isAbstractMesh } from "../tools/tools";

export interface IGraphContextMenuFocusProps {
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
 * Defines the component used to focus a node from the graph.
 * @param props defines the component's props.
 */
export function GraphContextMenuFocus(props: IGraphContextMenuFocusProps) {
    if (!isAbstractMesh(props.object)) {
        return null;
    }

    return (
        <MenuItem text="Focus..." disabled={!isAbstractMesh(props.object)} onClick={() => props.editor.preview.focusNode(props.object, PreviewFocusMode.Target | PreviewFocusMode.Position)}>
            <MenuItem text="Back" onClick={() => props.editor.preview.focusNode(props.object, PreviewFocusMode.Target | PreviewFocusMode.Back)} />
            <MenuItem text="Front" onClick={() => props.editor.preview.focusNode(props.object, PreviewFocusMode.Target | PreviewFocusMode.Front)} />
            <MenuItem text="Top" onClick={() => props.editor.preview.focusNode(props.object, PreviewFocusMode.Target | PreviewFocusMode.Top)} />
            <MenuItem text="Bottom" onClick={() => props.editor.preview.focusNode(props.object, PreviewFocusMode.Target | PreviewFocusMode.Bottom)} />
            <MenuItem text="Left" onClick={() => props.editor.preview.focusNode(props.object, PreviewFocusMode.Target | PreviewFocusMode.Left)} />
            <MenuItem text="Right" onClick={() => props.editor.preview.focusNode(props.object, PreviewFocusMode.Target | PreviewFocusMode.Right)} />
        </MenuItem>
    );
}
