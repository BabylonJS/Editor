import { shell } from "electron";

import { IoOpenOutline } from "react-icons/io5";

import { Label } from "../../../../ui/shadcn/ui/label";
import { Button } from "../../../../ui/shadcn/ui/button";
import { Switch } from "../../../../ui/shadcn/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../ui/shadcn/ui/select";

import { openSingleFileDialog } from "../../../../tools/dialog";

import { EditorProjectCompressedTextureQuality } from "../../../../project/typings";
import { getCompressedTexturesCliPath, setCompressedTexturesCliPath } from "../../../../project/export/ktx";

import { Editor } from "../../../main";

export interface IEditorProjectTexturePVRTexToolProps {
	editor: Editor;
	onUpdate: () => void;
}

export function EditorProjectTexturePVRTexTool(props: IEditorProjectTexturePVRTexToolProps) {
	function handleBrowsePVRTexToolCliPath(): void {
		const file = openSingleFileDialog({
			title: "Select PVRTexTool CLI executable",
		});

		if (file) {
			setCompressedTexturesCliPath(file);
		}

		props.onUpdate();
	}

	return (
		<>
			<div className="flex justify-between items-start gap-2">
				<div className="text-muted-foreground">
					Compress textures using PVRTexTool CLI. Compressed textures are used to reduce the size in video memory without sacrificing quality. This requires the
					PVRTexTool CLI to be installed and the path to the executable to be set. Compressing textures is done automatically when exporting the project but can require
					time to compute depending on the number of textures and their size.
				</div>

				<Button variant="ghost" className="flex items-center gap-[5px]" onClick={() => shell.openExternal("https://www.imaginationtech.com/")}>
					<IoOpenOutline className="w-4 h-4" /> Download
				</Button>
			</div>

			<div className="flex flex-col gap-4">
				<div className="flex justify-between items-center">
					<Label>PVRTexTool CLI path</Label>
				</div>

				<Button
					variant="outline"
					className="justify-start w-full text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis"
					onClick={() => handleBrowsePVRTexToolCliPath()}
				>
					{getCompressedTexturesCliPath() ?? "None"}
				</Button>

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
							ETC2 Enabled
							<Switch checked={props.editor.state.compressedEtc2Enabled} onCheckedChange={(v) => props.editor.setState({ compressedEtc2Enabled: v })} />
						</div>

						<div className="flex justify-between items-center gap-2">
							PVRTC Enabled
							<Switch checked={props.editor.state.compressedPvrtcEnabled} onCheckedChange={(v) => props.editor.setState({ compressedPvrtcEnabled: v })} />
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
			</div>
		</>
	);
}
