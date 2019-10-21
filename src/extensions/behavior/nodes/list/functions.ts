import { AbstractMesh } from 'babylonjs';
import { registerFunctionNode } from '../graph-function-node';

/**
 * Registers all the available type nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllFunctionNodes (object?: any): void {
    /**
     * Move with collisions
     */
    registerFunctionNode(AbstractMesh, object, 'functions/movewithcollisions', 'Move With Collisions', 'Move the mesh using collision engine.', 'moveWithCollisions', [
        { name: 'displacement', type: 'vec3', optional: false }
    ]);

    /**
     * Look at
     */
    registerFunctionNode(AbstractMesh, object, 'functions/lookat', 'Look At', 'Orients a mesh towards a target point. Mesh must be drawn facing user.', 'lookAt', [
        { name: 'target point', type: 'vec3', optional: false },
        { name: 'yawCor', type: 'number', optional: true },
        { name: 'pitchCor', type: 'number', optional: true },
        { name: 'rollCor', type: 'number', optional: true },
    ]);

    /**
     * Rotate
     */
    registerFunctionNode(AbstractMesh, object, 'functions/rotate', 'Rotate', 'Rotates the mesh around the axis vector for the passed angle (amount) expressed in radians, in the local space.', 'rotate', [
        { name: 'axis', type: 'vec3', optional: false },
        { name: 'amount', type: 'number', optional: false }
    ]);

    /**
     * Translate
     */
    registerFunctionNode(AbstractMesh, object, 'functions/translate', 'Translate', 'Translates the mesh along the axis vector for the passed distance in the local space.', 'translate', [
        { name: 'axis', type: 'vec3', optional: false },
        { name: 'distance', type: 'number', optional: false }
    ]);

    /**
     * Set direction
     */
    registerFunctionNode(AbstractMesh, object, 'functions/setdirection', 'Set Direction', 'Sets this transform node rotation to the given local axis.', 'setDirection', [
        { name: 'localAxis', type: 'vec3', optional: false },
        { name: 'yawCor', type: 'number', optional: true },
        { name: 'pitchCor', type: 'number', optional: true },
        { name: 'rollCor', type: 'number', optional: true }
    ]);
}
