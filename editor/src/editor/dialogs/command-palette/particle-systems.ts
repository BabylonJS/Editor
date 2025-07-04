import { Editor } from "../../main";

import { ICommandPaletteType } from "./command-palette";

export enum ParticalSystemKey {
	ResetAllParticleSystems = "reset-all-particle-systems",
	StopAllParticleSystems = "stop-all-particle-systems",
	StartAllParticleSystems = "start-all-particle-systems",
}

export function getParticleSystemsCommands(editor: Editor): ICommandPaletteType[] {
	return [
		{
			text: "Reset all Particle Systems",
			key: ParticalSystemKey.ResetAllParticleSystems,
			label: "Reset all particle systems in the scene",
			action: () => editor.layout.preview.scene.particleSystems.forEach((ps) => ps.reset()),
		},
		{
			text: "Stop all Particle Systems",
			key: ParticalSystemKey.StopAllParticleSystems,
			label: "Stop all particle systems in the scene",
			action: () => editor.layout.preview.scene.particleSystems.forEach((ps) => ps.stop()),
		},
		{
			text: "Start all Particle Systems",
			key: ParticalSystemKey.StartAllParticleSystems,
			label: "Start all particle systems in the scene",
			action: () => editor.layout.preview.scene.particleSystems.forEach((ps) => ps.start()),
		},
	];
}
