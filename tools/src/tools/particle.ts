import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { ParticleSystemSet } from "@babylonjs/core/Particles/particleSystemSet";
import { NodeParticleSystemSet } from "@babylonjs/core/Particles/Node/nodeParticleSystemSet";

export { NodeParticleSystemSet } from "@babylonjs/core/Particles/Node/nodeParticleSystemSet";

declare module "@babylonjs/core/Particles/Node/nodeParticleSystemSet" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface NodeParticleSystemSet {
		id?: string;
		uniqueId?: number;
	}
}

/**
 * This interface is used to define extra properties on TransformNode. For example for SpriteManager support.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface NodeParticleSystemMesh extends Mesh {
	isNodeParticleSystemMesh?: boolean;
	particleSystemSet?: ParticleSystemSet | null;
	nodeParticleSystemSet?: NodeParticleSystemSet | null;
}
