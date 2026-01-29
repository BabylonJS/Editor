import { toast } from "sonner";
import { Component, ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/shadcn/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../ui/shadcn/ui/alert-dialog";

import { Editor } from "../../main";

import { checkProjectCachedCompressedTextures } from "../../../tools/assets/ktx";

import { saveProjectConfiguration } from "../../../project/save/save";
import { projectConfiguration } from "../../../project/configuration";

import { EditorEditProjectPluginComponent } from "./plugins/component";
import { EditorEditProjectTextureComponent } from "./textures/component";

export interface IEditorEditProjectComponentProps {
	/**
	 * Defines the editor reference.
	 */
	editor: Editor;
	/**
	 * Defines if the dialog is open.
	 */
	open: boolean;
	onClose: () => void;
}

export class EditorEditProjectComponent extends Component<IEditorEditProjectComponentProps> {
	public render(): ReactNode {
		return (
			<AlertDialog open={this.props.open}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="text-3xl font-[400]">Edit Project</AlertDialogTitle>
					</AlertDialogHeader>

					<div className="py-5">
						<Tabs defaultValue="editor" className="w-full">
							<TabsList className="w-full">
								<TabsTrigger className="w-full" value="editor">
									Editor
								</TabsTrigger>
								<TabsTrigger className="w-full" value="plugins">
									Plugins
								</TabsTrigger>
							</TabsList>

							<TabsContent value="editor">
								<EditorEditProjectTextureComponent editor={this.props.editor} />
							</TabsContent>
							<TabsContent value="plugins">
								<EditorEditProjectPluginComponent editor={this.props.editor} />
							</TabsContent>
						</Tabs>
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel className="w-20" onClick={() => this.props.onClose()}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction className="w-20" onClick={() => this._handleSave()}>
							Save
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	private _handleSave(): void {
		projectConfiguration.compressedTexturesEnabled = this.props.editor.state.compressedTexturesEnabled;

		saveProjectConfiguration(this.props.editor);
		checkProjectCachedCompressedTextures(this.props.editor);

		toast.success("Project preferences saved");

		this.props.onClose();
	}
}
