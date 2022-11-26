import * as React from "react";
import { MenuItem } from "@blueprintjs/core";

import { Mesh } from "babylonjs";

import { Editor } from "../../../editor";

import { undoRedo } from "../../../tools/undo-redo";

import { isMesh } from "../tools/tools";

export interface IGraphContextMenuClearThinInstancesProps {
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
 * Defines the component used to configure the thin instances of a mesh in a graph.
 * @param props defines the component's props.
 */
export function GraphContextMenuClearThinInstances(props: IGraphContextMenuClearThinInstancesProps) {
    const selectedNodes = props.editor.graph.state.selectedNodes.filter((n) => isMesh(n.nodeData)).map((n) => n.nodeData) as Mesh[];

    if (!selectedNodes.length || !selectedNodes.find((n) => n.thinInstanceCount > 0)) {
        return null;
    }

    return (
        <MenuItem text="Clear Thin Instances" onClick={() => onClick(props.editor, selectedNodes)} />
    );
}

/**
 * Called on the user clicks the menu item.
 */
function onClick(editor: Editor, meshes: Mesh[]): void {
    const matrices = meshes.map((m) => m.thinInstanceGetWorldMatrices());

    undoRedo.push({
        common: () => {
            meshes.forEach((m) => {
                refreshBoundingInfo(m);
                editor.objectModifiedObservable.notifyObservers({
                    object: m,
                    path: "_userThinInstanceBuffersStorage",
                });
            });

        },
        undo: () => {
            meshes.forEach((m, index) => {
                if (!matrices[index]) {
                    return;
                }

                const buffer = matrices[index];
                const array = new Float32Array(buffer.length * 16);

                buffer.forEach((b, i) => b.copyToArray(array, i * 16));

                m.thinInstanceSetBuffer("matrix", array, 16, true);
                m.getLODLevels().forEach((lod) => {
                    lod.mesh?.thinInstanceSetBuffer("matrix", array, 16, true);
                });

                refreshBoundingInfo(m);
            });
        },
        redo: () => {
            meshes.forEach((m) => {
                m.thinInstanceSetBuffer("matrix", null, 16, true);
                m.getLODLevels().forEach((lod) => {
                    lod.mesh?.thinInstanceSetBuffer("matrix", null, 16, true);
                });

                refreshBoundingInfo(m);
            });
        },
    });
}

/**
 * Refrehses the bouding info of the given mesh.
 */
function refreshBoundingInfo(mesh: Mesh): void {
    mesh.refreshBoundingInfo(true, true);
    mesh.thinInstanceRefreshBoundingInfo(true, true, true);

    mesh.getLODLevels().forEach((lod) => {
        lod.mesh?.refreshBoundingInfo(true, true);
        lod.mesh?.thinInstanceRefreshBoundingInfo(true, true, true);
    });
}
