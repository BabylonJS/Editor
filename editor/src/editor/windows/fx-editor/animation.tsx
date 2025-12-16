import { Component, ReactNode } from "react";
import { IEffectEditor } from ".";

export interface IEffectEditorAnimationProps {
	filePath: string | null;
	editor: IEffectEditor;
}

export class EffectEditorAnimation extends Component<IEffectEditorAnimationProps> {
	public render(): ReactNode {
		return (
			<div className="w-full h-full p-4">
				<div className="text-lg font-semibold mb-4">Animation Panel</div>
				<div className="text-sm text-muted-foreground">Animation timeline will be displayed here</div>
			</div>
		);
	}
}
