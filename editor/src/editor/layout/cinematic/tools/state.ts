import { Node, HavokPlugin, Vector3, Scene } from "babylonjs";

import { isAbstractMesh } from "../../../../tools/guards/nodes";

const sceneState: Map<Node, any> = new Map();

export function saveSceneState(scene: Scene) {
    const nodes = [...scene.transformNodes, ...scene.meshes, ...scene.lights, ...scene.cameras];

    nodes.forEach((node) => {
        sceneState.set(node, {
            isEnabled: node.isEnabled(false),

            position: isAbstractMesh(node) ? node.position.clone() : null,
            rotation: isAbstractMesh(node) ? node.rotation.clone() : null,
            scaling: isAbstractMesh(node) ? node.scaling.clone() : null,
            rotationQuaternion: isAbstractMesh(node) ? node.rotationQuaternion?.clone() : null,
        });

        if (isAbstractMesh(node) && node.physicsAggregate?.body) {
            node.physicsAggregate.body.disableSync = false;

            const position = node.getAbsolutePosition();
            const orientation = node.rotationQuaternion ?? node.rotation.toQuaternion();

            const physicsEngine = scene.getPhysicsEngine()?.getPhysicsPlugin() as HavokPlugin | null;

            physicsEngine?._hknp.HP_Body_SetQTransform(
                node.physicsAggregate.body._pluginData.hpBodyId,
                [
                    [position.x, position.y, position.z],
                    [orientation.x, orientation.y, orientation.z, orientation.w],
                ],
            );
        }
    });
}

export function restoreSceneState() {
    sceneState.forEach((config, node) => {
        node.setEnabled(config.isEnabled);

        if (isAbstractMesh(node)) {
            if (config.position) {
                node.position.copyFrom(config.position);
            }

            if (config.rotation) {
                node.rotation.copyFrom(config.rotation);
            }

            if (config.rotationQuaternion) {
                node.rotationQuaternion?.copyFrom(config.rotationQuaternion);
            }

            if (config.scaling) {
                node.scaling.copyFrom(config.scaling);
            }

            if (node.physicsAggregate?.body) {
                node.physicsAggregate.body.disableSync = true;
                node.physicsAggregate.body.setLinearVelocity(Vector3.Zero());
                node.physicsAggregate.body.setAngularVelocity(Vector3.Zero());
            }
        }
    });

    sceneState.clear();
}
