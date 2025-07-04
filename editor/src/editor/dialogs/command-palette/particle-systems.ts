import { Editor } from "../../main";

import { ICommandPaletteType } from "./command-palette";

export enum ParticalSystemKey {
	RESET_ALL_PARTICLE_SYSTEMS = "reset-all-particle-systems",
	STOP_ALL_PARTICLE_SYSTEMS = "stop-all-particle-systems",
	START_ALL_PARTICLE_SYSTEMS = "start-all-particle-systems",
}

export function getParticleSystemsCommands(editor: Editor): ICommandPaletteType[] {
	return [
		{
			text: "Reset all Particle Systems",
			key: ParticalSystemKey.RESET_ALL_PARTICLE_SYSTEMS,
			label: "Reset all particle systems in the scene",
			action: () => editor.layout.preview.scene.particleSystems.forEach((ps) => ps.reset()),
		},
		{
			text: "Stop all Particle Systems",
			key: ParticalSystemKey.STOP_ALL_PARTICLE_SYSTEMS,
			label: "Stop all particle systems in the scene",
			action: () => editor.layout.preview.scene.particleSystems.forEach((ps) => ps.stop()),
		},
		{
			text: "Start all Particle Systems",
			key: ParticalSystemKey.START_ALL_PARTICLE_SYSTEMS,
			label: "Start all particle systems in the scene",
			action: () => editor.layout.preview.scene.particleSystems.forEach((ps) => ps.start()),
		},
	];
}
