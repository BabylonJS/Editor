import { Nullable } from "../../../../../shared/types";

import { AbstractMesh, Camera, Light, ParticleSystem, ReflectionProbe, RenderTargetTexture, Sound, TransformNode } from "babylonjs";

import { Editor } from "../../../editor";

import { Tools } from "../../../tools/tools";
import { undoRedo } from "../../../tools/undo-redo";

import { getRootNodes, isInstancedMesh, isMesh, isNode } from "./tools";

/**
 * Called on the user clicks on the "remove" menu item.
 */
export function removeNodes(editor: Editor, nodes: any[]): void {
    const rootNodes = getRootNodes(nodes.filter((n) => isNode(n) && !n.metadata?.isLocked)).concat(nodes.filter((n) => !isNode(n))) as any[];

    let objects: any[] = [];
    rootNodes.forEach((n) => {
        objects.push(n);
        if (isNode(n)) {
            objects.push.apply(objects, n.getDescendants(false));
        }
    });
    objects = Tools.Distinct(objects);

    const methods = objects.map((o) => getAddRemoveMethods(editor, o));

    undoRedo.push({
        common: () => {
            editor.graph.refresh();
        },
        undo: () => {
            methods.forEach((m) => m.add());
        },
        redo: () => {
            methods.forEach((m) => m.remove());
        },
    });
}

/*********************************
 * Types
 *********************************/
type _AddRemoveMethod = (...args: any[]) => void;

interface _AddRemoveCollection {
    add: _AddRemoveMethod;
    remove: _AddRemoveMethod;
}

/*********************************
 * Methods
 *********************************/

function getAddRemoveMethods(editor: Editor, o: any): _AddRemoveCollection {
    if (o instanceof AbstractMesh) {
        return removeAbstractMesh(editor, o);
    }

    if (o instanceof TransformNode) {
        return removeTransformNode(editor, o);
    }

    if (o instanceof Light) {
        return removeLight(editor, o);
    }

    if (o instanceof Camera) {
        return removeCamera(editor, o);
    }

    if (o instanceof ParticleSystem) {
        return {
            add: () => addByCheckingIndex(o, editor.scene!.particleSystems),
            remove: () => removeByCheckingIndex(o, editor.scene!.particleSystems),
        };
    }

    if (o instanceof Sound) {
        return {
            add: () => addByCheckingIndex(o, editor.scene!.mainSoundTrack?.soundCollection),
            remove: () => removeByCheckingIndex(o, editor.scene!.mainSoundTrack?.soundCollection),
        };
    }

    if (o instanceof ReflectionProbe) {
        return {
            add: () => addByCheckingIndex(o, editor.scene!.reflectionProbes),
            remove: () => removeByCheckingIndex(o, editor.scene!.reflectionProbes),
        };
    }

    return {
        add: () => { },
        remove: () => { },
    };
}

function removeLight(editor: Editor, o: Light): _AddRemoveCollection {
    const parent = o.parent;

    return {
        add: () => {
            o.parent = parent;
            o.doNotSerialize = false;

            addByCheckingIndex(o, editor.scene!.lights);
        },
        remove: () => {
            o.parent = null;
            o.doNotSerialize = true;

            removeByCheckingIndex(o, editor.scene!.lights);
        },
    };
}

function removeCamera(editor: Editor, o: Camera): _AddRemoveCollection {
    const parent = o.parent;

    return {
        add: () => {
            o.parent = parent;
            o.doNotSerialize = false;

            addByCheckingIndex(o, editor.scene!.cameras);
        },
        remove: () => {
            o.parent = null;
            o.doNotSerialize = true;

            removeByCheckingIndex(o, editor.scene!.cameras);
        },
    };
}

function removeTransformNode(editor: Editor, o: TransformNode): _AddRemoveCollection {
    const parent = o.parent;
    const sounds = removeSounds(editor, o);

    return {
        add: () => {
            sounds.add();

            o.parent = parent;
            o.doNotSerialize = false;

            addByCheckingIndex(o, editor.scene!.transformNodes);
        },
        remove: () => {
            sounds.remove();

            o.parent = null;
            o.doNotSerialize = true;

            removeByCheckingIndex(o, editor.scene!.transformNodes);
        },
    };
}

