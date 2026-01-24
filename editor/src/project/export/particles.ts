import { Scene } from "babylonjs";

export function configureParticleSystems(data: any, scene: Scene) {
	if (!data.particleSystems) {
		return;
	}

	data.particleSystems = data.particleSystems.filter((ps: any) => {
		const existing = scene.getParticleSystemById(ps.id);
		if (existing?.isNodeGenerated) {
			return false;
		}

		return true;
	});
}
