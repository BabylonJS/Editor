import { Component, ReactNode } from "react";

export interface IFXEditorPropertiesProps {
	filePath: string | null;
}

export class FXEditorProperties extends Component<IFXEditorPropertiesProps> {
	public render(): ReactNode {
		return (
			<div className="w-full h-full p-4">
				<div className="text-lg font-semibold mb-4">Properties</div>
				<div className="text-sm text-muted-foreground">Properties will be displayed here</div>
			</div>
		);
	}
}

