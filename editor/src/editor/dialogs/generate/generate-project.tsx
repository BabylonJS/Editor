import { Component, ReactNode } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../../../ui/shadcn/ui/alert-dialog";

import { Editor } from "../../main";

import { EditorGenerateOptionsComponent } from "./options";
import { EditorGenerateComponent } from "./generate";

export interface IEditorGenerateProjectComponentProps {
	editor: Editor;
	open: boolean;
	onClose: () => void;
}

export interface IEditorGenerateProjectComponentState {
	step: "options" | "generation" | "complete";
}

export interface IEditorGenerateOptions {
	optimize: boolean;
	uploadToS3: boolean;
}

export class EditorGenerateProjectComponent extends Component<IEditorGenerateProjectComponentProps, IEditorGenerateProjectComponentState> {
	private _options: IEditorGenerateOptions = {
		optimize: true,
		uploadToS3: false,
	};

	public constructor(props: IEditorGenerateProjectComponentProps) {
		super(props);

		this.state = {
			step: "options",
		};
	}

	public render(): ReactNode {
		return (
			<AlertDialog open={this.props.open}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="text-3xl font-[400]">Generate Project</AlertDialogTitle>
						<AlertDialogDescription className="flex flex-col w-full py-5">
							{this.state.step === "options" && <EditorGenerateOptionsComponent options={this._options} />}
							{this.state.step === "generation" && <EditorGenerateComponent options={this._options} />}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="w-20" onClick={() => this._close()}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction className="w-20" onClick={() => this._next()}>
							Next
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	private _close(): void {
		this.setState({
			step: "options",
		});

		this.props.onClose();
	}

	private _next(): void {
		if (this.state.step === "options") {
			return this.setState({
				step: "generation",
			});
		}
	}
}
