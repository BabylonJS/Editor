import { Component, ReactNode } from "react";
import { IFXEditor } from ".";

export interface IFXEditorAnimationProps {
	filePath: string | null;
	editor: IFXEditor;
}

export class FXEditorAnimation extends Component<IFXEditorAnimationProps> {
	public render(): ReactNode {
		return (
			<div className="w-full h-full p-4">
				<div className="text-lg font-semibold mb-4">Animation Panel</div>
				<div className="text-sm text-muted-foreground">Animation timeline will be displayed here</div>
			</div>
		);
	}
}