function removeAbstractMesh(editor: Editor, o: AbstractMesh): _AddRemoveCollection {
    const parent = o.parent;
    const lods = isMesh(o) ? o.getLODLevels().slice() : [];

    const sounds = removeSounds(editor, o);
    const shadows = removeFromShadows(editor, o);
    const particleSystems = removeParticleSystems(editor, o);

    return {
        add: () => {
            sounds.add();
            shadows.add();
            particleSystems.add();

            o.parent = parent;
            o.doNotSerialize = false;

            addByCheckingIndex(o, editor.scene!.meshes);

            if (o.skeleton) {
                addByCheckingIndex(o.skeleton, editor.scene!.skeletons);
            }

            if (isInstancedMesh(o)) {
                addByCheckingIndex(o, o.sourceMesh.instances);
            }

            if (isMesh(o)) {
                lods.forEach((lod) => {
                    if (lod.mesh) {
                        lod.mesh.doNotSerialize = false;
                        addByCheckingIndex(lod.mesh, editor.scene!.meshes);
                    }

                    o.addLODLevel(lod.distanceOrScreenCoverage, lod.mesh);
                });
            }
        },
        remove: () => {
            sounds.remove();
            shadows.remove();
            particleSystems.remove();

            o.parent = null;
            o.doNotSerialize = true;

            removeByCheckingIndex(o, editor.scene!.meshes);

            if (o.skeleton) {
                removeByCheckingIndex(o.skeleton, editor.scene!.skeletons);
            }

            if (isInstancedMesh(o)) {
                removeByCheckingIndex(o, o.sourceMesh.instances);
            }

            if (isMesh(o)) {
                lods.forEach((lod) => {
                    o.removeLODLevel(lod.mesh!);

                    if (lod.mesh) {
                        lod.mesh.doNotSerialize = true;
                        removeByCheckingIndex(lod.mesh, editor.scene!.meshes);
                    }
                });
            }
        },
    };
}

function removeFromShadows(editor: Editor, o: AbstractMesh): _AddRemoveCollection {
    const shadowLights = editor.scene!.lights
        .map((l) => l.getShadowGenerator()?.getShadowMap())
        .filter((l) => l?.renderList && l.renderList.indexOf(o) !== -1) as RenderTargetTexture[];

    return {
        add: () => shadowLights.forEach((sl) => sl?.renderList?.push(o)),
        remove: () => {
            shadowLights.forEach((sl) => {
                const index = sl.renderList?.indexOf(o) ?? -1;
                if (index !== -1) {
                    sl.renderList?.splice(index, 1);
                }
            });
        }
    };
}

function removeParticleSystems(editor: Editor, o: AbstractMesh): _AddRemoveCollection {
    const particleSystems = editor.scene!.particleSystems.filter((ps) => ps.emitter === o);

    return {
        add: () => {
            particleSystems.forEach((ps) => {
                addByCheckingIndex(ps, editor.scene!.particleSystems);
            });
        },
        remove: () => {
            particleSystems.forEach((ps) => {
                removeByCheckingIndex(ps, editor.scene!.particleSystems);
            });
        },
    };
}

function removeSounds(editor: Editor, o: TransformNode): _AddRemoveCollection {
    const sounds = editor.scene!.mainSoundTrack?.soundCollection?.filter((s) => s.spatialSound && s["_connectedTransformNode"] === o);

    return {
        add: () => {
            sounds?.forEach((s) => {
                s.attachToMesh(o);
                addByCheckingIndex(o, editor.scene!.mainSoundTrack?.soundCollection);
            });
        },
        remove: () => {
            sounds?.forEach((s) => {
                s.detachFromMesh();
                removeByCheckingIndex(o, editor.scene!.mainSoundTrack?.soundCollection);
            });
        }
    };
}

function removeByCheckingIndex(object: any, array: Nullable<any[]>): void {
    if (!array) {
        return;
    }

    const index = array.indexOf(object);
    if (index !== -1) {
        array.splice(index, 1);
    }
}

function addByCheckingIndex(object: any, array: Nullable<any[]>): void {
    if (!array) {
        return;
    }

    const index = array.indexOf(object);
    if (index === -1) {
        array.push(object);
    }
}
