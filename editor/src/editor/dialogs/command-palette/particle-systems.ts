import { Editor } from "../../main";

import { ICommandPaletteType } from "./command-palette";

export function getParticleSystemsCommands(editor: Editor): ICommandPaletteType[] {
	return [
		{
			text: "Reset all Particle Systems",
			label: "Reset all particle systems in the scene",
			action: () => editor.layout.preview.scene.particleSystems.forEach((ps) => ps.reset()),
		},
		{
			text: "Stop all Particle Systems",
			label: "Stop all particle systems in the scene",
			action: () => editor.layout.preview.scene.particleSystems.forEach((ps) => ps.stop()),
		},
		{
			text: "Start all Particle Systems",
			label: "Start all particle systems in the scene",
			action: () => editor.layout.preview.scene.particleSystems.forEach((ps) => ps.start()),
		},
	];
}
