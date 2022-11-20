import * as React from "react";
import { MenuItem } from "@blueprintjs/core";

import { Mesh } from "babylonjs";

import { Editor } from "../../../editor";

import { undoRedo } from "../../../tools/undo-redo";

import { isMesh } from "../tools/tools";
import { SceneTools } from "../../../scene/tools";

export interface IGraphContextMenuMergeMeshesProps {
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
 * Defines the component used to merge meshes in a graph.
 * @param props defines the component's props.
 */
export function GraphContextMenuMergeMeshes(props: IGraphContextMenuMergeMeshesProps) {
    const selectedNodes = props.editor.graph.state.selectedNodes.filter((n) => isMesh(n.nodeData)).map((n) => n.nodeData) as Mesh[];

    if (selectedNodes.length < 2) {
        return null;
    }

    return (
        <MenuItem text="Merge Meshes..." onClick={() => onClick(props.editor, selectedNodes)} />
    );
}

/**
 * Called on the user clicks the menu item.
 */
function onClick(editor: Editor, meshes: Mesh[]): void {
    const mergeResult = SceneTools.MergeMeshes(meshes);
    if (!mergeResult) {
        return;
    }

    editor.scene!.removeMesh(mergeResult);

    undoRedo.push({
        common: () => {
            editor.graph.refresh();
        },
        undo: () => {
            mergeResult.doNotSerialize = true;
            editor.scene!.removeMesh(mergeResult);
        },
        redo: () => {
            mergeResult.doNotSerialize = false;
            editor.scene!.addMesh(mergeResult);
        },
    });
}