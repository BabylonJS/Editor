import { Label } from "../../../../ui/shadcn/ui/label";
import { Switch } from "../../../../ui/shadcn/ui/switch";
import { Separator } from "../../../../ui/shadcn/ui/separator";

import { Editor } from "../../../main";

export interface IEditorEditProjectImportComponentProps {
	editor: Editor;
}

export function EditorEditProjectImportComponent(props: IEditorEditProjectImportComponentProps) {
	return (
		<div className="flex flex-col gap-3 w-full mt-[12px]">
			<Separator />

			<Label className="text-xl font-[400]">Import</Label>

			<div className="flex flex-col gap-3 p-5 rounded-lg dark:bg-black/35">
				<div className="text-muted-foreground">
					glTF has no lightmap slot, so bakers export the baked lighting as an emissive texture on the second UV set. When enabled, importing a scene file moves it to the
					lightmap slot and makes the material unlit, so the lighting multiplies the surface instead of being added on top of it. Emissive textures on the first UV set
					are genuine emission and are left alone.
				</div>

				<div className="flex justify-between items-center gap-2">
					Convert baked lightmaps
					<Switch checked={props.editor.state.convertImportedLightmaps} onCheckedChange={(v) => props.editor.setState({ convertImportedLightmaps: v })} />
				</div>
			</div>
		</div>
	);
}
