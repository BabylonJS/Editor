import { Nullable } from "../../../../../shared/types";

import { Node } from "babylonjs";

import { undoRedo } from "../../../tools/undo-redo";

import { Editor } from "../../../editor";

import {
    getRootNodes, isAbstractMesh, isIParticleSystem, isNode, isReflectionProbe, isSound, isTransformNode,
} from "./tools";

/**
 * Moves the given array of nodes as children of the given target. Supports undo/redo.
 * @param editor defines the reference to the editor.
 * @param nodes defines the array of all nodes to move.
 * @param target defines the target node where to put add the nodes as children.
 * @param keepTransform defines wether or not for meshes that transform should be converted when changing parent.
 */
export function moveNodes(editor: Editor, nodes: any[], target: Nullable<Node>, keepTransform: boolean): void {
    const rootNodes = getRootNodes(nodes.filter((n) => isNode(n))).concat(nodes.filter((n) => !isNode(n))) as any[];

    const oldParents = rootNodes.map((n) => {
        if (isNode(n)) {
            return n.parent;
        }

        if (isIParticleSystem(n)) {
            return n.emitter;
        }

        if (isSound(n)) {
            return n["_connectedTransformNode"];
        }

        if (isReflectionProbe(n)) {
            return n["_attachedMesh"];
        }

        return null;
    });

    undoRedo.push({
        common: () => {
            editor.graph.refresh();
        },
        undo: () => {
            rootNodes.forEach((n, i) => {
                const parent = oldParents[i];

                if (isNode(n)) {
                    n.parent = parent;
                    return n.computeWorldMatrix(true);
                }

                if (isIParticleSystem(n)) {
                    return n.emitter = parent;
                }

                if (isSound(n)) {
                    return n.attachToMesh(parent);
                }

                if (isReflectionProbe(n)) {
                    return n.attachToMesh(parent);
                }
            });
        },
        redo: () => {
            rootNodes.forEach((n) => {
                if (isNode(n)) {
                    if (keepTransform && isAbstractMesh(n)) {
                        n.setParent(target);
                    } else {
                        n.parent = target;
                    }

                    return n.computeWorldMatrix(true);
                }

                if (isIParticleSystem(n) && isAbstractMesh(target)) {
                    return n.emitter = target;
                }

                if (isSound(n)) {
                    if (!target) {
                        n.spatialSound = false;
                        return n.detachFromMesh();
                    } if ((isAbstractMesh(target) || isTransformNode(target))) {
                        n.spatialSound = true;
                        return n.attachToMesh(target);
                    }
                }

                if (isReflectionProbe(n) && (!target || isAbstractMesh(target))) {
                    return n.attachToMesh(target);
                }
            });
        },
    });
}
