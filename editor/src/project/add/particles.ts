import { ParticleSystem, Tools, AbstractMesh } from "babylonjs";

import { UniqueNumber } from "../../tools/tools";

import { Editor } from "../../editor/main";

export function addParticleSystem(editor: Editor, emitter: AbstractMesh) {
    const particleSystem = new ParticleSystem("New Particle System", 1000, editor.layout.preview.scene);
    particleSystem.id = Tools.RandomId();
    particleSystem.uniqueId = UniqueNumber.Get();
    particleSystem.emitter = emitter;
    particleSystem.preventAutoStart = true;

    editor.layout.graph.refresh();
    editor.layout.inspector.setEditedObject(particleSystem);
    editor.layout.preview.gizmo.setAttachedNode(particleSystem.emitter);
}
