import { ParticleSystem, GPUParticleSystem, Tools, AbstractMesh } from "babylonjs";

import { UniqueNumber } from "../../tools/tools";

import { Editor } from "../../editor/main";

export function addParticleSystem(editor: Editor, emitter: AbstractMesh) {
	const particleSystem = new ParticleSystem("New Particle System", 1_000, editor.layout.preview.scene);
	particleSystem.id = Tools.RandomId();
	particleSystem.uniqueId = UniqueNumber.Get();
	particleSystem.emitter = emitter;
	particleSystem.preventAutoStart = true;

	particleSystem.emitRate = 100;
	particleSystem.minSize = 1;
	particleSystem.maxSize = 100;

	particleSystem.direction1.set(-100, -100, -100);
	particleSystem.direction2.set(100, 100, 100);

	particleSystem.minEmitBox.set(-100, -100, -100);
	particleSystem.maxEmitBox.set(100, 100, 100);

	editor.layout.graph.refresh();
	editor.layout.inspector.setEditedObject(particleSystem);
	editor.layout.preview.gizmo.setAttachedNode(particleSystem.emitter);
}

export function addGPUParticleSystem(editor: Editor, emitter: AbstractMesh) {
	const particleSystem = new GPUParticleSystem("New GPU Particle System", {
		capacity: 100_000
	}, editor.layout.preview.scene);
	particleSystem.id = Tools.RandomId();
	particleSystem.uniqueId = UniqueNumber.Get();
	particleSystem.emitter = emitter;
	particleSystem.preventAutoStart = true;

	particleSystem.emitRate = 1000;
	particleSystem.minSize = 1;
	particleSystem.maxSize = 100;

	particleSystem.direction1.set(-100, -100, -100);
	particleSystem.direction2.set(100, 100, 100);

	particleSystem.minEmitBox.set(-100, -100, -100);
	particleSystem.maxEmitBox.set(100, 100, 100);

	editor.layout.graph.refresh();
	editor.layout.inspector.setEditedObject(particleSystem);
	editor.layout.preview.gizmo.setAttachedNode(particleSystem.emitter);
}
