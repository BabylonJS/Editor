import { buildNodeParticleSetWithEmitterProvider, normalizeNodeParticleGraph, parseNodeParticleSource, registerNodeParticleSet, SceneContext } from "@babylonjs/lite";

import { getSceneData } from "../tools/scene";
import { setClassName } from "../tools/guards";
import { NodeParticleSystemMesh } from "../tools/particle";

/**
 * Builds the particle systems of the given serialized node particle system mesh (a mesh with `isNodeParticleSystemMesh`
 * saved by the editor) using the node particles of Babylon Lite, emitted by the given node, and starts them.
 * As in the Babylon.js version of the tools, the sizes of the particles are scaled by 100 (the scenes of the editor
 * are in centimeters).
 * @param scene defines the reference to the scene where to add the particle systems.
 * @param rootUrl defines the root url of the scene.
 * @param instance defines the reference to the node emitting the particles.
 * @param data defines the serialized node particle system mesh.
 */
export async function parseNodeParticleSystemSet(scene: SceneContext, rootUrl: string, instance: NodeParticleSystemMesh, data: any): Promise<void> {
	instance.isNodeParticleSystemMesh = true;
	instance.nodeParticleSystemSet = data.nodeParticleSystemSet ?? null;
	instance.particleSystemSet = null;

	if (!data.nodeParticleSystemSet) {
		return;
	}

	data.nodeParticleSystemSet.blocks?.forEach((block: any) => {
		if (block.url && !block.url.startsWith("data:") && block.url.indexOf("://") === -1) {
			block.url = `${rootUrl}${block.url}`;
		}
	});

	try {
		const graph = await normalizeNodeParticleGraph(parseNodeParticleSource(data.nodeParticleSystemSet));
		const particleSystemSet = await buildNodeParticleSetWithEmitterProvider(scene.surface.engine, scene, graph, () => instance.worldMatrix, {
			textureBaseUrl: rootUrl,
		});

		// Babylon Lite particle systems have no name: the names of the system blocks of the graph are used, in the same order.
		const systemBlocks = graph.systemBlockIds.map((id) => (data.nodeParticleSystemSet.blocks ?? []).find((block: any) => block.id === id));

		particleSystemSet.systems.forEach((particleSystem, index) => {
			setClassName(particleSystem, "ParticleSystem");

			Object.assign(particleSystem, {
				name: systemBlocks[index]?.name ?? data.name,
				id: systemBlocks[index]?.name ?? `${data.id}_${index}`,
				emitter: instance,
			});

			const createSize = particleSystem.createSize;
			if (createSize) {
				particleSystem.createSize = (i) => {
					createSize(i);
					particleSystem.buffer.scaleX[i] *= 100;
					particleSystem.buffer.scaleY[i] *= 100;
				};
			}

			getSceneData(scene).particleSystems.push(particleSystem);
		});

		instance.particleSystemSet = particleSystemSet;

		registerNodeParticleSet(scene, particleSystemSet, {
			autoStart: true,
		});
	} catch (e) {
		console.error(`Failed to build the node particle system set of "${data.name}".`, e);
	}
}
