import { Component, ReactNode } from "react";

export interface IFXEditorGraphProps {
	filePath: string | null;
}

export class FXEditorGraph extends Component<IFXEditorGraphProps> {
	public render(): ReactNode {
		return (
			<div className="w-full h-full p-4">
				<div className="text-lg font-semibold mb-4">Particles Graph</div>
				<div className="text-sm text-muted-foreground">Particle systems will be displayed here</div>
			</div>
		);
	}
}

