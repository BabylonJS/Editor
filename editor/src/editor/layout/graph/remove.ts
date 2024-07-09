import { AbstractMesh, Light, Node } from "babylonjs";

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

    type _RemoveNodeData = {
        node: Node;
        lights: Light[];
    };

    const data = editor.layout.graph.getSelectedNodes().map((n) => n.nodeData)
        .filter((n) => n)
        .map((n) => ({
            node: n,
            lights: scene.lights.filter((light) => {
                return light.getShadowGenerator()?.getShadowMap()?.renderList?.includes(n as AbstractMesh);
            }),
        } as _RemoveNodeData));

    registerUndoRedo({
        executeRedo: true,
        undo: () => {
            data.forEach((data) => {
                const node = data.node;

                if (isAbstractMesh(node)) {
                    scene.addMesh(node);

                    data.lights.forEach((light) => {
                        light.getShadowGenerator()?.getShadowMap()?.renderList?.push(node);
                    });
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
                const firstsNode = data.find((n) => isNode(n.node))?.node;

                editor.layout.preview.gizmo.setAttachedNode(firstsNode ?? null);
                editor.layout.inspector.setEditedObject(firstsNode ?? editor.layout.preview.scene);
            });
        },
        redo: () => {
            data.forEach((data) => {
                const node = data.node;

                if (isAbstractMesh(node)) {
                    scene.removeMesh(node);

                    data.lights.forEach((light) => {
                        const renderList = light.getShadowGenerator()?.getShadowMap()?.renderList;
                        const index = renderList?.indexOf(node) ?? -1;
                        if (index !== -1) {
                            renderList?.splice(index, 1);
                        }
                    });
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
