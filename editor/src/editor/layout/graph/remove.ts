import { Node } from "babylonjs";

import { registerUndoRedo } from "../../../tools/undoredo";
import { waitNextAnimationFrame } from "../../../tools/tools";
import { isAbstractMesh, isCamera, isLight, isNode, isTransformNode } from "../../../tools/guards/nodes";

import { Editor } from "../../main";

/**
 * Removes the currently selected nodes in the graph with undo/redo support.
 * @param editor defines the reference to the editor used to get the selected nodes and refresh the graph.
 */
export function removeNodes(editor: Editor): void {
    const scene = editor.layout.preview.scene;

    const nodes = editor.layout.graph.getSelectedNodes()
        .filter((n) => n.nodeData)
        .map((n) => n.nodeData!);

    registerUndoRedo({
        executeRedo: true,
        undo: () => {
            nodes.forEach((node) => {
                if (isAbstractMesh(node)) {
                    scene.addMesh(node);
                }

                if (isTransformNode(node)) {
                    scene.addTransformNode(node);
                }

                if (isLight(node)) {
                    scene.addLight(node);
                }

                if (isCamera(node)) {
                    scene.addCamera(node);
                }
            });

            editor.layout.graph.refresh();

            waitNextAnimationFrame().then(() => {
                const firstsNode = nodes.find((n) => isNode(n)) as Node | null ?? null;

                editor.layout.preview.gizmo.setAttachedNode(firstsNode ?? null);
                editor.layout.inspector.setEditedObject(firstsNode ?? editor.layout.preview.scene);
            });
        },
        redo: () => {
            nodes.forEach((node) => {
                if (isAbstractMesh(node)) {
                    scene.removeMesh(node);
                }

                if (isTransformNode(node)) {
                    scene.removeTransformNode(node);
                }

                if (isLight(node)) {
                    scene.removeLight(node);
                }

                if (isCamera(node)) {
                    scene.removeCamera(node);
                }
            });

            editor.layout.graph.refresh();
            editor.layout.preview.gizmo.setAttachedNode(null);
            editor.layout.inspector.setEditedObject(editor.layout.preview.scene);
        },
    });
}
