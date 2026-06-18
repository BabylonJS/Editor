import { shell } from "electron";

import { IoOpenOutline } from "react-icons/io5";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Switch } from "../../../../ui/shadcn/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../ui/shadcn/ui/select";

import { EditorProjectCompressedTextureQuality } from "../../../../project/typings";

import { Editor } from "../../../main";

export interface IEditorProjectTextureKTXSoftwareProps {
	editor: Editor;
}

export function EditorProjectTextureKTXSoftware(props: IEditorProjectTextureKTXSoftwareProps) {
	return (
		<>
			<div className="flex justify-between items-start gap-2">
				<div className="text-muted-foreground">
					Compress textures using Khronos KTX-Software CLI. Compressed textures are used to reduce the size in video memory without sacrificing quality. This requires the
					KTX-Software CLI to be installed on your computer. Compressing textures is done automatically when exporting the project but can require time to compute
					depending on the number of textures and their size.
				</div>

				<Button variant="ghost" className="flex items-center gap-[5px]" onClick={() => shell.openExternal("https://github.com/KhronosGroup/KTX-Software/releases")}>
					<IoOpenOutline className="w-4 h-4" /> Download
				</Button>
			</div>

			<div className="flex justify-between items-center gap-2">
				Enabled
				<Switch checked={props.editor.state.compressedTexturesEnabled} onCheckedChange={(v) => props.editor.setState({ compressedTexturesEnabled: v })} />
			</div>

			{props.editor.state.compressedTexturesEnabled && (
				<>
					<div className="flex justify-between items-center gap-2">
						Enabled in preview
						<Switch
							checked={props.editor.state.compressedTexturesEnabledInPreview}
							onCheckedChange={(v) => props.editor.setState({ compressedTexturesEnabledInPreview: v })}
						/>
					</div>

					<div className="flex justify-between items-center gap-2">
						<div>Quality</div>
						<Select
							value={props.editor.state.compressedTextureQuality}
							onValueChange={(v) => props.editor.setState({ compressedTextureQuality: v as EditorProjectCompressedTextureQuality })}
						>
							<SelectTrigger className="w-44">
								<SelectValue placeholder="Quality" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="very-fast">Very fast</SelectItem>
								<SelectItem value="fast">Fast</SelectItem>
								<SelectItem value="normal">Normal</SelectItem>
								<SelectItem value="high">High</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</>
			)}
		</>
	);
}
