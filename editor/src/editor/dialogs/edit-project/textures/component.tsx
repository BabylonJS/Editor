import { Component, ReactNode } from "react";

import { Label } from "../../../../ui/shadcn/ui/label";
import { Separator } from "../../../../ui/shadcn/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../ui/shadcn/ui/select";

import { EditorProjectCompressedTextureSoftware } from "../../../../project/typings";

import { Editor } from "../../../main";

import { EditorProjectTexturePVRTexTool } from "./ktx";
import { EditorProjectTextureKTXSoftware } from "./ktx2";

export interface IEditorEditProjectTextureComponentProps {
	editor: Editor;
}

export class EditorEditProjectTextureComponent extends Component<IEditorEditProjectTextureComponentProps> {
	public render(): ReactNode {
		return (
			<div className="flex flex-col gap-3 w-full mt-[12px]">
				<Separator />

				<Label className="text-xl font-[400]">Compressed textures</Label>

				<Select
					value={this.props.editor.state.compressedTextureSoftware}
					onValueChange={(v) => this.props.editor.setState({ compressedTextureSoftware: v as EditorProjectCompressedTextureSoftware })}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Quality" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="PVRTexTool">PVRTexTool</SelectItem>
						<SelectItem value="Khronos KTX-Software">Khronos KTX-Software</SelectItem>
					</SelectContent>
				</Select>

				{this.props.editor.state.compressedTextureSoftware === "PVRTexTool" && (
					<div className="flex flex-col gap-3 p-5 rounded-lg dark:bg-black/35">
						<EditorProjectTexturePVRTexTool editor={this.props.editor} onUpdate={() => this.forceUpdate()} />
					</div>
				)}

				{this.props.editor.state.compressedTextureSoftware === "Khronos KTX-Software" && (
					<div className="flex flex-col gap-3 p-5 rounded-lg dark:bg-black/35">
						<EditorProjectTextureKTXSoftware editor={this.props.editor} />
					</div>
				)}
			</div>
		);
	}
}
