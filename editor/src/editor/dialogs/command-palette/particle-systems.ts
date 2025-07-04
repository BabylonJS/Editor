import { Editor } from "../../main";

import { ICommandPaletteType } from "./command-palette";

export function getParticleSystemsCommands(editor: Editor): ICommandPaletteType[] {
	return [
		{
			text: "Reset all Particle Systems",
			key: "reset-all-particle-systems",
			label: "Reset all particle systems in the scene",
			action: () => editor.layout.preview.scene.particleSystems.forEach((ps) => ps.reset()),
		},
		{
			text: "Stop all Particle Systems",
			key: "stop-all-particle-systems",
			label: "Stop all particle systems in the scene",
			action: () => editor.layout.preview.scene.particleSystems.forEach((ps) => ps.stop()),
		},
		{
			text: "Start all Particle Systems",
			key: "start-all-particle-systems",
			label: "Start all particle systems in the scene",
			action: () => editor.layout.preview.scene.particleSystems.forEach((ps) => ps.start()),
		},
	];
}
