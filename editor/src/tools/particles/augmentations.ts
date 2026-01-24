export { NodeParticleSystemSet } from "babylonjs";

declare module "babylonjs" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface NodeParticleSystemSet {
		id?: string;
		uniqueId?: number;
	}
}
