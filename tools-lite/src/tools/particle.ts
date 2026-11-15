import { NodeParticleSet, SceneNode } from "@babylonjs/lite";

/**
 * This interface is used to define extra properties on the nodes emitting node particle systems created in the editor.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface NodeParticleSystemMesh extends SceneNode {
	isNodeParticleSystemMesh?: boolean;
	/**
	 * Defines the reference to the particle systems built from the node particle system set and emitted by the node.
	 */
	particleSystemSet?: NodeParticleSet | null;
	/**
	 * Defines the serialized node particle system set (Node Particle Editor graph) the particle systems are built from.
	 */
	nodeParticleSystemSet?: any | null;
}
