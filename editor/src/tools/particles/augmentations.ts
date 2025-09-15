export { NodeParticleSystemSet } from "babylonjs";

declare module "babylonjs" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface NodeParticleSystemSet {
		id?: string;
		uniqueId?: number;
	}

	export interface IParticleSystem {
		sourceParticleSystemSetId?: string;
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface ParticleSystem {
		sourceParticleSystemSetId?: string;
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface GPUParticleSystem {
		sourceParticleSystemSetId?: string;
	}
}
