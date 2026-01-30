import { Component, ReactNode } from "react";

import { CancellationToken } from "babylonjs-editor-cli";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../ui/shadcn/ui/alert-dialog";

import { Editor } from "../../main";

import { EditorGenerateComponent } from "./generate";
import { EditorGenerateOptionsComponent } from "./options";
import { EditorGenerateCompleteComponent } from "./complete";

export interface IEditorGenerateProjectComponentProps {
	editor: Editor;
	open: boolean;
	onClose: () => void;
}

export interface IEditorGenerateProjectComponentState {
	step: "options" | "generation" | "complete";
	cancellationToken: CancellationToken | null;
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
			cancellationToken: null,
		};
	}

	public render(): ReactNode {
		return (
			<AlertDialog open={this.props.open}>
				<AlertDialogContent className="transition-all duration-300 ease-in-out">
					<AlertDialogHeader>{this.state.step !== "complete" && <AlertDialogTitle className="text-3xl font-[400]">Generate Project</AlertDialogTitle>}</AlertDialogHeader>

					<div className="flex flex-col w-full py-5">
						{this.state.step === "options" && <EditorGenerateOptionsComponent options={this._options} />}
						{this.state.step === "generation" && (
							<EditorGenerateComponent
								editor={this.props.editor}
								options={this._options}
								cancellationToken={this.state.cancellationToken}
								onComplete={() => this._next()}
							/>
						)}
						{this.state.step === "complete" && <EditorGenerateCompleteComponent cancellationToken={this.state.cancellationToken} />}
					</div>

					<AlertDialogFooter className="flex items-center gap-2">
						{this.state.step === "options" && (
							<AlertDialogCancel className="w-32" onClick={() => this._close()}>
								Cancel
							</AlertDialogCancel>
						)}

						{this.state.step === "generation" && (
							<AlertDialogCancel disabled={this.state.cancellationToken?.isCanceled} className="w-32 hover:bg-red-500" onClick={() => this._cancel()}>
								Stop
							</AlertDialogCancel>
						)}

						{this.state.step !== "generation" && (
							<AlertDialogAction className="w-32" onClick={() => this._next()}>
								{this.state.step === "options" ? "Next" : "Close"}
							</AlertDialogAction>
						)}
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	private _close(): void {
		this.props.onClose();

		setTimeout(() => {
			this.setState({
				step: "options",
			});
		}, 300);
	}

	private _next(): void {
		if (this.state.step === "options") {
			return this.setState({
				step: "generation",
				cancellationToken: new CancellationToken(),
			});
		}

		if (this.state.step === "generation") {
			return this.setState({
				step: "complete",
			});
		}

		if (this.state.step === "complete") {
			return this._close();
		}
	}

	private _cancel(): void {
		this.state.cancellationToken?.cancel();
		this.forceUpdate();
	}
}
