import { Component, ReactNode } from "react";
import { Root, createRoot } from "react-dom/client";

import { Progress } from "../../ui/shadcn/ui/progress";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../ui/shadcn/ui/alert-dialog";

import { Editor } from "../../editor/main";

export function showSaveSceneProgressDialog(editor: Editor, name: string): Promise<SaveSceneProgressComponent> {
	return new Promise<SaveSceneProgressComponent>((resolve) => {
		const div = document.createElement("div");
		document.body.appendChild(div);

		const root = createRoot(div);
		root.render(<SaveSceneProgressComponent name={name} editor={editor} ref={(r) => r && setTimeout(() => resolve(r), 150)} root={root} container={div} />);
	});
}

export interface ISaveSceneProgressComponentProps {
	name: string;
	editor: Editor;
	root: Root;
	container: HTMLDivElement;
}

export interface ISaveSceneProgressComponentState {
	name: string;
	progress: number;
}

export class SaveSceneProgressComponent extends Component<ISaveSceneProgressComponentProps, ISaveSceneProgressComponentState> {
	private _step: number = 0;

	public constructor(props: ISaveSceneProgressComponentProps) {
		super(props);

		this.state = {
			progress: 0,
			name: props.name,
		};
	}

	public render(): ReactNode {
		return (
			<AlertDialog open>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{this.state.name}...</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<Progress value={this.state.progress} />
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter></AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	public componentDidMount(): void {
		this.props.editor.layout.preview.setRenderScene(false);
	}

	public step(step: number): void {
		this._step += step;
		this.setState({ progress: this._step });
	}

	public setName(name: string): void {
		this.setState({ name });
	}

	public dispose(): void {
		this.props.editor.layout.preview.setRenderScene(true);

		this.props.root.unmount();
		document.body.removeChild(this.props.container);
	}
}
