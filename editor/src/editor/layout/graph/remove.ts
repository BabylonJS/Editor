import { AbstractMesh, Light, Node, Scene } from "babylonjs";

import { registerUndoRedo } from "../../../tools/undoredo";
import { waitNextAnimationFrame } from "../../../tools/tools";
import { isSceneLinkNode } from "../../../tools/guards/scene";
import { isAbstractMesh, isCamera, isLight, isNode, isTransformNode } from "../../../tools/guards/nodes";

import { Editor } from "../../main";

type _RemoveNodeData = {
    node: Node;
    parent: Node | null;

    lights: Light[];
};

/**
 * Removes the currently selected nodes in the graph with undo/redo support.
 * @param editor defines the reference to the editor used to get the selected nodes and refresh the graph.
 */
export function removeNodes(editor: Editor): void {
    const scene = editor.layout.preview.scene;

    const selectedNodes = editor.layout.graph.getSelectedNodes().map((n) => n.nodeData).filter((n) => isNode(n)) as Node[];
    const data = selectedNodes.map((node) => {
        const attached = [node].concat(node.getDescendants(false, (n) => isNode(n))).map((descendant) => {
            return {
                node: descendant,
                parent: descendant.parent,
                lights: scene.lights.filter((light) => {
                    return light.getShadowGenerator()?.getShadowMap()?.renderList?.includes(descendant as AbstractMesh);
                }),
            } as _RemoveNodeData;
        });

        return attached;
    }).flat();

    registerUndoRedo({
        executeRedo: true,
        undo: () => {
            data.forEach((d) => {
                restoreNodeData(d, scene);
            });

            editor.layout.graph.refresh();

            waitNextAnimationFrame().then(() => {
                const firstsNode = data.find((n) => isNode(n.node))?.node;

                editor.layout.preview.gizmo.setAttachedNode(firstsNode ?? null);
                editor.layout.inspector.setEditedObject(firstsNode ?? editor.layout.preview.scene);
            });
        },
        redo: () => {
            data.forEach((d) => {
                removeNodeData(d, scene);
            });

            editor.layout.graph.refresh();
            editor.layout.preview.gizmo.setAttachedNode(null);
            editor.layout.inspector.setEditedObject(editor.layout.preview.scene);
        },
    });
}

function restoreNodeData(data: _RemoveNodeData, scene: Scene) {
    const node = data.node;

    if (isAbstractMesh(node)) {
        scene.addMesh(node);

        data.lights.forEach((light) => {
            light.getShadowGenerator()?.getShadowMap()?.renderList?.push(node);
        });
    }

    if (isTransformNode(node) || isSceneLinkNode(node)) {
        scene.addTransformNode(node);
    }

    if (isLight(node)) {
        scene.addLight(node);
    }

    if (isCamera(node)) {
        scene.addCamera(node);
    }
}

function removeNodeData(data: _RemoveNodeData, scene: Scene) {
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

    if (isTransformNode(node) || isSceneLinkNode(node)) {
        scene.removeTransformNode(node);
    }

    if (isLight(node)) {
        scene.removeLight(node);
    }

    if (isCamera(node)) {
        scene.removeCamera(node);
    }
}
