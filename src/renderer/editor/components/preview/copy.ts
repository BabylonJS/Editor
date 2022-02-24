import { Nullable } from "../../../../shared/types";

import { Node, IParticleSystem, Light, Camera, Mesh, InstancedMesh, ParticleSystem, AbstractMesh } from "babylonjs";

import { Tools } from "../../tools/tools";

import { Alert } from "../../gui/alert";

import { Editor } from "../../editor";

export class PreviewCopyHelper {
    /**
     * Copies the given node and adds it to the scene. According to the nature of the node,
     * copy will be improved to, for example, create an instance instead of a clone for meshes etc.
     * @param editor defines the reference to the editor.
     * @param node defines the reference to the node to be copied.
     */
    public static CopyNode(editor: Editor, node: Node | IParticleSystem): Nullable<Node | IParticleSystem> {
        const clone = this._CreateClone(node);
        if (clone) {
            this._Configure(editor, node, clone);
        }

        return clone;
    }

    /**
     * Creates a clone (improved) of the given node.
     */
    private static _CreateClone(node: Node | IParticleSystem): Nullable<Node | IParticleSystem> {
        if (node instanceof Light) {
            return node.clone(node.name);
        }

        if (node instanceof Camera) {
            return node.clone(node.name);
        }

        if (node instanceof Mesh) {
            if (node.hasThinInstances) {
                Alert.Show("Can't create mesh instance", "The mesh to paste contains Thin Instances. Please use Thin Instances painting tool instead to create copies.");
                return null;
            }

            const instance = node.createInstance(`${node.name} (Mesh Instance)`);

            instance.position.copyFrom(node.position);
            instance.rotation.copyFrom(node.rotation);
            if (node.rotationQuaternion) {
                instance.rotationQuaternion = node.rotationQuaternion.clone();
            }
            instance.scaling.copyFrom(node.scaling);
            instance.checkCollisions = node.checkCollisions;

            return instance;
        }

        if (node instanceof InstancedMesh) {
            const instance = node.sourceMesh.createInstance(`${node.sourceMesh.name} (Mesh Instance)`);
            instance.position.copyFrom(node.position);
            instance.rotation.copyFrom(node.rotation);
            if (node.rotationQuaternion) {
                instance.rotationQuaternion = node.rotationQuaternion.clone();
            }
            instance.scaling.copyFrom(node.scaling);
            instance.checkCollisions = node.checkCollisions;

            return instance;
        }

        if (node instanceof ParticleSystem) {
            return node.clone(node.name, node.emitter);
        }

        return null;
    }

    /**
     * Configures the given clone (shadows, collider, etc.).
     */
    private static _Configure(editor: Editor, node: Node | IParticleSystem, clone: Node | IParticleSystem): Nullable<Node | IParticleSystem> {
        if (clone instanceof Node && node instanceof Node) {
            clone.parent = node.parent;
        }

        if (node instanceof AbstractMesh) {
            this._ConfigureCollider(node, clone);
            this._ConfigureShadows(editor, node, clone);
        }

        clone.id = Tools.RandomId();

        if (clone instanceof Node) {
            editor.addedNodeObservable.notifyObservers(clone);
        } else {
            editor.addedParticleSystemObservable.notifyObservers(clone);
        }

        editor.graph.refresh(() => {
            if (clone instanceof Node) {
                editor.selectedNodeObservable.notifyObservers(clone);
            } else {
                editor.selectedParticleSystemObservable.notifyObservers(clone!);
            }
        });

        return clone;
    }

    /**
     * In case of a mesh or instanced mesh, clones and configures its collider.
     */
    private static _ConfigureCollider(node: AbstractMesh, clone: Node | IParticleSystem): void {
        const collider = node.getChildMeshes(true).find((m) => m.metadata?.collider);
        if (!collider) {
            return;
        }

        let colliderInstance: Nullable<AbstractMesh> = null;
        if (collider instanceof Mesh) {
            colliderInstance = collider.createInstance(`${collider.name} (Mesh Instance)`);
        } else if (collider instanceof InstancedMesh) {
            colliderInstance = collider.sourceMesh.createInstance(collider.name);
        }

        if (colliderInstance && clone instanceof Node) {
            colliderInstance.parent = clone;
            colliderInstance.checkCollisions = collider.checkCollisions;
            colliderInstance.metadata = {
                collider: Tools.CloneObject(collider.metadata.collider),
            };

            colliderInstance.id = Tools.RandomId();
        }
    }

    /**
     * Checks wether or not the given node (source node) is registered in shadow generators in order to push
     * its clone as well.
     */
    private static _ConfigureShadows(editor: Editor, node: AbstractMesh, clone: Node | IParticleSystem): void {
        const shadowGenerators = editor.scene!.lights.filter((s) => s.getShadowGenerator()).map((s) => s.getShadowGenerator());
        shadowGenerators.forEach((sg) => {
            const isCasting = sg?.getShadowMap()?.renderList?.indexOf(node) !== -1;
            if (isCasting && clone instanceof AbstractMesh) {
                sg?.getShadowMap()?.renderList?.push(clone);
            }
        });
    }
}
